"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2 } from "lucide-react";
import { assignServiceToClientAction } from "@/actions/service-profile";
import type { ClientWithContracts, BundleVersion } from "@/lib/types";

interface AssignClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundleId: string;
  clients: ClientWithContracts[];
  versions: BundleVersion[];
}

export function AssignClientModal({
  open,
  onOpenChange,
  bundleId,
  clients,
  versions,
}: AssignClientModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState("");
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "");
  const [seatCount, setSeatCount] = useState(30);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, search]);

  function handleOpenChange(v: boolean) {
    if (v) {
      setClientId("");
      setVersionId(versions[0]?.id ?? "");
      setSeatCount(30);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setSearch("");
    }
    onOpenChange(v);
  }

  function handleAssign() {
    if (!clientId || !versionId) return;
    startTransition(async () => {
      const result = await assignServiceToClientAction(bundleId, {
        client_id: clientId,
        bundle_version_id: versionId,
        seat_count: seatCount,
        start_date: startDate,
        end_date: endDate || undefined,
      });
      if (result.success) {
        toast.success("Service assigned to client");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const canAssign = clientId && versionId && seatCount > 0 && startDate;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Client</DialogTitle>
          <DialogDescription>
            Create a contract assigning this service to a client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client selector */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No clients found
                  </SelectItem>
                ) : (
                  filteredClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Version selector */}
          <div className="space-y-2">
            <Label>Pricing configuration</Label>
            <Select value={versionId} onValueChange={setVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version_number} — {v.seat_count} seats
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seat count */}
          <div className="space-y-2">
            <Label>Seat count</Label>
            <Input
              type="number"
              min={1}
              value={seatCount}
              onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!canAssign || isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
