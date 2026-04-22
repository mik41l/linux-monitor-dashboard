import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: string;
  exp: number;
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAuthToken(
  payload: Omit<AuthTokenPayload, "exp">,
  secret: string,
  ttlSeconds = 8 * 60 * 60
) {
  const encodedPayload = encodeJson({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  });
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string, secret: string): AuthTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AuthTokenPayload;

    if (!payload.userId || !payload.email || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
