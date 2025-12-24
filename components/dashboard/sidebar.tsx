'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { TutorialModal, useTutorial } from '@/components/tutorial-modal';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AccountDropdown } from '@/components/dashboard/account-dropdown';
import { motion, AnimatePresence } from 'framer-motion';
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
  Menu,
  X,
  LogOut,
  Briefcase,
  Users,
  Settings,
  Gift,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const ADMIN_EMAILS = [
  'cmcmath89@gmail.com',
  'camren@gettailor.ai'
];

/**
 * Check if an email is an admin email
 */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
}

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
  { href: '/dashboard/resumes', label: 'Resumes', icon: Files },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/chat', label: 'Coach', icon: GraduationCap },
  { href: '/dashboard/users', label: 'Users', icon: Users, adminOnly: true },
];

export function DashboardSidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showTutorial, hasCheckedStorage, completeTutorial, closeTutorial, openTutorial } =
    useTutorial(user?.id);

  // Filter nav items based on admin status
  const isAdmin = isAdminEmail(user?.email);
  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

  // Load collapsed state from local storage with error handling
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState) {
        setIsCollapsed(JSON.parse(savedState));
      }
    } catch (error) {
      console.warn('[Sidebar] Failed to load collapsed state from localStorage:', error);
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      window.dispatchEvent(new CustomEvent('sidebarToggle'));
    } catch (error) {
      console.warn('[Sidebar] Failed to save collapsed state to localStorage:', error);
    }
  };

  // Get user initials for avatar
  const userInitials = user?.name && user.name.trim().length > 0
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      {/* Mobile Top Navigation Bar - Clean single hamburger menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight"
          >
            T<span className="text-primary">AI</span>LOR
          </Link>

          {/* Right side: Single hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Pills - Horizontal Scroll */}
        <div className="absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border overflow-x-auto scrollbar-hide">
          <nav className="flex items-center gap-1 px-4 py-2 min-w-max">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Menu Overlay - Full featured slide-out menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-card border-l border-border p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Info with Avatar */}
              {user && (
                <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name || 'User'}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {user.name && (
                        <p className="text-sm font-medium truncate">{user.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Menu Links */}
              <div className="space-y-1 mb-6">
                <Link
                  href="/dashboard/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Account Settings</span>
                </Link>
                <Link
                  href="/dashboard/referral"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Gift className="w-5 h-5" />
                  <span className="font-medium">Refer a Friend</span>
                </Link>
              </div>

              {/* Theme Toggle Row */}
              <div className="mb-4 p-3 flex items-center justify-between rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>

              {/* Help Button */}
              <button
                onClick={() => {
                  openTutorial();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors mb-4"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Help & Tutorial</span>
              </button>

              {/* Sign Out Button */}
              <button
                onClick={signOut}
                className="w-full px-4 py-3 text-sm font-medium bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <aside
        className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'
          } min-h-screen border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out flex-col`}
      >
        {/* Header */}
        <div
          className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'
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
                className={`relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'
                  } py-3 text-sm font-medium rounded-lg transition-colors duration-200 group overflow-hidden ${isActive
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
                  className={`relative z-10 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''
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
              className={`rounded-xl bg-card border border-border shadow-sm ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'
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
            className={`w-full mt-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-3'
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const checkCollapsed = () => {
      try {
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState) {
          setIsCollapsed(JSON.parse(savedState));
        }
      } catch (error) {
        console.warn('[DashboardMainContent] Failed to read localStorage:', error);
      }
    };

    checkCollapsed();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        try {
          setIsCollapsed(e.newValue === 'true');
        } catch (error) {
          console.warn('[DashboardMainContent] Failed to parse storage event:', error);
        }
      }
    };

    const handleCustomEvent = () => checkCollapsed();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent);

    const interval = setInterval(checkCollapsed, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent);
      clearInterval(interval);
    };
  }, []);

  return (
    <main
      className={`flex-1 min-h-screen bg-grid-pattern bg-fixed transition-all duration-300 ease-in-out
        pt-28 px-4 pb-8
        md:pt-8 md:px-8 ${isMounted ? (isCollapsed ? 'md:ml-20' : 'md:ml-64') : 'md:ml-64'}
      `}
    >
      {/* Fixed Account Dropdown in top-right corner - HIDDEN on mobile (slide-out menu handles it) */}
      <div className="hidden md:block fixed top-6 right-8 z-50">
        <AccountDropdown />
      </div>
      <div className="max-w-6xl mx-auto">{children}</div>
    </main>
  );
}
