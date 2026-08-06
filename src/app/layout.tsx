import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { DbProvider } from "@/components/providers/DbProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Yono Workout",
  description: "Your personal AI-assisted workout companion. Log workouts, track progress, and train smarter.",
  manifest: "/manifest.json",
  keywords: ["workout", "fitness", "gym", "training", "tracker"],
  authors: [{ name: "Yono Workout" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yono Workout",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "Yono Workout",
    description: "Your personal AI-assisted workout companion",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c28" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <DbProvider>
            {/* Desktop layout: sidebar + content */}
            <div className="flex min-h-screen">
              {/* Desktop sidebar (hidden on mobile) */}
              <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
                <DesktopSidebar />
              </aside>

              {/* Main content */}
              <main className="flex-1 lg:ml-64">
                <div className="min-h-screen max-w-2xl mx-auto lg:max-w-3xl">
                  {children}
                </div>
              </main>
            </div>

            {/* Mobile bottom navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
              <BottomNav />
            </div>
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Desktop sidebar — only shown on large screens
function DesktopSidebar() {
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl">🐾</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-foreground text-lg">Yono</h1>
            <p className="text-xs text-muted-foreground">Workout</p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-4 space-y-1">
        <SidebarLink href="/today" icon="🏠" label="Today" />
        <SidebarLink href="/history" icon="📅" label="History" />
        <SidebarLink href="/coach" icon="💬" label="Coach" />
        <SidebarLink href="/progress" icon="📈" label="Progress" />
        <SidebarLink href="/exercises" icon="💪" label="Exercises" />
        <SidebarLink href="/gyms" icon="🏋️" label="Gyms" />
      </nav>

      {/* Profile at bottom */}
      <div className="p-4 border-t border-sidebar-border">
        <SidebarLink href="/profile" icon="👤" label="Profile" />
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm font-medium"
    >
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  );
}
