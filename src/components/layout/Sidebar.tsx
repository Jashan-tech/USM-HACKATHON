'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Sun,
  Moon,
  Shield,
  ClipboardList,
  Home,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getInitials } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  role: 'doctor' | 'patient' | 'staff';
  userName: string;
  userEmail: string;
  unreadMessages?: number;
  pendingTasks?: number;
}

export function Sidebar({
  role,
  userName,
  userEmail,
  unreadMessages = 0,
  pendingTasks = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const supabase = createBrowserSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Define navigation items based on role
  const navItems: NavItem[] = (() => {
    switch (role) {
      case 'doctor':
        return [
          {
            label: 'Dashboard',
            href: '/dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />,
          },
          {
            label: 'Referrals',
            href: '/referrals',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Staff Requests',
            href: '/staff-requests',
            icon: <ClipboardList className="w-5 h-5" />,
            badge: pendingTasks > 0 ? pendingTasks : undefined,
          },
          {
            label: 'Messages',
            href: '/doctor/messages',
            icon: <MessageSquare className="w-5 h-5" />,
            badge: unreadMessages > 0 ? unreadMessages : undefined,
          },
          {
            label: 'Settings',
            href: '/doctor/settings',
            icon: <Settings className="w-5 h-5" />,
          },
        ];
      case 'patient':
        return [
          {
            label: 'Home',
            href: '/home',
            icon: <Home className="w-5 h-5" />,
          },
          {
            label: 'My Referrals',
            href: '/referrals',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Messages',
            href: '/patient/messages',
            icon: <MessageSquare className="w-5 h-5" />,
            badge: unreadMessages > 0 ? unreadMessages : undefined,
          },
          {
            label: 'Settings',
            href: '/patient/settings',
            icon: <Settings className="w-5 h-5" />,
          },
        ];
      case 'staff':
        return [
          {
            label: 'Task Queue',
            href: '/queue',
            icon: <ClipboardList className="w-5 h-5" />,
            badge: pendingTasks > 0 ? pendingTasks : undefined,
          },
          {
            label: 'All Referrals',
            href: '/referrals',
            icon: <FileText className="w-5 h-5" />,
          },
          {
            label: 'Settings',
            href: '/staff/settings',
            icon: <Settings className="w-5 h-5" />,
          },
        ];
      default:
        return [];
    }
  })();

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Refree
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-nav-item',
                pathname === item.href && 'active'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Quick Actions Section */}
        {role === 'doctor' && (
          <div className="mt-6 px-3">
            <p className="sidebar-section-title">Quick Actions</p>
            <Link href="/referrals/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <FileText className="w-4 h-4" />
                New Referral
              </Button>
            </Link>
          </div>
        )}

        {role === 'patient' && (
          <div className="mt-6 px-3">
            <p className="sidebar-section-title">Need Help?</p>
            <Button variant="outline" className="w-full justify-start gap-2">
              <HelpCircle className="w-4 h-4" />
              Contact Support
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-200/70 dark:hover:bg-gray-800/70 transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-blue-500 text-white text-sm">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${role}/settings`)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Light Mode
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark Mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
