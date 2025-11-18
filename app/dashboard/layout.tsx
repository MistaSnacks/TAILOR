'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen border-r border-border bg-card/50 backdrop-blur-sm">
          <div className="p-6">
            <Link href="/" className="font-display text-2xl font-bold">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                T-<span className="text-accent font-extrabold">AI</span>-LOR
              </span>
            </Link>
          </div>
          <nav className="px-4 space-y-2">
            <Link
              href="/dashboard/profile"
              className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/dashboard/documents"
              className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Documents
            </Link>
            <Link
              href="/dashboard/generate"
              className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Generate Resume
            </Link>
            <Link
              href="/dashboard/resumes"
              className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              My Resumes
            </Link>
            <Link
              href="/dashboard/chat"
              className="block px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Chat
            </Link>
          </nav>
          
          {user && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="text-sm font-medium truncate mb-2">
                  {user.email}
                </div>
                <button
                  onClick={signOut}
                  className="w-full px-3 py-2 text-sm bg-destructive/20 text-destructive rounded hover:bg-destructive/30 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

