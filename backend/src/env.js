import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default("root"), // or mob_user
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("mob_barley"),
  // RDS / TLS
  DB_SSL: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v.toLowerCase() === "true";
      return false;
    })
    .default(false),
  // Optional PEM-encoded CA bundle contents (single-line or multi-line)
  DB_SSL_CA: z.string().optional(),
  // Optional path to a PEM file inside the container/FS
  DB_SSL_CA_PATH: z.string().optional(),
  FRONTEND_BASE_URL: z.string().optional(),
});

try {
  // eslint-disable-next-line node/no-process-env
  envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Missing environment variables:",
      error.issues.flatMap((issue) => issue.path),
    );
  } else {
    console.error(error);
  }
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
export const env = envSchema.parse(process.env);
