"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Layers, FileText, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/constants";
import { useState } from "react";

const BOTTOM_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tools", href: "/stack-catalog", icon: Layers },
  { label: "Services", href: "/services", icon: Package },
  { label: "Studio", href: "/sales-studio", icon: FileText },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex md:hidden h-14 items-center justify-around border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {BOTTOM_TABS.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/dashboard" && pathname.startsWith(tab.href + "/"));
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center gap-0.5 text-[10px] transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {tab.label}
          </Link>
        );
      })}

      {/* More menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground">
          <Menu className="h-5 w-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="grid grid-cols-3 gap-3 p-2">
            {NAV_ITEMS.filter(
              (item) => !BOTTOM_TABS.some((t) => t.href === item.href)
            ).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-lg p-3 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
