"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Log In", href: "/login" },
  { label: "Sign Up", href: "/login?tab=signup" },
] as const;

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 bg-background/80 backdrop-blur-md border-b border-border/40">
      <Link
        href="/fractional-cto"
        className="flex items-center gap-0 text-lg font-bold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span className="text-foreground">STACK</span>
        <span className="text-primary">TERYX</span>
      </Link>

      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <Link
          href="/fractional-cto"
          className="px-3 py-1.5 text-sm font-semibold rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          Free CTO Brief
        </Link>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              item.label === "Sign Up"
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="sm:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-white/5 transition-colors"
      >
        {mobileOpen ? (
          <X className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Menu className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute top-14 left-0 right-0 sm:hidden bg-background border-b border-border/40 px-6 py-4 space-y-2">
          <Link
            href="/fractional-cto"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-primary rounded-md hover:bg-primary/10 transition-colors"
          >
            Free CTO Brief
          </Link>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-white/5 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
