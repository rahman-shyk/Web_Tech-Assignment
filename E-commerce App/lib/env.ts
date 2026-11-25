import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  PLATFORM_DB_NAME: z.string().regex(/^[a-zA-Z0-9_-]{1,63}$/).optional(),
  APP_URL: z.string().url(),
  TENANT_HOST_MAP: z.string().optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD_HASH: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
});

let validated:
  | z.infer<typeof envSchema>
  | undefined;

export function getEnv() {
  if (!validated) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid environment: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ")}`,
      );
    }
    validated = parsed.data;
  }
  return validated;
}
