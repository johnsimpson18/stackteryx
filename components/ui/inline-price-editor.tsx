"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";

interface InlinePriceEditorProps {
  value: number;
  unit: string;
  onSave: (value: number) => Promise<{ success: boolean; error?: string }>;
  onChangePreview?: (value: number) => void;
  fieldLabel?: string;
  disabled?: boolean;
  min?: number;
  className?: string;
}

export function InlinePriceEditor({
  value,
  unit,
  onSave,
  onChangePreview,
  fieldLabel,
  disabled,
  min = 0,
  className,
}: InlinePriceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes when not editing
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  // Auto-focus + select-all on edit
  useEffect(() => {
    if (editing) {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [editing]);

  function enterEdit() {
    if (disabled || isPending) return;
    setDraft(String(value));
    setEditing(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setDraft(v);
    if (onChangePreview) {
      const n = parseFloat(v);
      if (!isNaN(n)) onChangePreview(n);
    }
  }

  function cancel() {
    setEditing(false);
    setDraft(String(value));
    if (onChangePreview) onChangePreview(value);
  }

  function save() {
    const n = parseFloat(draft);
    if (isNaN(n) || n < min) {
      toast.error(`Value must be ≥ ${min}`);
      return;
    }
    if (n === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await onSave(n);
      if (result.success) {
        setEditing(false);
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  // Width based on character count
  const charWidth = Math.max(draft.length, 3) + 2;

  if (editing) {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-0.5",
          isPending && "animate-pulse",
          className,
        )}
      >
        <span className="text-muted-foreground font-mono text-sm">$</span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min={min}
          value={draft}
          onChange={handleChange}
          onBlur={save}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          aria-label={fieldLabel ?? "Price"}
          className="bg-transparent font-mono text-sm text-foreground outline-none border-b border-[#A8FF3E] appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ width: `${charWidth}ch` }}
        />
        {unit && (
          <span className="text-muted-foreground text-sm">{unit}</span>
        )}
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enterEdit}
      disabled={disabled}
      className={cn(
        "group inline-flex items-baseline gap-0.5 cursor-pointer text-left",
        disabled && "cursor-default",
        className,
      )}
    >
      <span className="font-mono text-sm">{formatCurrency(value)}</span>
      {unit && (
        <span className="text-muted-foreground text-sm">{unit}</span>
      )}
      {!disabled && (
        <Pencil className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-40 transition-opacity text-[#A8FF3E]" />
      )}
    </button>
  );
}
