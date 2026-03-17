"use server";

import { createServiceClient } from "@/lib/supabase/service";

interface FreeLeadInput {
  email: string;
  firstName?: string;
  companyName?: string;
  clientDomain: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function captureFreeLead(
  input: FreeLeadInput,
): Promise<{ success: boolean }> {
  try {
    if (!EMAIL_RE.test(input.email)) {
      return { success: false };
    }

    const service = createServiceClient();

    await service.from("free_tool_leads").insert({
      email: input.email,
      first_name: input.firstName ?? null,
      company_name: input.companyName ?? null,
      client_domain: input.clientDomain,
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}
