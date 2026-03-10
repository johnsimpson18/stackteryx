"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { BUNDLE_TYPE_LABELS, BUNDLE_TYPES } from "@/lib/constants";
import { updateServiceCapabilitiesAction } from "@/actions/service-profile";
import type { BundleType, ServiceCapability } from "@/lib/types";

interface CapabilitiesEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleId: string;
  capabilities: ServiceCapability[];
  bundleType: BundleType;
}

export function CapabilitiesEditModal({
  open,
  onOpenChange,
  bundleId,
  capabilities: initialCapabilities,
  bundleType: initialBundleType,
}: CapabilitiesEditModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aiLoading, setAiLoading] = useState(false);

  const [caps, setCaps] = useState<{ name: string; description: string }[]>(
    initialCapabilities.map((c) => ({ name: c.name, description: c.description }))
  );
  const [bundleType, setBundleType] = useState<BundleType>(initialBundleType);

  function handleOpenChange(v: boolean) {
    if (v) {
      setCaps(initialCapabilities.map((c) => ({ name: c.name, description: c.description })));
      setBundleType(initialBundleType);
    }
    onOpenChange(v);
  }

  function addCapability() {
    setCaps([...caps, { name: "", description: "" }]);
  }

  function removeCapability(index: number) {
    setCaps(caps.filter((_, i) => i !== index));
  }

  function updateCapability(index: number, field: "name" | "description", value: string) {
    const updated = [...caps];
    updated[index] = { ...updated[index], [field]: value };
    setCaps(updated);
  }

  async function handleSuggest() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle_type: bundleType }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.capabilities && Array.isArray(data.capabilities)) {
          setCaps(data.capabilities);
        }
      }
    } catch {
      toast.error("Suggestion failed");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateServiceCapabilitiesAction(bundleId, {
        service_capabilities: caps.filter((c) => c.name.trim()),
        bundle_type: bundleType,
      });
      if (result.success) {
        toast.success("Capabilities updated");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Capabilities</DialogTitle>
          <DialogDescription>
            Define what this service includes. Each capability describes a unit of value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Service type</Label>
            <Select value={bundleType} onValueChange={(v) => setBundleType(v as BundleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUNDLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {BUNDLE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Capabilities</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSuggest}
                disabled={aiLoading}
                className="h-7 text-xs gap-1.5"
              >
                {aiLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Suggest Capabilities
              </Button>
            </div>

            {caps.map((cap, i) => (
              <div key={i} className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Capability name"
                      value={cap.name}
                      onChange={(e) => updateCapability(i, "name", e.target.value)}
                    />
                    <Textarea
                      placeholder="Brief description..."
                      value={cap.description}
                      onChange={(e) => updateCapability(i, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCapability(i)}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCapability}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Capability
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
