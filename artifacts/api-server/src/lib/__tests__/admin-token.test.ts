import { afterEach, describe, expect, it, vi } from "vitest";
import { signAdminToken, verifyAdminToken } from "../admin-token";

const PASSWORD = "local-dev-password";
const BASE_TIME = new Date("2026-07-06T12:00:00Z");

describe("admin token helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a freshly signed token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);

    const token = signAdminToken(PASSWORD);

    expect(verifyAdminToken(token, PASSWORD)).toBe(true);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    const token = signAdminToken(PASSWORD);

    vi.setSystemTime(new Date(BASE_TIME.getTime() + (8 * 60 * 60 * 1000) + 1));

    expect(verifyAdminToken(token, PASSWORD)).toBe(false);
  });

  it("rejects a correctly signed token that is too far in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(BASE_TIME.getTime() + (2 * 60 * 1000)));
    const futureToken = signAdminToken(PASSWORD);

    vi.setSystemTime(BASE_TIME);

    expect(verifyAdminToken(futureToken, PASSWORD)).toBe(false);
  });
});
