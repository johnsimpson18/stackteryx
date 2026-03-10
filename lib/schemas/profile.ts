import { z } from "zod";

export const profileSetupSchema = z.object({
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100),
});

export type ProfileSetupValues = z.infer<typeof profileSetupSchema>;

export const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "finance", "sales", "viewer"]),
});

export type ChangeRoleValues = z.infer<typeof changeRoleSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "finance", "sales", "viewer"]),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
