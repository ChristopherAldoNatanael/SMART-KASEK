import {
  BarChart3,
  BookOpenText,
  Bot,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  MessagesSquare,
  School,
  Settings,
  Siren,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Role-based navigation (two app roles: principal + teacher).
 * Legacy 'admin' sees the principal menu for compatibility.
 * Pages NOT listed here remain reachable by URL but enforce their
 * own server-side authorization — hiding is UX only, never security.
 */

export type NavItem = { href: string; label: string; icon: LucideIcon };

const PRINCIPAL_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teachers", label: "Guru", icon: Users },
  { href: "/supervision", label: "Supervisi", icon: ClipboardList },
  { href: "/coaching", label: "Coaching", icon: MessagesSquare },
  { href: "/growth", label: "Teacher Growth", icon: TrendingUp },
  { href: "/learning", label: "Pembelajaran", icon: BookOpenText },
  { href: "/students", label: "Kesiswaan", icon: School },
  { href: "/administration", label: "Administrasi", icon: FolderKanban },
  { href: "/ai/coach", label: "AI Coach", icon: Bot },
  { href: "/ai/insight", label: "School Insight", icon: BarChart3 },
  { href: "/ai/early-warning", label: "Early Warning", icon: Siren },
  { href: "/ai/assistant", label: "AI Assistant", icon: Sparkles },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

/**
 * Teacher menu: only pages a teacher can actually open today.
 * /growth and /ai/* require principal server-side, so they are
 * intentionally excluded until teacher-scoped access lands (BACKLOG).
 */
const TEACHER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profil", label: "Profil Saya", icon: UserRound },
  { href: "/supervision", label: "Supervisi", icon: ClipboardList },
  { href: "/coaching", label: "Coaching", icon: MessagesSquare },
  { href: "/learning", label: "Pembelajaran", icon: BookOpenText },
];

export function getNavItems(role: string | null | undefined): NavItem[] {
  if (role === "principal" || role === "admin") return PRINCIPAL_NAV;
  return TEACHER_NAV;
}
