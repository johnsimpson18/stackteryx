"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientForm } from "./client-form";
import { Pencil } from "lucide-react";
import type { Client } from "@/lib/types";

interface ClientEditButtonProps {
  client: Client;
}

export function ClientEditButton({ client }: ClientEditButtonProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-3 w-3 mr-1" />
        Edit
      </Button>
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Client</SheetTitle>
          </SheetHeader>
          <ClientForm
            client={client}
            onSuccess={() => {
              setEditOpen(false);
              router.refresh();
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
