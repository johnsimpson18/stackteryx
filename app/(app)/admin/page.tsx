import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { CompAccessSection } from "@/components/admin/comp-access-section";

async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("org_settings")
      .select("org_id")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

function EnvCheck({ name, present }: { name: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <code className="text-sm">{name}</code>
      {present ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
    </div>
  );
}

interface FreeToolLead {
  id: string;
  email: string;
  first_name: string | null;
  company_name: string | null;
  client_domain: string | null;
  converted_to_org_id: string | null;
  created_at: string;
}

async function getFreeToolLeads(): Promise<FreeToolLead[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("free_tool_leads")
      .select("id, email, first_name, company_name, client_domain, converted_to_org_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/dashboard");

  const [isConnected, leads] = await Promise.all([
    checkSupabaseConnection(),
    getFreeToolLeads(),
  ]);

  const envVars = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      name: "WHOP_API_KEY",
      present: !!process.env.WHOP_API_KEY,
    },
    {
      name: "WHOP_WEBHOOK_SECRET",
      present: !!process.env.WHOP_WEBHOOK_SECRET,
    },
    {
      name: "ANTHROPIC_API_KEY",
      present: !!process.env.ANTHROPIC_API_KEY,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="System health and configuration status"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {envVars.map((env) => (
              <EnvCheck
                key={env.name}
                name={env.name}
                present={env.present}
              />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supabase Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm">Not connected</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last Webhook Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  No webhooks received yet (Phase 4)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comp Access Management */}
      <CompAccessSection />

      {/* Free Tool Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Free Tool Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads captured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Email</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Company</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Domain</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="py-2 pr-4">{lead.email}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{lead.first_name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{lead.company_name ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{lead.client_domain || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        {lead.converted_to_org_id ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Converted
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Lead</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
