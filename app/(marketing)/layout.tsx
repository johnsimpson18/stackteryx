import { MarketingNav } from "@/components/marketing/marketing-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
