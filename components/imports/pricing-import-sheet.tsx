"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PricingImportDropzone } from "./pricing-import-dropzone";
import { ImportPreview } from "./import-preview";
import { ImportSuccess } from "./import-success";
import type { ExtractedVendor } from "@/lib/types";

type ImportStep = "upload" | "preview" | "success";

interface PricingImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingImportSheet({ open, onOpenChange }: PricingImportSheetProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [importId, setImportId] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedVendor[]>([]);
  const [summary, setSummary] = useState<{
    vendors_created: number;
    cost_models_created: number;
  } | null>(null);

  const handleExtracted = useCallback(
    (data: {
      importId: string;
      extracted: ExtractedVendor[];
      vendorCount: number;
      costModelCount: number;
    }) => {
      setImportId(data.importId);
      setExtracted(data.extracted);
      setStep("preview");
    },
    []
  );

  const handleConfirmed = useCallback(
    (result: { vendors_created: number; cost_models_created: number }) => {
      setSummary(result);
      setStep("success");
    },
    []
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep("upload");
      setImportId(null);
      setExtracted([]);
      setSummary(null);
    }, 300);
  }, [onOpenChange]);

  const handleDiscard = useCallback(() => {
    setStep("upload");
    setImportId(null);
    setExtracted([]);
  }, []);

  return (
    <Sheet open={open} onOpenChange={(v) => {
      if (!v) handleClose();
      else onOpenChange(v);
    }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {step === "upload" && "Import Pricing Spreadsheet"}
            {step === "preview" && "Review Import"}
            {step === "success" && "Import Complete"}
          </SheetTitle>
          <SheetDescription>
            {step === "upload" &&
              "Upload your vendor pricing spreadsheet and we'll extract the data automatically."}
            {step === "preview" &&
              "Review the extracted pricing data before importing."}
            {step === "success" && "Your vendor data has been imported."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {step === "upload" && (
            <PricingImportDropzone onExtracted={handleExtracted} />
          )}

          {step === "preview" && importId && (
            <ImportPreview
              importId={importId}
              extracted={extracted}
              onConfirmed={handleConfirmed}
              onDiscard={handleDiscard}
            />
          )}

          {step === "success" && summary && (
            <ImportSuccess
              vendorsCreated={summary.vendors_created}
              costModelsCreated={summary.cost_models_created}
              onClose={handleClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
