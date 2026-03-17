"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClientAction, updateClientAction } from "@/actions/clients";
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS, INDUSTRY_OPTIONS } from "@/lib/constants";
import { FileText, Eye, ArrowRight, Check } from "lucide-react";
import type { Client, ClientStatus } from "@/lib/types";

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!client;

  const [name, setName] = useState(client?.name ?? "");
  const [industry, setIndustry] = useState(client?.industry ?? "");
  const [contactName, setContactName] = useState(client?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(client?.contact_email ?? "");
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? "prospect");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [createdClient, setCreatedClient] = useState<{ id: string; name: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const data = { name, industry, contact_name: contactName, contact_email: contactEmail, status, notes };
      const result = isEditing
        ? await updateClientAction(client.id, data)
        : await createClientAction(data);

      if (result.success) {
        if (isEditing) {
          toast.success("Client updated");
          if (onSuccess) onSuccess();
          else router.push(`/clients/${client.id}`);
        } else {
          // Show post-creation next-step prompt
          if (onSuccess) {
            toast.success("Client created");
            onSuccess();
          } else {
            setCreatedClient({ id: result.data.id, name: data.name });
          }
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  // Post-creation next-step screen
  if (createdClient) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#A8FF3E" }}
        >
          <Check className="h-8 w-8" style={{ color: "#0A0A0A" }} />
        </div>

        <h2 className="text-2xl font-bold text-foreground">Client added.</h2>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <Button asChild className="gap-2 justify-start">
            <Link href={`/sales-studio?client=${createdClient.id}`}>
              <FileText className="h-4 w-4" />
              Generate a proposal for {createdClient.name}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </Button>
          <Button variant="outline" className="gap-2 justify-start" asChild>
            <Link href={`/clients/${createdClient.id}`}>
              <Eye className="h-4 w-4" />
              View client record
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="jane@acme.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CLIENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this client..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => onSuccess ? onSuccess() : router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? "Saving..." : isEditing ? "Update Client" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
