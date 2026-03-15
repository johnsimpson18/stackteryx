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
import { OrgVendorForm } from "./org-vendor-form";
import { Pencil } from "lucide-react";
import type { OrgVendor, GlobalVendor } from "@/lib/types";

interface VendorEditButtonProps {
  vendor: OrgVendor;
  globalVendors: GlobalVendor[];
}

export function VendorEditButton({ vendor, globalVendors }: VendorEditButtonProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit Vendor
      </Button>
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Vendor</SheetTitle>
          </SheetHeader>
          <OrgVendorForm
            vendor={vendor}
            globalVendors={globalVendors}
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
