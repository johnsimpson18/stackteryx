"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Library } from "lucide-react";
import { ImportButton } from "@/components/imports/import-button";
import { VendorLibraryModal } from "./vendor-library-modal";
import type { OrgVendorWithMeta } from "@/lib/types";

interface VendorPageActionsProps {
  vendors: OrgVendorWithMeta[];
}

export function VendorPageActions({ vendors }: VendorPageActionsProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const existingVendorNames = useMemo(
    () => new Set(vendors.map((v) => v.display_name.toLowerCase())),
    [vendors]
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <ImportButton />
        <Button variant="outline" onClick={() => setLibraryOpen(true)}>
          <Library className="h-4 w-4 mr-2" />
          Add from Library
        </Button>
        <Button asChild>
          <Link href="/vendors/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor Manually
          </Link>
        </Button>
      </div>

      <VendorLibraryModal
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        existingVendorNames={existingVendorNames}
      />
    </>
  );
}
