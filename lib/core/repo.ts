/**
 * Storage abstraction. Business logic in /core never imports the MongoDB driver directly;
 * it talks to this interface. Production uses MongoRepo (lib/db/mongo-repo.ts),
 * tests use MemoryRepo below. Both implement the same MongoDB filter/update subset.
 */

export type Filter = Record<string, unknown>;
export type Update = {
  $set?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
  $inc?: Record<string, number>;
  $push?: Record<string, unknown>;
  $pull?: Record<string, unknown>;
  $addToSet?: Record<string, unknown>;
};
export interface FindOptions { sort?: Record<string, 1 | -1>; limit?: number; skip?: number; projection?: Record<string, 0 | 1> }

export class DuplicateKeyError extends Error {
  constructor(public collection: string, public key: string) {
    super(`Duplicate key in ${collection}: ${key}`);
  }
}

export interface Collection<T extends { _id: string }> {
  findOne(filter: Filter, opts?: FindOptions): Promise<T | null>;
  find(filter: Filter, opts?: FindOptions): Promise<T[]>;
  count(filter: Filter): Promise<number>;
  insertOne(doc: T): Promise<T>;
  /** Inserts all or none. Throws DuplicateKeyError (and rolls back what it inserted) on a unique conflict. */
  insertManyAtomic(docs: T[]): Promise<void>;
  /** Returns the updated document (after update) or null when nothing matched. */
  updateOne(filter: Filter, update: Update): Promise<T | null>;
  updateMany(filter: Filter, update: Update): Promise<number>;
  deleteOne(filter: Filter): Promise<boolean>;
  deleteMany(filter: Filter): Promise<number>;
}

export interface Repo {
  col<T extends { _id: string }>(name: string): Collection<T>;
}

/** Unique indexes the business logic depends on. MongoRepo creates them; MemoryRepo enforces them. */
export const UNIQUE_INDEXES: Record<string, string[][]> = {
  users: [["email"], ["phone"]],
  providers: [["slug"]],
  categories: [["slug"]],
  bookings: [["ref"]],
  slot_locks: [["resource", "unit"]],
  payments: [["gatewayOrderId"]],
  webhook_events: [["eventId"]],
  coupons: [["code"]],
  coupon_redemptions: [["couponId", "bookingId"]],
  reviews: [["bookingId"]],
  idempotency_keys: [["key"]],
  rate_limits: [["key", "window"]],
};

// ---------------------------------------------------------------------------
// Filter / update evaluation (MongoDB subset) — shared by MemoryRepo
// ---------------------------------------------------------------------------

function getPath(doc: unknown, path: string): unknown {
  let cur: unknown = doc;
  for (const part of path.split(".")) {
    if (cur == null) return undefined;
    if (Array.isArray(cur) && !/^\d+$/.test(part)) {
      const vals = cur.map((c) => (c == null ? undefined : (c as Record<string, unknown>)[part]));
      return vals.flat();
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function cmp(a: unknown, b: unknown): number {
  if (a instanceof Date) a = a.getTime();
  if (b instanceof Date) b = b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function eq(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) return cmp(a, b) === 0;
  return a === b;
}

function matchValue(val: unknown, cond: unknown): boolean {
  const isOps = cond !== null && typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond) && !(cond instanceof RegExp) && Object.keys(cond).some((k) => k.startsWith("$"));
  const vals = Array.isArray(val) ? val : [val];
  if (!isOps) {
    if (cond instanceof RegExp) return vals.some((v) => typeof v === "string" && cond.test(v));
    if (Array.isArray(val) && !Array.isArray(cond)) return val.some((v) => eq(v, cond));
    if (cond === null) return val === null || val === undefined;
    return eq(val, cond);
  }
  return Object.entries(cond as Record<string, unknown>).every(([op, arg]) => {
    switch (op) {
      case "$eq": return matchValue(val, arg);
      case "$ne": return !matchValue(val, arg);
      case "$in": return (arg as unknown[]).some((a) => vals.some((v) => eq(v, a)));
      case "$nin": return !(arg as unknown[]).some((a) => vals.some((v) => eq(v, a)));
      case "$gt": return vals.some((v) => v !== undefined && cmp(v, arg) > 0);
      case "$gte": return vals.some((v) => v !== undefined && cmp(v, arg) >= 0);
      case "$lt": return vals.some((v) => v !== undefined && cmp(v, arg) < 0);
      case "$lte": return vals.some((v) => v !== undefined && cmp(v, arg) <= 0);
      case "$exists": return (val !== undefined) === Boolean(arg);
      case "$regex": {
        const opts = (cond as Record<string, unknown>)["$options"] as string | undefined;
        const re = arg instanceof RegExp ? arg : new RegExp(String(arg), opts);
        return vals.some((v) => typeof v === "string" && re.test(v));
      }
      case "$options": return true;
      case "$size": return Array.isArray(val) && val.length === arg;
      default: throw new Error(`Unsupported operator ${op}`);
    }
  });
}

export function matches(doc: unknown, filter: Filter): boolean {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === "$or") return (cond as Filter[]).some((f) => matches(doc, f));
    if (k === "$and") return (cond as Filter[]).every((f) => matches(doc, f));
    return matchValue(getPath(doc, k), cond);
  });
}

