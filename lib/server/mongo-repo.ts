import { MongoClient, MongoServerError, type Db, type Document, type Filter as MFilter, type UpdateFilter } from "mongodb";
import { DuplicateKeyError, UNIQUE_INDEXES, type Collection, type Filter, type FindOptions, type Repo, type Update } from "@/lib/core/repo";

/**
 * MongoDB implementation of the core Repo interface.
 * The client is cached on globalThis so serverless functions reuse one connection pool.
 */
const g = globalThis as unknown as { __ssMongo?: Promise<MongoClient>; __ssIndexes?: Promise<void> };

// All application IDs are generated and stored as strings (not BSON ObjectIds).
type MongoDoc = Document & { _id: string };

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. See START-HERE.md.");
  if (!g.__ssMongo) {
    const pending = new MongoClient(uri, { maxPoolSize: 10, retryWrites: true, appName: "saj-saathi-api", serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 }).connect();
    g.__ssMongo = pending.catch((error) => {
      // Do not cache a rejected connection promise in a warm serverless instance.
      g.__ssMongo = undefined;
      throw error;
    });
  }
  return g.__ssMongo!;
}

/** Non-unique indexes for the main query patterns. */
const QUERY_INDEXES: Record<string, Record<string, 1 | -1>[]> = {
  bookings: [{ providerId: 1, start: 1 }, { customerId: 1, start: -1 }, { status: 1, start: 1 }, { createdAt: -1 }, { completedAt: -1 }],
  providers: [{ status: 1, categoryIds: 1, "address.city": 1 }, { "serviceArea.pins": 1 }, { "address.pin": 1 }, { ownerUserId: 1 }],
  services: [{ providerId: 1, active: 1 }, { categoryId: 1 }],
  staff: [{ providerId: 1 }],
  sessions: [{ userId: 1 }],
  notifications: [{ userId: 1, createdAt: -1 }],
  payments: [{ bookingId: 1 }, { createdAt: -1 }],
  refunds: [{ bookingId: 1 }, { status: 1 }],
  reviews: [{ providerId: 1, status: 1, createdAt: -1 }],
  tickets: [{ userId: 1, updatedAt: -1 }, { status: 1 }],
  audit_events: [{ at: -1 }, { entity: 1, entityId: 1 }],
  blocks: [{ providerId: 1, start: 1 }],
  slot_locks: [{ bookingId: 1 }],
  documents: [{ providerId: 1 }],
  addresses: [{ userId: 1 }],
};

async function ensureIndexes(db: Db) {
  g.__ssIndexes ??= (async () => {
    for (const [col, sets] of Object.entries(UNIQUE_INDEXES)) {
      for (const keys of sets) {
        const spec = Object.fromEntries(keys.map((k) => [k, 1 as const])) as Record<string, 1>;
        // partial index = sparse uniqueness (users may have only phone or only email)
        const partial = Object.fromEntries(keys.map((k) => [k, { $exists: true }]));
        await db.collection(col).createIndex(spec, { unique: true, partialFilterExpression: partial, name: `uniq_${keys.join("_")}` });
      }
    }
    for (const [col, sets] of Object.entries(QUERY_INDEXES)) for (const spec of sets) await db.collection(col).createIndex(spec);
    await db.collection("rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection("webhook_events").createIndex({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
  })().catch((e) => { g.__ssIndexes = undefined; throw e; });
  return g.__ssIndexes;
}

function wrapDup<T>(name: string, p: Promise<T>): Promise<T> {
  return p.catch((e) => {
    if (e instanceof MongoServerError && e.code === 11000) throw new DuplicateKeyError(name, JSON.stringify(e.keyValue ?? {}));
    throw e;
  });
}

class MongoCollection<T extends { _id: string }> implements Collection<T> {
  constructor(private db: Promise<Db>, private name: string) {}
  private async c() { return (await this.db).collection<MongoDoc>(this.name); }
  async findOne(filter: Filter, opts?: FindOptions) {
    const c = await this.c();
    return (await c.findOne(filter as MFilter<MongoDoc>, { sort: opts?.sort, projection: opts?.projection })) as unknown as T | null;
  }
  async find(filter: Filter, opts?: FindOptions) {
    const c = await this.c();
    let cur = c.find(filter as MFilter<MongoDoc>, { projection: opts?.projection });
    if (opts?.sort) cur = cur.sort(opts.sort);
    if (opts?.skip) cur = cur.skip(opts.skip);
    cur = cur.limit(Math.min(opts?.limit ?? 1000, 5000));
    return (await cur.toArray()) as unknown as T[];
  }
  async count(filter: Filter) { return (await this.c()).countDocuments(filter as MFilter<MongoDoc>); }
  async insertOne(doc: T) { await wrapDup(this.name, (await this.c()).insertOne(doc as unknown as MongoDoc)); return doc; }
  async insertManyAtomic(docs: T[]) {
    if (!docs.length) return;
    const c = await this.c();
    const mongoClient = await client();
    const session = mongoClient.startSession();
    try {
      // A transaction guarantees all-or-nothing insertion. It also avoids deleting
      // pre-existing documents when a duplicate _id causes the batch to fail.
      await session.withTransaction(async () => {
        await c.insertMany(docs as unknown as MongoDoc[], { ordered: true, session });
      });
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) throw new DuplicateKeyError(this.name, "bulk");
      throw e;
    } finally {
      await session.endSession();
    }
  }
  async updateOne(filter: Filter, update: Update) {
    const c = await this.c();
    const res = await wrapDup(this.name, c.findOneAndUpdate(filter as MFilter<MongoDoc>, update as UpdateFilter<MongoDoc>, { returnDocument: "after" }));
    return (res ?? null) as unknown as T | null;
  }
  async updateMany(filter: Filter, update: Update) { return (await (await this.c()).updateMany(filter as MFilter<MongoDoc>, update as UpdateFilter<MongoDoc>)).modifiedCount; }
  async deleteOne(filter: Filter) { return (await (await this.c()).deleteOne(filter as MFilter<MongoDoc>)).deletedCount === 1; }
  async deleteMany(filter: Filter) { return (await (await this.c()).deleteMany(filter as MFilter<MongoDoc>)).deletedCount; }
}

export class MongoRepo implements Repo {
  private db: Promise<Db>;
  constructor() {
    this.db = client().then(async (c) => {
      const db = c.db(process.env.MONGODB_DB || "saj_saathi");
      await ensureIndexes(db);
      return db;
    });
  }
  col<T extends { _id: string }>(name: string): Collection<T> { return new MongoCollection<T>(this.db, name); }
  raw() { return this.db; }
}
