import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./schema.js";

const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  avatarObjectKey: text("avatar_object_key"),
  alumniEnrollmentYear: integer("alumni_enrollment_year"),
  alumniGraduationYear: integer("alumni_graduation_year"),
  alumniDepartment: text("alumni_department"),
  alumniMajor: text("alumni_major"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export { userProfiles };
