"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { archiveBundleAction } from "@/actions/bundles";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { useState } from "react";

interface ArchiveButtonProps {
  bundleId: string;
  bundleName: string;
}

export function ArchiveButton({ bundleId, bundleName }: ArchiveButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveBundleAction(bundleId);
      if (result.success) {
        toast.success(`"${bundleName}" has been archived`);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Archive className="h-3 w-3 mr-1" />
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Service</DialogTitle>
          <DialogDescription>
            Are you sure you want to archive &quot;{bundleName}&quot;? This
            service will no longer appear in active listings. Existing
            configurations will be preserved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={isPending}
          >
            {isPending ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
