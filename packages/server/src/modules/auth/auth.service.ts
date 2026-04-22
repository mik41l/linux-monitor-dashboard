import { and, desc, eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "../../common/security/password.js";
import { createAuthToken, verifyAuthToken } from "../../common/security/token.js";
import { authLoginLogs } from "../../db/schema/auth-login-logs.schema.js";
import { users } from "../../db/schema/users.schema.js";
import type { Database } from "../shared/database.types.js";

export type UserRole = "admin" | "operator" | "viewer";
export type UserStatus = "active" | "disabled";

export interface RequestMetadata {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeUser(user: typeof users.$inferSelect): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export class AuthService {
  public constructor(
    private readonly database: Database,
    private readonly authSecret: string
  ) {}

  public async login(input: { email: string; password: string }, metadata: RequestMetadata) {
    const email = normalizeEmail(input.email);
    const [user] = await this.database.db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      await this.recordLoginAttempt({ email, status: "failure", reason: "unknown_user", metadata });
      return null;
    }

    if (user.status !== "active") {
      await this.recordLoginAttempt({ email, userId: user.id, status: "failure", reason: "disabled_user", metadata });
      return null;
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      await this.recordLoginAttempt({ email, userId: user.id, status: "failure", reason: "invalid_password", metadata });
      return null;
    }

    await this.database.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    await this.recordLoginAttempt({ email, userId: user.id, status: "success", metadata });

    const cleanUser = sanitizeUser({
      ...user,
      lastLoginAt: new Date()
    });
    const token = createAuthToken(
      {
        userId: cleanUser.id,
        email: cleanUser.email,
        role: cleanUser.role
      },
      this.authSecret
    );

    return {
      token,
      user: cleanUser
    };
  }

  public async authenticateToken(token: string | undefined) {
    if (!token) {
      return null;
    }

    const payload = verifyAuthToken(token, this.authSecret);

    if (!payload) {
      return null;
    }

    const [user] = await this.database.db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.userId), eq(users.status, "active")))
      .limit(1);

    return user ? sanitizeUser(user) : null;
  }

  public async listUsers() {
    const rows = await this.database.db.select().from(users).orderBy(users.id);
    return rows.map(sanitizeUser);
  }

  public async createUser(input: {
    email: string;
    username: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    password: string;
    mustChangePassword: boolean;
  }) {
    const [created] = await this.database.db
      .insert(users)
      .values({
        email: normalizeEmail(input.email),
        username: input.username.trim(),
        fullName: input.fullName.trim(),
        role: input.role,
        status: input.status,
        passwordHash: hashPassword(input.password),
        mustChangePassword: input.mustChangePassword
      })
      .returning();

    return created ? sanitizeUser(created) : null;
  }

  public async updateUser(
    id: number,
    input: Partial<{
      email: string | undefined;
      username: string | undefined;
      fullName: string | undefined;
      role: UserRole | undefined;
      status: UserStatus | undefined;
      mustChangePassword: boolean | undefined;
    }>
  ) {
    const update: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.email) update.email = normalizeEmail(input.email);
    if (input.username) update.username = input.username.trim();
    if (input.fullName) update.fullName = input.fullName.trim();
    if (input.role) update.role = input.role;
    if (input.status) update.status = input.status;
    if (typeof input.mustChangePassword === "boolean") {
      update.mustChangePassword = input.mustChangePassword;
    }

    const [updated] = await this.database.db.update(users).set(update).where(eq(users.id, id)).returning();
    return updated ? sanitizeUser(updated) : null;
  }

  public async setPassword(id: number, input: { password: string; mustChangePassword: boolean }) {
    const [updated] = await this.database.db
      .update(users)
      .set({
        passwordHash: hashPassword(input.password),
        mustChangePassword: input.mustChangePassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    return updated ? sanitizeUser(updated) : null;
  }

  public async changeOwnPassword(id: number, input: { currentPassword: string; newPassword: string }) {
    const [user] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user || !verifyPassword(input.currentPassword, user.passwordHash)) {
      return null;
    }

    const [updated] = await this.database.db
      .update(users)
      .set({
        passwordHash: hashPassword(input.newPassword),
        mustChangePassword: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    return updated ? sanitizeUser(updated) : null;
  }

  public async listLoginLogs(options: {
    userId?: number | undefined;
    status?: "success" | "failure" | undefined;
    limit: number;
  }) {
    const conditions = [];

    if (options.userId) {
      conditions.push(eq(authLoginLogs.userId, options.userId));
    }

    if (options.status) {
      conditions.push(eq(authLoginLogs.status, options.status));
    }

    return this.database.db
      .select()
      .from(authLoginLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(authLoginLogs.createdAt))
      .limit(options.limit);
  }

  private async recordLoginAttempt(input: {
    email: string;
    userId?: number | undefined;
    status: "success" | "failure";
    reason?: string | undefined;
    metadata: RequestMetadata;
  }) {
    await this.database.db.insert(authLoginLogs).values({
      email: input.email,
      userId: input.userId,
      status: input.status,
      reason: input.reason,
      ipAddress: input.metadata.ipAddress,
      userAgent: input.metadata.userAgent
    });
  }
}
