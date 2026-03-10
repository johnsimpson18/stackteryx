"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { reviewApprovalAction } from "@/actions/approvals";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { StatusBadge } from "@/components/shared/status-badge";
import { APPROVAL_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import type { ApprovalStatus, ApprovalWithMeta } from "@/lib/types";

interface ApprovalQueueProps {
  approvals: ApprovalWithMeta[];
  canManage: boolean;
}

function marginColor(margin: number | null): string {
  if (margin === null) return "text-muted-foreground";
  if (margin >= 0.25) return "text-emerald-600";
  if (margin >= 0.15) return "text-amber-600";
  return "text-red-600";
}

export function ApprovalQueue({ approvals, canManage }: ApprovalQueueProps) {
  const [filter, setFilter] = useState<ApprovalStatus | "all">("pending");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  function openReview(id: string, action: "approved" | "rejected") {
    setReviewingId(id);
    setReviewAction(action);
    setReviewNotes("");
  }

  function handleReview() {
    if (!reviewingId) return;
    startTransition(async () => {
      const result = await reviewApprovalAction(reviewingId, {
        status: reviewAction,
        review_notes: reviewNotes,
      });
      if (result.success) {
        toast.success(
          reviewAction === "approved" ? "Discount approved" : "Discount rejected"
        );
        setReviewingId(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(
              filter === f && f === "pending" && "bg-amber-600 hover:bg-amber-700"
            )}
          >
            {f === "all" ? "All" : APPROVAL_STATUS_LABELS[f]}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] px-1.5 py-0.5 font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            {filter === "pending"
              ? "No pending approvals. All discounts are within threshold."
              : "No approvals found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((approval) => (
            <Card
              key={approval.id}
              className={cn(
                "transition-colors",
                approval.status === "pending" &&
                  "border-amber-200 bg-amber-50/30"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: bundle info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {approval.bundle_name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        v{approval.version_number}
                      </span>
                      <StatusBadge status={approval.status} label={APPROVAL_STATUS_LABELS[approval.status]} />
                      <Link
                        href={`/services/${approval.bundle_id}/versions/${approval.bundle_version_id}`}
                        className="text-primary hover:text-primary/80"
                        title="View version"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {/* Pricing metrics */}
                    <div className="flex items-center gap-5 mt-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Discount
                        </p>
                        <p className="text-base font-bold text-red-600 font-mono">
                          {formatPercent(approval.discount_pct)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          Margin
                        </p>
                        <p
                          className={cn(
                            "text-base font-bold font-mono",
                            marginColor(approval.margin_pct)
                          )}
                        >
                          {approval.margin_pct !== null
                            ? formatPercent(approval.margin_pct)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                          MRR
                        </p>
                        <p className="text-base font-bold font-mono">
                          {approval.mrr !== null
                            ? formatCurrency(approval.mrr)
                            : "—"}
                        </p>
                      </div>
                      {approval.seat_count && (
                        <div>
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                            Seats
                          </p>
                          <p className="text-base font-bold font-mono">
                            {approval.seat_count}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        Requested by{" "}
                        <strong className="text-foreground">
                          {approval.requester_name}
                        </strong>{" "}
                        on{" "}
                        {new Date(approval.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                      {approval.notes && (
                        <span className="italic truncate max-w-xs">
                          &ldquo;{approval.notes}&rdquo;
                        </span>
                      )}
                    </div>

                    {/* Reviewer response */}
                    {approval.status !== "pending" && approval.reviewer_name && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span>
                          {approval.status === "approved" ? "Approved" : "Rejected"} by{" "}
                          <strong className="text-foreground">
                            {approval.reviewer_name}
                          </strong>
                          {approval.reviewed_at && (
                            <>
                              {" "}
                              on{" "}
                              {new Date(approval.reviewed_at).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric", year: "numeric" }
                              )}
                            </>
                          )}
                        </span>
                        {approval.review_notes && (
                          <span className="italic ml-2">
                            &ldquo;{approval.review_notes}&rdquo;
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: action buttons */}
                  {canManage && approval.status === "pending" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => openReview(approval.id, "rejected")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => openReview(approval.id, "approved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review dialog */}
      <Dialog
        open={!!reviewingId}
        onOpenChange={(open) => !open && setReviewingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approved" ? "Approve Discount" : "Reject Discount"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approved"
                ? "Confirm you are approving this discount request."
                : "Confirm you are rejecting this discount request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="review_notes">
                Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="review_notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === "approved"
                    ? "Approved — within acceptable range for this client..."
                    : "Rejected — margin too low, please revise..."
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewingId(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={isPending}
              className={
                reviewAction === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isPending
                ? "Saving..."
                : reviewAction === "approved"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
