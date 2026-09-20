import {
  Award,
  BookOpenText,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  MessagesSquare,
  School,
  Settings,
  Target,
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
  { href: "/kenaikan-kelas", label: "Kenaikan Kelas", icon: Award },
  { href: "/administration", label: "Administrasi", icon: FolderKanban },
  { href: "/programs", label: "Program Sekolah", icon: Target },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

/**
 * Teacher menu: only pages a teacher can actually open.
 * /growth is teacher-scoped (own snapshots only, enforced server-side).
 */
const TEACHER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profil", label: "Profil Saya", icon: UserRound },
  { href: "/growth", label: "Teacher Growth", icon: TrendingUp },
  { href: "/supervision", label: "Supervisi", icon: ClipboardList },
  { href: "/coaching", label: "Coaching", icon: MessagesSquare },
  { href: "/learning", label: "Pembelajaran", icon: BookOpenText },
  { href: "/students", label: "Kesiswaan", icon: School },
  { href: "/kenaikan-kelas", label: "Kenaikan Kelas", icon: Award },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export function getNavItems(role: string | null | undefined): NavItem[] {
  if (role === "principal" || role === "admin") return PRINCIPAL_NAV;
  return TEACHER_NAV;
}
