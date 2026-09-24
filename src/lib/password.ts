// Password hashing with Node's built-in scrypt. Stored as `scrypt$<salt>$<hash>`
// (base64url), so the real password is never saved anywhere. Server only.

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), KEY_LENGTH);
  const wanted = Buffer.from(expected, "base64url");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
