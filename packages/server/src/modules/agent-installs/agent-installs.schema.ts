import { z } from "zod";

export const createAgentInstallBodySchema = z
  .object({
    host: z.string().trim().min(1).max(255),
    sshPort: z.coerce.number().int().positive().max(65535).default(22),
    sshUsername: z.string().trim().min(1).max(64),
    authMethod: z.enum(["password", "privateKey"]),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional(),
    agentId: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9._-]+$/),
    agentName: z.string().trim().min(1).max(120),
    panelHost: z.string().trim().min(1).max(255),
    panelPort: z.coerce.number().int().positive().max(65535).default(9010),
    tlsEnabled: z.coerce.boolean().default(true)
  })
  .superRefine((value, context) => {
    if (value.authMethod === "password" && !value.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required",
        path: ["password"]
      });
    }

    if (value.authMethod === "privateKey" && !value.privateKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Private key is required",
        path: ["privateKey"]
      });
    }

    if (!isLoopbackHost(value.host) && isLoopbackHost(value.panelHost)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Panel host must be reachable from the remote server",
        path: ["panelHost"]
      });
    }
  });

export const installParamsSchema = z.object({
  installId: z.coerce.number().int().positive()
});

function isLoopbackHost(host: string) {
  const normalized = host.trim().toLowerCase();

  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "0.0.0.0";
}
