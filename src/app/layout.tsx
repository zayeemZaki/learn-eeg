import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// Display typeface for the headline and brand mark only. Exposed as a CSS
// variable so it can be opted into per-element; the body font is unchanged.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EEG Quiz — Pattern mastery for EEG readers",
    template: "%s — EEG Quiz",
  },
  description: "Pattern mastery for EEG readers: practice EEG interpretation, browse the atlas, and follow the latest epilepsy literature.",
  // Browser tab / bookmark / apple-touch icon all use the brand logo.
  icons: { icon: "/logo.jpg", apple: "/logo.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      {/*
        Browser extensions (e.g. Grammarly) inject data-* attributes onto
        <body> before React hydrates, producing a spurious hydration-mismatch
        warning. Scoped to this one element, this suppresses only those
        attribute diffs — child mismatches are still reported.
      */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
