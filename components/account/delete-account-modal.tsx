'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2, Calendar, Trash2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type DeleteMode = 'immediate' | 'scheduled';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail: string;
    onDeleted: (mode: DeleteMode) => void;
}

export function DeleteAccountModal({ isOpen, onClose, userEmail, onDeleted }: DeleteAccountModalProps) {
    const prefersReducedMotion = useReducedMotion();
    const [mode, setMode] = useState<DeleteMode>('scheduled');
    const [confirmation, setConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isConfirmationValid =
        confirmation === 'DELETE' ||
        confirmation.toLowerCase() === userEmail.toLowerCase();

    const handleDelete = async () => {
        if (!isConfirmationValid) {
            setError('Please type your email or "DELETE" to confirm');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/account/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, confirmation }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to delete account');
                return;
            }

            onDeleted(mode);
            onClose();
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setConfirmation('');
        setError(null);
        setMode('scheduled');
        onClose();
    };

    // Calculate scheduled deletion date
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Modal Container - scrollable full-screen flex container */}
                    <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 overflow-y-auto"
                        onClick={handleClose}
                    >
                        <div className="min-h-full flex items-center justify-center p-4">
                            {/* Modal */}
                            <motion.div
                                initial={prefersReducedMotion ? {} : { scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="w-full max-w-md bg-background rounded-xl shadow-2xl border border-border"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-border bg-destructive/5 rounded-t-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-destructive" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold font-display text-destructive">Delete Account</h2>
                                            <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-6 space-y-6">
                                    {/* Warning */}
                                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <p className="text-sm text-destructive font-medium mb-2">
                                            Deleting your account will permanently remove:
                                        </p>
                                        <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                                            <li>All uploaded documents and resumes</li>
                                            <li>Your profile and work experience data</li>
                                            <li>Saved jobs and career preferences</li>
                                            <li>Chat history and AI interactions</li>
                                        </ul>
                                    </div>

                                    {/* Mode Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium">Choose deletion method:</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setMode('scheduled')}
                                                className={`p-4 rounded-lg border-2 transition-all text-left ${mode === 'scheduled'
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-muted-foreground/50'
                                                    }`}
                                            >
                                                <Calendar className={`w-5 h-5 mb-2 ${mode === 'scheduled' ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <p className="font-medium text-sm">Schedule Deletion</p>
                                                <p className="text-xs text-muted-foreground mt-1">30-day grace period</p>
                                            </button>
                                            <button
                                                onClick={() => setMode('immediate')}
                                                className={`p-4 rounded-lg border-2 transition-all text-left ${mode === 'immediate'
                                                        ? 'border-destructive bg-destructive/5'
                                                        : 'border-border hover:border-muted-foreground/50'
                                                    }`}
                                            >
                                                <Trash2 className={`w-5 h-5 mb-2 ${mode === 'immediate' ? 'text-destructive' : 'text-muted-foreground'}`} />
                                                <p className="font-medium text-sm">Delete Now</p>
                                                <p className="text-xs text-muted-foreground mt-1">Immediate & permanent</p>
                                            </button>
                                        </div>
                                    </div>

                                    {mode === 'scheduled' && (
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                            <p className="text-sm text-muted-foreground">
                                                Your account will be deleted on{' '}
                                                <span className="font-medium text-foreground">
                                                    {scheduledDate.toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                . You can cancel anytime before then.
                                            </p>
                                        </div>
                                    )}

                                    {/* Confirmation Input */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Type <code className="px-1.5 py-0.5 rounded bg-muted text-destructive font-mono text-xs">DELETE</code> or your email to confirm:
                                        </label>
                                        <input
                                            type="text"
                                            value={confirmation}
                                            onChange={(e) => setConfirmation(e.target.value)}
                                            placeholder={userEmail}
                                            className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-destructive focus:ring-1 focus:ring-destructive outline-none transition-colors"
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                            {error}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex gap-3 p-6 border-t border-border">
                                    <button
                                        onClick={handleClose}
                                        className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={loading || !isConfirmationValid}
                                        className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'immediate'
                                                ? 'bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/50'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50'
                                            } disabled:cursor-not-allowed`}
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {mode === 'immediate' ? 'Delete Now' : 'Schedule Deletion'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
