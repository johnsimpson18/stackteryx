import { createClient } from "@/lib/supabase/server";
import type { Client, ClientStatus, ClientWithContracts } from "@/lib/types";

export async function getClients(orgId?: string): Promise<ClientWithContracts[]> {
  const supabase = await createClient();

  let query = supabase.from("clients").select("*").order("name");

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data: clients, error } = await query;

  if (error) throw error;
  if (!clients || clients.length === 0) return [];

  // Fetch active contracts for each client in bulk
  const clientIds = clients.map((c) => c.id);
  const { data: contracts } = await supabase
    .from("client_contracts")
    .select(`
      id, client_id, bundle_id, bundle_version_id, seat_count,
      start_date, end_date, monthly_revenue, monthly_cost, margin_pct,
      status, notes, created_by, created_at, updated_at,
      bundles!inner(name, bundle_type),
      bundle_versions!inner(version_number)
    `)
    .in("client_id", clientIds)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Map latest active contract per client
  const contractMap = new Map<string, typeof contracts extends (infer T)[] | null ? T : never>();
  const countMap = new Map<string, number>();

  if (contracts) {
    for (const contract of contracts) {
      const count = countMap.get(contract.client_id) ?? 0;
      countMap.set(contract.client_id, count + 1);
      if (!contractMap.has(contract.client_id)) {
        contractMap.set(contract.client_id, contract);
      }
    }
  }

  return clients.map((c) => {
    const raw = contractMap.get(c.id);
    const active_contract = raw
      ? {
          id: raw.id,
          client_id: raw.client_id,
          bundle_id: raw.bundle_id,
          bundle_version_id: raw.bundle_version_id,
          seat_count: raw.seat_count,
          start_date: raw.start_date,
          end_date: raw.end_date,
          monthly_revenue: Number(raw.monthly_revenue),
          monthly_cost: Number(raw.monthly_cost),
          margin_pct: Number(raw.margin_pct),
          status: raw.status as "active" | "expired" | "cancelled",
          notes: raw.notes,
          created_by: raw.created_by,
          created_at: raw.created_at,
          updated_at: raw.updated_at,
          // @ts-expect-error – joined relation
          bundle_name: raw.bundles?.name ?? "",
          // @ts-expect-error – joined relation
          bundle_type: raw.bundles?.bundle_type ?? "custom",
          // @ts-expect-error – joined relation
          version_number: raw.bundle_versions?.version_number ?? 1,
        }
      : null;

    return {
      ...(c as Client),
      active_contract,
      total_contracts: countMap.get(c.id) ?? 0,
    };
  });
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Client;
}

export async function createClient_(data: {
  name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  status: ClientStatus;
  notes: string;
  created_by: string;
  org_id: string;
}): Promise<Client> {
  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return client as Client;
}

export async function updateClient(
  id: string,
  data: Partial<{
    name: string;
    industry: string;
    contact_name: string;
    contact_email: string;
    status: ClientStatus;
    notes: string;
  }>
): Promise<Client> {
  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return client as Client;
}
