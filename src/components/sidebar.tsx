"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getNavItems, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

export type SchoolBrand = {
  name: string;
  logoUrl: string | null;
  logoSize: number | null;
} | null;

function NavLinks({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onMouseEnter={() => router.prefetch(item.href)}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={cn(
              "group relative flex items-center rounded-lg py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50",
              collapsed ? "justify-center px-0" : "px-2.5",
              isActive
                ? "bg-emerald-800/[0.07] text-emerald-900"
                : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-emerald-700 transition-opacity",
                isActive ? "opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                !collapsed && "mr-2.5",
                isActive
                  ? "bg-emerald-700 text-white"
                  : "bg-slate-900/[0.05] text-slate-500 group-hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}

function BrandMark({
  collapsed,
  school,
}: {
  collapsed?: boolean;
  school?: SchoolBrand;
}) {
  const size = Math.min(64, Math.max(24, school?.logoSize ?? 36));
  return (
    <div className={cn(collapsed && "flex justify-center")}>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          collapsed && "border-transparent bg-transparent px-0 shadow-none"
        )}
      >
        {school?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={school.logoUrl}
            alt={
              school.name ? `Logo ${school.name}` : "Logo sekolah"
            }
            style={{ height: size, width: "auto", maxWidth: collapsed ? 44 : 150 }}
            className="shrink-0 rounded object-contain"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700">
            <GraduationCap className="h-[18px] w-[18px] text-white" aria-hidden />
          </span>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight tracking-tight text-foreground">
              {school?.name || "SMART KASEK"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {school?.name ? "SMART KASEK" : "Manajemen Sekolah"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarBody({
  role,
  collapsed,
  school,
  onNavigate,
}: {
  role?: string | null;
  collapsed?: boolean;
  school?: SchoolBrand;
  onNavigate?: () => void;
}) {
  const items = getNavItems(role);
  // Kelola (operasional) vs Sistem (administratif) — visual saja.
  const manageHrefs = new Set([
    "/teachers",
    "/supervision",
    "/coaching",
    "/growth",
    "/learning",
    "/students",
    "/kenaikan-kelas",
    "/profil",
  ]);
  const manage = items.filter((i) => manageHrefs.has(i.href));
  const system = items.filter((i) => !manageHrefs.has(i.href) && i.href !== "/dashboard");
  const home = items.filter((i) => i.href === "/dashboard");

  return (
    <>
      <div className="space-y-0.5">
        <NavLinks items={home} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      {manage.length > 0 && (
        <div>
          {!collapsed && (
            <p className="px-2.5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Kelola
            </p>
          )}
          {collapsed && <div className="mx-2 border-t border-border" aria-hidden />}
          <div className={cn("space-y-0.5", collapsed && "pt-2")}>
            <NavLinks items={manage} collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        </div>
      )}
      {system.length > 0 && (
        <div>
          {!collapsed && (
            <p className="px-2.5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Sistem
            </p>
          )}
          {collapsed && <div className="mx-2 border-t border-border" aria-hidden />}
          <div className={cn("space-y-0.5", collapsed && "pt-2")}>
            <NavLinks items={system} collapsed={collapsed} onNavigate={onNavigate} />
          </div>
        </div>
      )}
    </>
  );
}

export function Sidebar({
  role,
  collapsed,
  school,
}: {
  role?: string | null;
  collapsed?: boolean;
  school?: SchoolBrand;
}) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex print:hidden",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      <div className="px-3 pb-4 pt-4">
        <BrandMark collapsed={collapsed} school={school} />
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 pb-6 [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.15)_transparent]">
        <SidebarBody role={role} collapsed={collapsed} school={school} />
      </nav>
      <div className="border-t border-border px-5 py-3.5">
        {!collapsed ? (
          <p className="truncate text-[11px] text-muted-foreground">
            Data → Tindakan → Perkembangan
          </p>
        ) : (
          <div className="mx-auto h-1 w-1 rounded-full bg-border" aria-hidden />
        )}
      </div>
    </aside>
  );
}

export function SidebarDrawer({
  role,
  open,
  onClose,
  school,
}: {
  role?: string | null;
  open: boolean;
  onClose: () => void;
  school?: SchoolBrand;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 md:hidden print:hidden",
        !open && "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-label="Menu navigasi"
      >
        <div className="px-3 pb-2 pt-4">
          <BrandMark school={school} />
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
          <SidebarBody role={role} school={school} onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}
