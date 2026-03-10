"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedVendor } from "@/lib/types";

interface PricingImportDropzoneProps {
  onExtracted: (data: {
    importId: string;
    extracted: ExtractedVendor[];
    vendorCount: number;
    costModelCount: number;
  }) => void;
}

export function PricingImportDropzone({ onExtracted }: PricingImportDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import/parse-pricing", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error || "Upload failed");
          return;
        }

        onExtracted(json);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [onExtracted]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-all",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-primary/3",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <p className="text-sm font-medium text-foreground">
              Analyzing {fileName}...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AI is extracting vendor pricing data
            </p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              {fileName ? (
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop your file here" : "Drop a pricing spreadsheet here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse. Supports .xlsx, .xls, .csv (max 10MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        AI-powered extraction by Claude. Results should be reviewed before confirming.
      </p>
    </div>
  );
}
