'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { TutorialModal, useTutorial } from '@/components/tutorial-modal';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { motion } from 'framer-motion';
import {
  User,
  FileText,
  Sparkles,
  Files,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/generate', label: 'Generate Resume', icon: Sparkles },
  { href: '/dashboard/resumes', label: 'My Resumes', icon: Files },
  { href: '/dashboard/chat', label: 'Coach', icon: GraduationCap },
];

export function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { showTutorial, hasCheckedStorage, completeTutorial, closeTutorial, openTutorial } =
    useTutorial();

  // Load collapsed state from local storage with error handling
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState) {
        setIsCollapsed(JSON.parse(savedState));
      }
    } catch (error) {
      // Handle localStorage errors (e.g., disabled, quota exceeded, private browsing)
      console.warn('[Sidebar] Failed to load collapsed state from localStorage:', error);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      // Dispatch custom event for same-tab updates (more efficient than polling)
      window.dispatchEvent(new CustomEvent('sidebarToggle'));
    } catch (error) {
      // Handle localStorage errors (e.g., disabled, quota exceeded, private browsing)
      console.warn('[Sidebar] Failed to save collapsed state to localStorage:', error);
    }
  };

  return (
    <>
      <aside
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } min-h-screen border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Header */}
        <div
          className={`p-6 flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } mb-2`}
        >
          {!isCollapsed && (
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tight block group"
            >
              T
              <span className="text-primary group-hover:text-primary/80 transition-colors">
                AI
              </span>
              LOR
            </Link>
          )}
          {isCollapsed && (
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tight block group"
            >
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
                className={`relative flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'px-4'
                } py-3 text-sm font-medium rounded-lg transition-colors duration-200 group overflow-hidden ${
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                }`}
              >
                {isActive && !prefersReducedMotion && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                {isActive && prefersReducedMotion && (
                  <div className="absolute inset-0 bg-primary/10 border-l-2 border-primary" />
                )}
                <span
                  className={`relative z-10 flex items-center gap-3 ${
                    isCollapsed ? 'justify-center' : ''
                  }`}
                >
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
            <div
              className={`rounded-xl bg-card border border-border shadow-sm ${
                isCollapsed ? 'p-2 flex justify-center' : 'p-4'
              }`}
            >
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

          {/* Help Button */}
          <button
            onClick={openTutorial}
            className={`w-full mt-4 flex items-center ${
              isCollapsed ? 'justify-center' : 'gap-2 px-3'
            } p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors`}
            title={isCollapsed ? 'Help & Tutorial' : ''}
          >
            <HelpCircle className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm">Help & Tutorial</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={toggleSidebar}
            className="w-full mt-2 flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Tutorial Modal */}
      {hasCheckedStorage && (
        <TutorialModal
          isOpen={showTutorial}
          onClose={closeTutorial}
          onComplete={completeTutorial}
        />
      )}
    </>
  );
}

/**
 * Client component to handle the main content wrapper
 * Adjusts margin based on sidebar collapsed state
 */
export function DashboardMainContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Listen for sidebar collapsed state changes with error handling
    const checkCollapsed = () => {
      try {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState) {
          setIsCollapsed(JSON.parse(savedState));
        }
      } catch (error) {
        // Handle localStorage errors silently (already logged in toggleSidebar)
        console.warn('[DashboardMainContent] Failed to read localStorage:', error);
      }
    };

    checkCollapsed();

    // Listen for storage changes (cross-tab updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        try {
          setIsCollapsed(e.newValue === 'true');
        } catch (error) {
          console.warn('[DashboardMainContent] Failed to parse storage event:', error);
        }
      }
    };

    // Listen for custom event for same-tab updates (more efficient than polling)
    const handleCustomEvent = () => checkCollapsed();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent);

    // Optimized: Use longer polling interval (1s) as fallback only
    // Primary updates come from custom events, polling is just a safety net
    const interval = setInterval(checkCollapsed, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent);
      clearInterval(interval);
    };
  }, []);

  return (
    <main
      className={`flex-1 ${
        isCollapsed ? 'ml-20' : 'ml-64'
      } p-8 min-h-screen bg-grid-pattern bg-fixed transition-all duration-300 ease-in-out`}
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </main>
  );
}

