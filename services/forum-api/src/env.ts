import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@localhost:5432/ruoshui"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  OSS_PROVIDER: z.enum(["none", "alioss"]).default("none"),
  OSS_BUCKET: z.string().default(""),
  OSS_REGION: z.string().default(""),
  OSS_PUBLIC_BASE_URL: z.string().default(""),
});

const env = envSchema.parse(process.env);

export { env };
