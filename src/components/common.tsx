import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------- Header --------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            "text-xl font-bold leading-tight tracking-tight text-foreground",
            eyebrow && "mt-1"
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ----------------------------------- Stat ---------------------------------- */

type StatTone = "default" | "brand" | "danger";

export function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            tone === "brand" && "bg-brand/10 text-brand",
            tone === "danger" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="tnum mt-2 text-[28px] font-bold leading-none tracking-tight">
        {value}
      </p>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/* ---------------------------------- Empty ---------------------------------- */

export function Empty({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  success:
    "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  info: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20",
  brand: "bg-brand/10 text-brand ring-1 ring-inset ring-brand/25",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_STYLES[tone]
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------- Panel ---------------------------------- */

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:p-6",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold leading-tight">{title}</h3>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------------------------- Table ---------------------------------- */

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-4 py-3", className)}>{children}</th>;
}
