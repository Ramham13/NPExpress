import type { Request, Response } from "express";
import { verifyAdminToken } from "./admin-token";

export const ADMIN_HEADER_NAME = "x-admin-key";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function getAdminTokenFromRequest(req: Request): string | null {
  const token = req.headers[ADMIN_HEADER_NAME];
  return typeof token === "string" && token ? token : null;
}

export function isAdminTokenValid(token: string | null, adminPassword = getAdminPassword()): boolean {
  return Boolean(adminPassword && token && verifyAdminToken(token, adminPassword));
}

export function requireAdminAccess(req: Request, res: Response): boolean {
  if (!isAdminTokenValid(getAdminTokenFromRequest(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}
