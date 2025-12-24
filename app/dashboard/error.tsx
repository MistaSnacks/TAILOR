'use client';

import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
            <div className="glass-card p-8 rounded-2xl border border-white/10 max-w-md w-full flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Something went wrong!</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                    {error.message || 'An unexpected error occurred while loading the dashboard.'}
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            window.location.href = '/';
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-border/60 bg-transparent text-foreground hover:bg-foreground/5 transition-colors"
                    >
                        Go Home
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            reset();
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </div>
        </div>
    );
}
