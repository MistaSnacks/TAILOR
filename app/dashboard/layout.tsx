'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import { User, FileText, Sparkles, Files, MessageSquare, LayoutGrid, ChevronLeft, ChevronRight, BarChart3, GraduationCap } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stats, setStats] = useState({ documentsCount: 0, resumesCount: 0 });

  // Load collapsed state from local storage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/documents', label: 'Documents', icon: FileText },
    { href: '/dashboard/generate', label: 'Generate Resume', icon: Sparkles },
    { href: '/dashboard/resumes', label: 'My Resumes', icon: Files },
    { href: '/dashboard/chat', label: 'Coach', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${isCollapsed ? 'w-20' : 'w-64'} min-h-screen border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out flex flex-col`}
        >
          {/* Header */}
          <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-2`}>
            {!isCollapsed && (
              <Link href="/" className="font-display text-2xl font-bold tracking-tight block group">
                T<span className="text-primary group-hover:text-primary/80 transition-colors">AI</span>LOR
              </Link>
            )}
            {isCollapsed && (
              <Link href="/" className="font-display text-2xl font-bold tracking-tight block group">
                T
              </Link>
            )}
            {!isCollapsed && <ThemeToggle />}
          </div>

          {/* Navigation */}
          <nav className="px-3 space-y-1 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : ''}
                  className={`relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors duration-200 group overflow-hidden ${isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / User Info */}
          <div className="p-4 border-t border-border/50 mt-auto">
            {user && (
              <div className={`rounded-xl bg-card border border-border shadow-sm ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
                {!isCollapsed ? (
                  <>
                    <div className="text-xs font-medium text-muted-foreground truncate mb-3">
                      {user.email}
                    </div>
                    <button
                      onClick={signOut}
                      className="w-full px-3 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={signOut}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <User className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={toggleSidebar}
              className="w-full mt-4 flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`flex-1 ${isCollapsed ? 'ml-20' : 'ml-64'} p-8 min-h-screen bg-grid-pattern bg-fixed transition-all duration-300 ease-in-out`}
        >
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
