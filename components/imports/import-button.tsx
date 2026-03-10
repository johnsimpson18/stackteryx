"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingImportSheet } from "./pricing-import-sheet";

interface ImportButtonProps {
  variant?: "default" | "outline";
}

export function ImportButton({ variant = "outline" }: ImportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Import Spreadsheet
      </Button>
      <PricingImportSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
