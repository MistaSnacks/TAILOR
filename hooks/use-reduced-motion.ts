'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hook to detect if the user prefers reduced motion
 * Returns true if the user has enabled reduced motion in their OS settings
 * Uses useSyncExternalStore for React 18+ compatibility and better SSR handling
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (subscribe) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      // Subscribe to changes
      mediaQuery.addEventListener('change', subscribe);
      
      // Return unsubscribe function
      return () => {
        mediaQuery.removeEventListener('change', subscribe);
      };
    },
    () => {
      // Get snapshot (server-side safe)
      if (typeof window === 'undefined') {
        return false;
      }
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },
    () => {
      // Server-side fallback
      return false;
    }
  );
}

/**
 * Returns motion props that respect the user's reduced motion preference
 * Use this to conditionally apply framer-motion animations
 * 
 * Usage:
 * ```tsx
 * const { safeAnimate, safeInitial, safeTransition } = useMotionSafe();
 * <motion.div animate={safeAnimate} initial={safeInitial} transition={safeTransition} />
 * ```
 * 
 * Note: framer-motion treats undefined as "no animation override"
 * When reduced motion is preferred, we return undefined to disable animations
 */
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion();

  return {
    prefersReducedMotion,
    // Return undefined to disable animations when reduced motion is preferred
    // When false, also return undefined to allow component's default animations
    safeAnimate: undefined,
    safeInitial: undefined,
    // Use duration: 0 for instant transitions when reduced motion is preferred
    // When false, return undefined to use component's default transition
    safeTransition: prefersReducedMotion ? { duration: 0 } : undefined,
  };
}

