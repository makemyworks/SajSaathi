/**
 * Minimal, dependency-free request validation. Every API route validates its body with one of
 * these schemas on the server; never trust client-side checks alone.
 */
import { badRequest } from "./util";

type Check<T> = (v: unknown, path: string) => T;

export const v = {
  string(opts: { min?: number; max?: number; pattern?: RegExp; trim?: boolean; lower?: boolean; msg?: string } = {}): Check<string> {
    return (val, path) => {
      if (typeof val !== "string") throw badRequest(`${path} must be text`);
      let s = opts.trim === false ? val : val.trim();
      if (opts.lower) s = s.toLowerCase();
      if (opts.min !== undefined && s.length < opts.min) throw badRequest(opts.msg ?? `${path} is too short`);
      if (opts.max !== undefined && s.length > opts.max) throw badRequest(`${path} is too long`);
      if (opts.pattern && !opts.pattern.test(s)) throw badRequest(opts.msg ?? `${path} is not valid`);
      return s;
    };
  },
  number(opts: { min?: number; max?: number; int?: boolean } = {}): Check<number> {
    return (val, path) => {
      const n = typeof val === "string" && val.trim() !== "" ? Number(val) : val;
      if (typeof n !== "number" || !Number.isFinite(n)) throw badRequest(`${path} must be a number`);
      if (opts.int && !Number.isInteger(n)) throw badRequest(`${path} must be a whole number`);
      if (opts.min !== undefined && n < opts.min) throw badRequest(`${path} must be at least ${opts.min}`);
      if (opts.max !== undefined && n > opts.max) throw badRequest(`${path} must be at most ${opts.max}`);
      return n;
    };
  },
  boolean(): Check<boolean> {
    return (val, path) => {
      if (typeof val === "boolean") return val;
      if (val === "true" || val === "on") return true;
      if (val === "false") return false;
      throw badRequest(`${path} must be true or false`);
    };
  },
  enum<T extends string>(values: readonly T[]): Check<T> {
    return (val, path) => {
      if (typeof val !== "string" || !values.includes(val as T)) throw badRequest(`${path} must be one of: ${values.join(", ")}`);
      return val as T;
    };
  },
  array<T>(item: Check<T>, opts: { max?: number; min?: number } = {}): Check<T[]> {
    return (val, path) => {
      if (!Array.isArray(val)) throw badRequest(`${path} must be a list`);
      if (opts.max !== undefined && val.length > opts.max) throw badRequest(`${path} has too many items`);
      if (opts.min !== undefined && val.length < opts.min) throw badRequest(`${path} needs at least ${opts.min} item(s)`);
      return val.map((x, i) => item(x, `${path}[${i}]`));
    };
  },
  object<S extends Record<string, Check<unknown>>>(shape: S): Check<{ [K in keyof S]: ReturnType<S[K]> }> {
    return (val, path) => {
      if (!val || typeof val !== "object" || Array.isArray(val)) throw badRequest(`${path || "body"} must be an object`);
      const out: Record<string, unknown> = {};
      for (const [k, check] of Object.entries(shape)) {
        const r = check((val as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
        if (r !== undefined) out[k] = r;
      }
      return out as { [K in keyof S]: ReturnType<S[K]> };
    };
  },
  record(): Check<Record<string, unknown>> {
    return (val, path) => {
      if (val === undefined) return {};
      if (!val || typeof val !== "object" || Array.isArray(val)) throw badRequest(`${path} must be an object`);
      if (JSON.stringify(val).length > 20000) throw badRequest(`${path} is too large`);
      return val as Record<string, unknown>;
    };
  },
  optional<T>(check: Check<T>): Check<T | undefined> {
    return (val, path) => (val === undefined || val === null || val === "" ? undefined : check(val, path));
  },
  id(): Check<string> {
    return v.string({ pattern: /^[a-f0-9]{24}$/, msg: "Invalid id" });
  },
};

export function parse<T>(check: Check<T>, body: unknown): T {
  return check(body, "");
}
