import { describe, expect, it } from "vitest";
import { rateLimit } from "@/shared/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const check = rateLimit({ windowMs: 1000, max: 3 });
    expect(check("u1", "r")).toBeNull();
    expect(check("u1", "r")).toBeNull();
    expect(check("u1", "r")).toBeNull();
  });

  it("rejects when the limit is exceeded", () => {
    const check = rateLimit({ windowMs: 1000, max: 2 });
    expect(check("u2", "r")).toBeNull();
    expect(check("u2", "r")).toBeNull();
    const blocked = check("u2", "r");
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
  });

  it("isolates buckets per user", () => {
    const check = rateLimit({ windowMs: 1000, max: 1 });
    expect(check("u3", "r")).toBeNull();
    expect(check("u4", "r")).toBeNull();
    expect(check("u3", "r")?.status).toBe(429);
  });

  it("isolates buckets per route key", () => {
    const check = rateLimit({ windowMs: 1000, max: 1 });
    expect(check("u5", "alpha")).toBeNull();
    expect(check("u5", "beta")).toBeNull();
    expect(check("u5", "alpha")?.status).toBe(429);
  });
});
