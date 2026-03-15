"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBundleSchema,
  type CreateBundleValues,
} from "@/lib/schemas/bundle";
import {
  createBundleAction,
  updateBundleAction,
} from "@/actions/bundles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUNDLE_TYPE_LABELS, BUNDLE_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Bundle, BundleType, BundleStatus } from "@/lib/types";

interface BundleFormProps {
  bundle?: Bundle;
  onSuccess?: () => void;
}

export function BundleForm({ bundle, onSuccess }: BundleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!bundle;

  const form = useForm<CreateBundleValues & { status?: BundleStatus }>({
    resolver: zodResolver(createBundleSchema),
    defaultValues: bundle
      ? {
          name: bundle.name,
          bundle_type: bundle.bundle_type,
          description: bundle.description,
        }
      : {
          name: "",
          bundle_type: "custom",
          description: "",
        },
  });

  const [status, setStatus] = useState(bundle?.status ?? "draft");

  function onSubmit(data: CreateBundleValues) {
    startTransition(async () => {
      if (isEditing) {
        const result = await updateBundleAction(bundle.id, {
          ...data,
          status,
        });
        if (result.success) {
          toast.success("Service updated");
          if (onSuccess) {
            onSuccess();
          } else {
            router.push(`/services/${bundle.id}`);
          }
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await createBundleAction(data);
        if (result.success) {
          toast.success("Service created");
          if (onSuccess) {
            onSuccess();
          } else {
            router.push(`/services/${result.data.id}`);
          }
        } else {
          toast.error(result.error);
        }
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              placeholder="e.g. Essential Security Service"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select
              value={form.watch("bundle_type")}
              onValueChange={(v) =>
                form.setValue("bundle_type", v as BundleType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["ala_carte", "tiered", "vertical", "custom"] as const
                ).map((type) => (
                  <SelectItem key={type} value={type}>
                    {BUNDLE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this service deliver and who is it for?"
              {...form.register("description")}
              rows={3}
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as BundleStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["draft", "active", "archived"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {BUNDLE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess ? onSuccess() : router.push(isEditing ? `/services/${bundle.id}` : "/services")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : isEditing
              ? "Update Service"
              : "Create Service"}
        </Button>
      </div>
    </form>
  );
}

