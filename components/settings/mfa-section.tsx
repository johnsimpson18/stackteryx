"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type EnrollState =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "qr"; factorId: string; qrCode: string; secret: string }
  | { step: "verifying" }
  | { step: "done" };

export function MFASection() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollState, setEnrollState] = useState<EnrollState>({ step: "idle" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Check enrollment status on mount
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const factors = data?.totp ?? [];
      if (factors.length > 0) {
        setEnrolled(true);
        setFactorId(factors[0].id);
      } else {
        setEnrolled(false);
      }
    });
  }, []);

  async function startEnrollment() {
    setEnrollState({ step: "loading" });
    setSheetOpen(true);
    setCode("");
    setError("");

    const supabase = createBrowserSupabaseClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    if (enrollError || !data) {
      setError(enrollError?.message ?? "Failed to start enrollment");
      setEnrollState({ step: "idle" });
      return;
    }

    setEnrollState({
      step: "qr",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function verifyEnrollment() {
    if (enrollState.step !== "qr" || code.length !== 6) return;

    setEnrollState((prev) =>
      prev.step === "qr" ? { ...prev, step: "qr" } : prev
    );
    setError("");

    const supabase = createBrowserSupabaseClient();
    const fId = enrollState.factorId;

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId: fId });

    if (challengeError || !challengeData) {
      setError("Failed to create challenge. Please try again.");
      setCode("");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: fId,
      challengeId: challengeData.id,
      code,
    });

    if (verifyError) {
      setError("Incorrect code. Please try again.");
      setCode("");
      codeInputRef.current?.focus();
      return;
    }

    setEnrolled(true);
    setFactorId(fId);
    setEnrollState({ step: "done" });
  }

  async function removeEnrollment() {
    if (!factorId) return;
    setRemoving(true);

    const supabase = createBrowserSupabaseClient();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (unenrollError) {
      setError(unenrollError.message);
      setRemoving(false);
      return;
    }

    setEnrolled(false);
    setFactorId(null);
    setRemoving(false);
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && enrollState.step === "qr") {
      verifyEnrollment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (enrolled === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrolled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">
                  Enabled &mdash; your account is protected with an authenticator app.
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={removing}>
                    {removing ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-1" />Removing...</>
                    ) : (
                      "Remove Two-Factor Authentication"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove two-factor authentication?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reduce your account security. You can re-enable it at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={removeEnrollment}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Add an extra layer of security to your account.
                </span>
              </div>
              <Button size="sm" onClick={startEnrollment}>
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => {
        if (!open && enrollState.step !== "done") {
          // If closing without completing, unenroll the pending factor
          if (enrollState.step === "qr") {
            const supabase = createBrowserSupabaseClient();
            supabase.auth.mfa.unenroll({ factorId: enrollState.factorId });
          }
        }
        setSheetOpen(open);
        if (!open) {
          setEnrollState({ step: "idle" });
          setCode("");
          setError("");
        }
      }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Set up two-factor authentication</SheetTitle>
            <SheetDescription>
              Use an authenticator app like Google Authenticator, Authy, or 1Password
              to scan the QR code below.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {enrollState.step === "loading" && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {enrollState.step === "qr" && (
              <>
                {/* QR Code */}
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={enrollState.qrCode}
                    alt="Scan this QR code with your authenticator app"
                    className="rounded-lg"
                    style={{ width: 200, height: 200 }}
                  />
                </div>

                {/* Manual secret */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Can&apos;t scan? Enter this code manually:
                  </p>
                  <code className="block p-3 rounded-md bg-muted text-sm font-mono break-all select-all">
                    {enrollState.secret}
                  </code>
                </div>

                {/* Verification input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Enter the 6-digit code from your app
                  </label>
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setCode(val);
                      setError("");
                    }}
                    className="w-full h-12 px-4 rounded-md border bg-background text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    placeholder="000000"
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={verifyEnrollment}
                  disabled={code.length !== 6}
                >
                  Confirm
                </Button>
              </>
            )}

            {enrollState.step === "done" && (
              <div className="text-center space-y-4 py-8">
                <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium">
                  Two-factor authentication is now enabled.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                >
                  Done
                </Button>
              </div>
            )}

            {enrollState.step === "idle" && error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
