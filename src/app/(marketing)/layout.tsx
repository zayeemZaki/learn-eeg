import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

/**
 * Shell for all public marketing pages: sticky header, the page content, then
 * the footer. Pages under (marketing) own only their own content and inherit
 * this chrome, so a future marketing page needs no header/footer wiring.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
