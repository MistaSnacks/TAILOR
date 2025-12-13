import React from 'react';
import { LucideProps } from 'lucide-react';

/**
 * Custom icons converted to match Lucide React style
 * 24x24 viewBox, 2px stroke, round caps/joins
 */

export const SewingMachine: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M2 19a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2H2v-2Z" />
        <path d="M6 17v-8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
        <path d="M16 11V7" />
        <path d="M12 11V7" />
        <circle cx="17" cy="7" r="2" />
        <path d="M9 17v-4" />
    </svg>
);

export const TapeMeasure: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M2 12h20" />
        <path d="M18 12v3a4 4 0 0 1-4 4H4" />
        <path d="M6 12v-3a4 4 0 0 1 4-4h10" />
        <path d="M18 5v2" />
        <path d="M14 5v2" />
        <path d="M10 5v2" />
        <path d="M6 19v-2" />
        <path d="M10 19v-2" />
        <path d="M14 19v-2" />
    </svg>
);

export const Mannequin: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M12 2v3" />
        <path d="M6 8c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v4a5 5 0 0 1-1.3 3.3l-1.4 1.4A5 5 0 0 0 14 20h-4a5 5 0 0 0-1.3-3.3l-1.4-1.4A5 5 0 0 1 6 12V8Z" />
        <path d="M12 20v4" />
        <path d="M8 24h8" />
    </svg>
);

export const NeedleThread: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M19.5 7.5L4.5 22.5" />
        <path d="M19 8a3 3 0 1 0-3-3l1.5 1.5" />
        <path d="M13 3c.5-1 2-2 4-2s4 1.5 4 4c0 2-1.5 3-2 3.5" />
    </svg>
);

export const Thimble: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M7 22h10" />
        <path d="M5 22V9a7 7 0 0 1 14 0v13" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M12 10h.01" />
        <path d="M12 7h.01" />
        <path d="M9 14h.01" />
        <path d="M15 14h.01" />
        <path d="M12 14h.01" />
        <path d="M9 18h.01" />
        <path d="M15 18h.01" />
        <path d="M12 18h.01" />
    </svg>
);

export const SafetyPin: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M10 4h9a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-9" />
        <path d="M19 8c0 5-2 9-9 9s-9-4-9-9 9-4 9-4" />
        <circle cx="6" cy="18" r="2" />
    </svg>
);

export const Iron: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M2 15h15a5 5 0 0 0 5-5v-1a4 4 0 0 0-4-4H8a2 2 0 0 0-2 2" />
        <path d="M21 15a2 2 0 0 1-2 2H2v-2" />
        <rect x="7" y="10" width="8" height="2" rx="1" />
    </svg>
);

export const Hanger: React.FC<LucideProps> = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M12 2a3 3 0 0 1 3 3v2" />
        <path d="M15 7L3 14h18l-6-7" />
        <path d="M3 14l2.12 4.24a2 2 0 0 0 1.79 1.11h10.18a2 2 0 0 0 1.79-1.11L21 14" />
    </svg>
);
