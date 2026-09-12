"use client";

import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { Sidebar, SidebarDrawer } from "./sidebar";
import { Toaster } from "./toaster";

const COLLAPSE_KEY = "smart-kasek:sidebar-collapsed";

export function AppShell({
  role,
  roleLabel,
  fullName,
  school,
  children,
}: {
  role?: string | null;
  roleLabel: string;
  fullName: string;
  school?: { name: string; logoUrl: string | null; logoSize: number | null } | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // abaikan — default terbuka
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      } catch {
        // abaikan
      }
      return !prev;
    });
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} collapsed={collapsed} school={school} />
      <SidebarDrawer
        role={role}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        school={school}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Buka menu navigasi"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
                aria-pressed={collapsed}
                title={collapsed ? "Bentangkan sidebar" : "Ciutkan sidebar"}
                className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:block"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-5 w-5" aria-hidden />
                ) : (
                  <PanelLeftClose className="h-5 w-5" aria-hidden />
                )}
              </button>
              <p className="truncate text-sm text-muted-foreground">
                {fullName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {roleLabel}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  aria-label="Keluar dari aplikasi"
                  className="rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Keluar
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
