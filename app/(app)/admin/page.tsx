import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

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

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner") redirect("/dashboard");

  const isConnected = await checkSupabaseConnection();

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
    </div>
  );
}
