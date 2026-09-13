import { z } from "zod";

const profileYearSchema = z.number().int().min(1950).max(2100).nullable();
const profileTextSchema = z.string().trim().min(1).max(120).nullable();

const alumniIdentitySchema = z
  .object({
    enrollmentYear: profileYearSchema,
    graduationYear: profileYearSchema,
    department: profileTextSchema,
    major: profileTextSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.enrollmentYear !== null &&
      value.graduationYear !== null &&
      value.graduationYear < value.enrollmentYear
    ) {
      context.addIssue({
        code: "custom",
        message: "Graduation year cannot be earlier than enrollment year.",
        path: ["graduationYear"],
      });
    }
  });

const userProfileSchema = z.object({
  userId: z.string().min(1).max(120),
  displayName: z.string().trim().min(1).max(80).nullable(),
  avatarUrl: z.string().max(1024).nullable(),
  alumniIdentity: alumniIdentitySchema.nullable(),
});

const updateUserProfileDetailsInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).nullable().optional(),
    alumniIdentity: alumniIdentitySchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.displayName === undefined && value.alumniIdentity === undefined) {
      context.addIssue({ code: "custom", message: "Profile update must contain at least one field." });
    }
  });

const profileAvatarUploadInputSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(8 * 1024 * 1024),
  })
  .strict();

const confirmProfileAvatarInputSchema = z
  .object({
    objectKey: z.string().min(1).max(512),
  })
  .strict();

type AlumniIdentity = z.infer<typeof alumniIdentitySchema>;
type ConfirmProfileAvatarInput = z.infer<typeof confirmProfileAvatarInputSchema>;
type ProfileAvatarUploadInput = z.infer<typeof profileAvatarUploadInputSchema>;
type UpdateUserProfileDetailsInput = z.infer<typeof updateUserProfileDetailsInputSchema>;
type UserProfile = z.infer<typeof userProfileSchema>;

export {
  alumniIdentitySchema,
  confirmProfileAvatarInputSchema,
  profileAvatarUploadInputSchema,
  updateUserProfileDetailsInputSchema,
  userProfileSchema,
};

export type {
  AlumniIdentity,
  ConfirmProfileAvatarInput,
  ProfileAvatarUploadInput,
  UpdateUserProfileDetailsInput,
  UserProfile,
};
