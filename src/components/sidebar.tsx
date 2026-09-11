"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getNavItems, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

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
              "flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors",
              collapsed ? "justify-center px-0" : "px-3",
              isActive
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon
              className={cn("h-[18px] w-[18px] shrink-0", !collapsed && "mr-2.5")}
              aria-hidden
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && (
              <span
                className={cn(
                  "ml-auto h-1.5 w-1.5 shrink-0 rounded-full",
                  isActive ? "bg-emerald-400" : "bg-transparent"
                )}
                aria-hidden
              />
            )}
          </Link>
        );
      })}
    </>
  );
}

function BrandMark({
  collapsed,
  logoUrl,
  logoSize,
  schoolName,
}: {
  collapsed?: boolean;
  logoUrl?: string | null;
  logoSize?: number | null;
  schoolName?: string;
}) {
  const size = Math.min(64, Math.max(24, logoSize ?? 36));
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-5 pb-5 pt-6",
        collapsed && "justify-center px-0"
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={schoolName ? `Logo ${schoolName}` : "Logo sekolah"}
          style={{ height: size, width: "auto", maxWidth: collapsed ? 44 : 160 }}
          className="shrink-0 rounded-md object-contain"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700">
          <GraduationCap className="h-5 w-5 text-white" aria-hidden />
        </span>
      )}
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-white">
            {schoolName || "SMART KASEK"}
          </p>
          <p className="text-[11px] text-slate-400">Manajemen Sekolah</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  role,
  collapsed,
  school,
}: {
  role?: string | null;
  collapsed?: boolean;
  school?: { name: string; logoUrl: string | null; logoSize: number | null } | null;
}) {
  const items = getNavItems(role);
  const main = items.filter((i) => !i.href.startsWith("/ai"));
  const ai = items.filter((i) => i.href.startsWith("/ai"));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-[#101828] transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      <BrandMark
        collapsed={collapsed}
        logoUrl={school?.logoUrl}
        logoSize={school?.logoSize}
        schoolName={school?.name}
      />
      <nav className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 pb-6">
        <div className="space-y-0.5">
          <NavLinks items={main} collapsed={collapsed} />
        </div>
        {ai.length > 0 && !collapsed && (
          <div>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Kecerdasan
            </p>
            <div className="space-y-0.5">
              <NavLinks items={ai} collapsed={collapsed} />
            </div>
          </div>
        )}
        {ai.length > 0 && collapsed && (
          <div className="space-y-0.5 border-t border-white/10 pt-5">
            <NavLinks items={ai} collapsed={collapsed} />
          </div>
        )}
      </nav>
      {!collapsed && (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-slate-500">
            Data → Insight → Tindakan → Perkembangan
          </p>
        </div>
      )}
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
  school?: { name: string; logoUrl: string | null; logoSize: number | null } | null;
}) {
  const items = getNavItems(role);
  const main = items.filter((i) => !i.href.startsWith("/ai"));
  const ai = items.filter((i) => i.href.startsWith("/ai"));

  return (
    <div
      className={cn("fixed inset-0 z-50 md:hidden", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#101828] shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-label="Menu navigasi"
      >
        <BrandMark
          logoUrl={school?.logoUrl}
          logoSize={school?.logoSize}
          schoolName={school?.name}
        />
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          <div className="space-y-0.5">
            <NavLinks items={main} onNavigate={onClose} />
          </div>
          {ai.length > 0 && (
            <div>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Kecerdasan
              </p>
              <div className="space-y-0.5">
                <NavLinks items={ai} onNavigate={onClose} />
              </div>
            </div>
          )}
        </nav>
      </aside>
    </div>
  );
}