function setPath(doc: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = doc as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) {
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function applyUpdate<T>(doc: T, update: Update): T {
  const d = structuredClone(doc) as Record<string, unknown>;
  for (const [k, v] of Object.entries(update.$set ?? {})) setPath(d, k, v);
  for (const k of Object.keys(update.$unset ?? {})) {
    const parts = k.split(".");
    const parent = parts.length > 1 ? getPath(d, parts.slice(0, -1).join(".")) : d;
    if (parent && typeof parent === "object") delete (parent as Record<string, unknown>)[parts[parts.length - 1]];
  }
  for (const [k, v] of Object.entries(update.$inc ?? {})) setPath(d, k, (Number(getPath(d, k)) || 0) + v);
  for (const [k, v] of Object.entries(update.$push ?? {})) {
    const arr = (getPath(d, k) as unknown[]) ?? [];
    const each = v && typeof v === "object" && "$each" in (v as object) ? ((v as { $each: unknown[] }).$each) : [v];
    setPath(d, k, [...arr, ...each]);
  }
  for (const [k, v] of Object.entries(update.$addToSet ?? {})) {
    const arr = (getPath(d, k) as unknown[]) ?? [];
    setPath(d, k, arr.some((x) => eq(x, v)) ? arr : [...arr, v]);
  }
  for (const [k, v] of Object.entries(update.$pull ?? {})) {
    const arr = (getPath(d, k) as unknown[]) ?? [];
    setPath(d, k, arr.filter((x) => (v && typeof v === "object" && !(v instanceof Date) ? !matches(x, v as Filter) : !eq(x, v))));
  }
  return d as T;
}

function sortDocs<T>(docs: T[], sort?: Record<string, 1 | -1>): T[] {
  if (!sort) return docs;
  const keys = Object.entries(sort);
  return [...docs].sort((a, b) => {
    for (const [k, dir] of keys) {
      const c = cmp(getPath(a, k), getPath(b, k));
      if (c !== 0) return c * dir;
    }
    return 0;
  });
}

class MemoryCollection<T extends { _id: string }> implements Collection<T> {
  docs: T[] = [];
  constructor(private name: string) {}
  private uniqueViolation(doc: T, exceptId?: string): string | null {
    for (const keys of UNIQUE_INDEXES[this.name] ?? []) {
      const vals = keys.map((k) => getPath(doc, k));
      if (vals.some((v) => v === undefined || v === null)) continue; // sparse
      const clash = this.docs.find((d) => d._id !== exceptId && keys.every((k, i) => eq(getPath(d, k), vals[i])));
      if (clash) return keys.map((k, i) => `${k}=${String(vals[i])}`).join(",");
    }
    if (this.docs.some((d) => d._id === doc._id && d._id !== exceptId)) return `_id=${doc._id}`;
    return null;
  }
  async findOne(filter: Filter, opts?: FindOptions) { return structuredClone(sortDocs(this.docs.filter((d) => matches(d, filter)), opts?.sort)[0] ?? null); }
  async find(filter: Filter, opts?: FindOptions) {
    let r = sortDocs(this.docs.filter((d) => matches(d, filter)), opts?.sort);
    if (opts?.skip) r = r.slice(opts.skip);
    if (opts?.limit) r = r.slice(0, opts.limit);
    return structuredClone(r);
  }
  async count(filter: Filter) { return this.docs.filter((d) => matches(d, filter)).length; }
  async insertOne(doc: T) {
    const v = this.uniqueViolation(doc);
    if (v) throw new DuplicateKeyError(this.name, v);
    this.docs.push(structuredClone(doc));
    return doc;
  }
  async insertManyAtomic(docs: T[]) {
    const inserted: string[] = [];
    try {
      for (const d of docs) { await this.insertOne(d); inserted.push(d._id); }
    } catch (e) {
      this.docs = this.docs.filter((d) => !inserted.includes(d._id));
      throw e;
    }
  }
  async updateOne(filter: Filter, update: Update) {
    const i = this.docs.findIndex((d) => matches(d, filter));
    if (i < 0) return null;
    const next = applyUpdate(this.docs[i], update);
    const v = this.uniqueViolation(next, this.docs[i]._id);
    if (v) throw new DuplicateKeyError(this.name, v);
    this.docs[i] = next;
    return structuredClone(next);
  }
  async updateMany(filter: Filter, update: Update) {
    let n = 0;
    this.docs = this.docs.map((d) => (matches(d, filter) ? (n++, applyUpdate(d, update)) : d));
    return n;
  }
  async deleteOne(filter: Filter) {
    const i = this.docs.findIndex((d) => matches(d, filter));
    if (i < 0) return false;
    this.docs.splice(i, 1);
    return true;
  }
  async deleteMany(filter: Filter) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matches(d, filter));
    return before - this.docs.length;
  }
}

export class MemoryRepo implements Repo {
  private cols = new Map<string, MemoryCollection<{ _id: string }>>();
  col<T extends { _id: string }>(name: string): Collection<T> {
    if (!this.cols.has(name)) this.cols.set(name, new MemoryCollection(name));
    return this.cols.get(name) as unknown as Collection<T>;
  }
}
