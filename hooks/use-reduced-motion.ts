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
 * Hook to detect if the user is on a mobile device
 * Uses screen width as a proxy for mobile (< 768px)
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (subscribe) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const mediaQuery = window.matchMedia('(max-width: 767px)');
      mediaQuery.addEventListener('change', subscribe);
      
      return () => {
        mediaQuery.removeEventListener('change', subscribe);
      };
    },
    () => {
      if (typeof window === 'undefined') {
        return false;
      }
      return window.matchMedia('(max-width: 767px)').matches;
    },
    () => false
  );
}

/**
 * Hook to check if we should reduce animations for performance
 * Returns true on mobile OR when user prefers reduced motion
 */
export function useShouldReduceAnimations(): boolean {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  return prefersReducedMotion || isMobile;
}

/**
 * Returns motion props that respect the user's reduced motion preference
 * Use this to conditionally apply framer-motion animations
 * 
 * Usage:
 * ```tsx
 * const { shouldReduce } = useMotionSafe();
 * <motion.div animate={shouldReduce ? {} : floatAnimation} />
 * ```
 */
export function useMotionSafe() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const shouldReduce = prefersReducedMotion || isMobile;

  return {
    prefersReducedMotion,
    isMobile,
    shouldReduce,
    // Use duration: 0 for instant transitions when reduced motion is preferred
    safeTransition: shouldReduce ? { duration: 0 } : undefined,
  };
}

