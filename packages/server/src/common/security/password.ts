import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const algorithm = "pbkdf2_sha256";
const iterations = 120_000;
const keyLength = 32;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, "sha256").toString("base64url");

  return `${algorithm}$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, encodedHash: string) {
  const [storedAlgorithm, storedIterations, salt, storedHash] = encodedHash.split("$");

  if (storedAlgorithm !== algorithm || !storedIterations || !salt || !storedHash) {
    return false;
  }

  const parsedIterations = Number(storedIterations);

  if (!Number.isInteger(parsedIterations) || parsedIterations <= 0) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, parsedIterations, keyLength, "sha256");
  const expected = Buffer.from(storedHash, "base64url");

  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}
