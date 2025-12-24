'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, Gift, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function AccountDropdown() {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    if (!user) return null;

    // Get user initials for avatar
    const initials = user.name && user.name.trim().length > 0
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email?.charAt(0).toUpperCase() || 'U';

    const menuItems = [
        {
            href: '/dashboard/account',
            icon: Settings,
            label: 'Account Settings',
        },
        {
            href: '/dashboard/referral',
            icon: Gift,
            label: 'Refer a Friend',
        },
    ];

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted/50 transition-colors group"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name || 'User'}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        initials
                    )}
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-64 origin-top-right"
                    >
                        <div className="glass-card rounded-xl border border-border/50 shadow-xl overflow-hidden">
                            {/* User Info Header */}
                            <div className="p-4 border-b border-border/50 bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md">
                                        {user.image ? (
                                            <img
                                                src={user.image}
                                                alt={user.name || 'User'}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {user.name && (
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {user.name}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="p-2">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors group"
                                    >
                                        <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        {item.label}
                                    </Link>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-border/50 mx-2" />

                            {/* Sign Out Button */}
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        signOut();
                                    }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors group"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
