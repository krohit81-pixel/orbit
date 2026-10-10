import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

// Applies the saved theme and look (v2.2) before first paint, so neither flashes on load.
const THEME_INIT_SCRIPT = `try{var c=document.documentElement.classList;if(localStorage.getItem('orbit-theme')==='dark')c.add('dark');var l=localStorage.getItem('orbit-look');if(l==='rainbow'||l==='wild')c.add('rb');if(l==='wild')c.add('wild')}catch(e){}`;

export const metadata: Metadata = {
  title: "Orbit",
  description: "The people and topics in your orbit — synthesized from your conversations.",
  appleWebApp: {
    capable: true,
    title: "Orbit",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FBFAF8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
