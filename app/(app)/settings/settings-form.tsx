"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  workspaceSettingsSchema,
  type WorkspaceSettingsFormValues,
} from "@/lib/schemas/settings";
import { updateSettingsAction, resetOnboardingAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTransition } from "react";
import { hasPermission } from "@/lib/constants";
import type { OrgSettings } from "@/lib/db/org-settings";
import type { UserRole } from "@/lib/types";

interface SettingsFormProps {
  settings: OrgSettings;
  userRole: UserRole;
}

export function SettingsForm({ settings, userRole }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const canEdit = hasPermission(userRole, "update_settings");

  const form = useForm<WorkspaceSettingsFormValues>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      workspace_name: settings.workspace_name,
      default_overhead_pct: Number(settings.default_overhead_pct) * 100,
      default_labor_pct: Number(settings.default_labor_pct) * 100,
      default_target_margin_pct:
        Number(settings.default_target_margin_pct) * 100,
      red_zone_margin_pct: Number(settings.red_zone_margin_pct) * 100,
      max_discount_no_approval_pct:
        Number(settings.max_discount_no_approval_pct) * 100,
    },
  });

  function onSubmit(data: WorkspaceSettingsFormValues) {
    startTransition(async () => {
      const result = await updateSettingsAction(data);
      if (result.success) {
        toast.success("Settings updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  const pctFields = [
    {
      name: "default_overhead_pct" as const,
      label: "Default Overhead %",
      description: "Applied to tool costs for overhead allocation",
    },
    {
      name: "default_labor_pct" as const,
      label: "Default Labor %",
      description: "Applied to tool costs for labor allocation",
    },
    {
      name: "default_target_margin_pct" as const,
      label: "Target Margin %",
      description: "The margin target for pricing recommendations",
    },
    {
      name: "red_zone_margin_pct" as const,
      label: "Red Zone Margin %",
      description: "Margins below this threshold trigger warnings",
    },
    {
      name: "max_discount_no_approval_pct" as const,
      label: "Max Discount Without Approval %",
      description: "Discounts above this require approval",
    },
  ] as const;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="workspace_name">Workspace Name</Label>
            <Input
              id="workspace_name"
              disabled={!canEdit}
              {...form.register("workspace_name")}
            />
            {form.formState.errors.workspace_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.workspace_name.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pctFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <div className="relative">
                <Input
                  id={field.name}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={!canEdit}
                  {...form.register(field.name)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
              {form.formState.errors[field.name] && (
                <p className="text-sm text-destructive">
                  {form.formState.errors[field.name]?.message}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      )}

      {!canEdit && (
        <p className="text-sm text-muted-foreground text-center">
          Only the workspace owner can modify settings.
        </p>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Re-run the guided setup to update your company profile, vendors, and services.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                startTransition(async () => {
                  const result = await resetOnboardingAction();
                  if (!result.success) {
                    toast.error(result.error);
                  }
                });
              }}
              disabled={isPending}
            >
              {isPending ? "Resetting..." : "Re-run Onboarding"}
            </Button>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
