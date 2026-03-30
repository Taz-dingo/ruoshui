import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../env.js";

const queryClient = postgres(env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

const db = drizzle(queryClient);

async function checkDatabaseConnection(): Promise<void> {
  await queryClient`select 1`;
}

export { checkDatabaseConnection, db, queryClient };
