'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ImageIcon,
  MessageSquare,
  FileText,
  CalendarDays,
  Settings,
  Users,
  Menu,
  X,
  ChevronDown,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/lib/admin-auth';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requiredPermission?: 'content' | 'reservations' | 'settings' | 'admin';
  children?: Omit<NavItem, 'icon' | 'children'>[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { canManageContent, canManageReservations, canManageSettings, canManageUsers } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['settings']);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: 'Menu',
      href: '/admin/menu',
      icon: <UtensilsCrossed className="h-5 w-5" />,
      requiredPermission: 'content',
    },
    {
      label: 'Gallery',
      href: '/admin/gallery',
      icon: <ImageIcon className="h-5 w-5" />,
      requiredPermission: 'content',
    },
    {
      label: 'Testimonials',
      href: '/admin/testimonials',
      icon: <MessageSquare className="h-5 w-5" />,
      requiredPermission: 'content',
    },
    {
      label: 'Blog',
      href: '/admin/blog',
      icon: <FileText className="h-5 w-5" />,
      requiredPermission: 'content',
    },
    {
      label: 'Reservations',
      href: '/admin/reservations',
      icon: <CalendarDays className="h-5 w-5" />,
      requiredPermission: 'reservations',
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: <Settings className="h-5 w-5" />,
      requiredPermission: 'settings',
      children: [
        { label: 'Hours', href: '/admin/settings/hours' },
        { label: 'Reservations', href: '/admin/settings/reservations' },
      ],
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: <Users className="h-5 w-5" />,
      requiredPermission: 'admin',
    },
  ];

  const hasPermission = (item: NavItem): boolean => {
    switch (item.requiredPermission) {
      case 'content':
        return canManageContent;
      case 'reservations':
        return canManageReservations;
      case 'settings':
        return canManageSettings;
      case 'admin':
        return canManageUsers;
      default:
        return true;
    }
  };

  const visibleNavItems = navItems.filter(hasPermission);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  const SidebarContent = () => (
    <nav className="space-y-1 p-4">
      {visibleNavItems.map((item) => {
        const active = isActive(item.href);
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedSections.includes(item.label);

        return (
          <div key={item.href}>
            {hasChildren ? (
              <>
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-active text-sidebar-active-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-hover'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive(child.href)
                            ? 'bg-sidebar-hover text-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-hover'
                        )}
                      >
                        {child.label === 'Hours' && <Clock className="h-4 w-4" />}
                        {child.label === 'Reservations' && <SlidersHorizontal className="h-4 w-4" />}
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-active text-sidebar-active-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-hover'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-primary p-2 text-white lg:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 transform bg-sidebar shadow-lg transition-transform lg:static lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6">
            <Link href="/admin" className="text-xl font-bold text-foreground">
              Admin Panel
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarContent />
          </div>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <p className="text-xs text-muted-foreground">
              Restaurant Management System
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
