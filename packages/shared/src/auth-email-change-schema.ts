import { z } from "zod";

import { emailAddressSchema } from "./content-community-schema.js";

const emailChangeProofSchema = z.string().min(1).max(2_048);
const emailChangeOtpCodeSchema = z.string().regex(/^\d{6}$/);

const verifyCurrentEmailChangeOtpInputSchema = z
  .object({
    code: emailChangeOtpCodeSchema,
  })
  .strict();

const requestNewEmailChangeOtpInputSchema = z
  .object({
    email: emailAddressSchema,
    proof: emailChangeProofSchema,
  })
  .strict();

const verifyNewEmailChangeOtpInputSchema = z
  .object({
    email: emailAddressSchema,
    code: emailChangeOtpCodeSchema,
    proof: emailChangeProofSchema,
  })
  .strict();

const emailChangeStatusSchema = z.object({
  email: emailAddressSchema,
});

const emailChangeProofResultSchema = z.object({
  proof: emailChangeProofSchema,
  expiresAt: z.string().datetime(),
});

type EmailChangeProofResult = z.infer<typeof emailChangeProofResultSchema>;
type EmailChangeStatus = z.infer<typeof emailChangeStatusSchema>;
type RequestNewEmailChangeOtpInput = z.infer<typeof requestNewEmailChangeOtpInputSchema>;
type VerifyCurrentEmailChangeOtpInput = z.infer<typeof verifyCurrentEmailChangeOtpInputSchema>;
type VerifyNewEmailChangeOtpInput = z.infer<typeof verifyNewEmailChangeOtpInputSchema>;

export {
  emailChangeProofResultSchema,
  emailChangeProofSchema,
  emailChangeStatusSchema,
  requestNewEmailChangeOtpInputSchema,
  verifyCurrentEmailChangeOtpInputSchema,
  verifyNewEmailChangeOtpInputSchema,
};

export type {
  EmailChangeProofResult,
  EmailChangeStatus,
  RequestNewEmailChangeOtpInput,
  VerifyCurrentEmailChangeOtpInput,
  VerifyNewEmailChangeOtpInput,
};
