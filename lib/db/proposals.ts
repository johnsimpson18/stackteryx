import { createClient } from "@/lib/supabase/server";
import type { Proposal, ProposalStatus, ProposalContent, ProposalServiceRef } from "@/lib/types";

export async function getProposals(orgId: string): Promise<Proposal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as Proposal[]) ?? [];
}

export async function getProposalsByClientId(
  clientId: string
): Promise<Proposal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Proposal[]) ?? [];
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Proposal;
}

export async function createProposal(data: {
  org_id: string;
  client_id?: string | null;
  prospect_name?: string | null;
  prospect_industry?: string | null;
  prospect_size?: string | null;
  services_included: ProposalServiceRef[];
  content: ProposalContent;
  status?: ProposalStatus;
}): Promise<Proposal> {
  const supabase = await createClient();
  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      org_id: data.org_id,
      client_id: data.client_id ?? null,
      prospect_name: data.prospect_name ?? null,
      prospect_industry: data.prospect_industry ?? null,
      prospect_size: data.prospect_size ?? null,
      services_included: data.services_included,
      content: data.content,
      status: data.status ?? "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return proposal as Proposal;
}

export async function updateProposal(
  id: string,
  data: Partial<{
    content: ProposalContent;
    status: ProposalStatus;
    services_included: ProposalServiceRef[];
  }>
): Promise<Proposal> {
  const supabase = await createClient();
  const { data: proposal, error } = await supabase
    .from("proposals")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return proposal as Proposal;
}
