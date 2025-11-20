'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-40">
          <div className="p-6 mb-6 flex items-center justify-between">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight block">
              T<span className="text-primary">AI</span>LOR
            </Link>
            <ThemeToggle />
          </div>
          <nav className="px-3 space-y-1">
            <Link
              href="/dashboard/profile"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
            >
              Profile
            </Link>
            <Link
              href="/dashboard/documents"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
            >
              Documents
            </Link>
            <Link
              href="/dashboard/generate"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
            >
              Generate Resume
            </Link>
            <Link
              href="/dashboard/resumes"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
            >
              My Resumes
            </Link>
            <Link
              href="/dashboard/chat"
              className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 group"
            >
              Chat
            </Link>
          </nav>

          {user && (
            <div className="absolute bottom-6 left-4 right-4">
              <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
                <div className="text-xs font-medium text-muted-foreground truncate mb-3">
                  {user.email}
                </div>
                <button
                  onClick={signOut}
                  className="w-full px-3 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-8 min-h-screen bg-grid-pattern bg-fixed">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

