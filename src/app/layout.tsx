import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "FootPriv — Discreto. Anônimo. Lucrativo.",
  description: "PROJETO ACADÊMICO FICTÍCIO. Marketplace simulado.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Google Ads tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17953773434"
          strategy="afterInteractive"
        />
        <Script id="google-ads-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17953773434');
          `}
        </Script>
      </head>
      <body className="bg-ink-950 text-bone-100">
        <main className="relative">{children}</main>
      </body>
    </html>
  );
}
