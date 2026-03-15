"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { X, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingBannerProps {
  bundleId: string;
  firstVersionId?: string;
}

export function OnboardingBanner({ bundleId, firstVersionId }: OnboardingBannerProps) {
  const router = useRouter();
  const pathname = usePathname();

  function dismiss() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-5">
      <Button
        variant="ghost"
        size="icon"
        onClick={dismiss}
        className="absolute top-3 right-3 h-6 w-6 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <h3 className="text-base font-semibold text-foreground mb-1">
        Your first service bundle is ready!
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Here&apos;s what you can do next:
      </p>

      <ul className="space-y-2.5">
        <li>
          <Link
            href="/services/new"
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            Create another service bundle
          </Link>
        </li>
        <li>
          <Link
            href={
              firstVersionId
                ? `/services/${bundleId}/versions/${firstVersionId}?tab=enablement`
                : `/services/${bundleId}`
            }
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Generate a sales enablement package
          </Link>
        </li>
        <li>
          <Link
            href="/clients/new"
            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-primary" />
            Add a client and create a quote
          </Link>
        </li>
      </ul>
    </div>
  );
}
