// Job Provider Registry
// Exports all available job search providers

import { linkedInRapidProvider } from './linkedin-rapid';
import { jsearchProvider } from './jsearch';
import type { JobProvider } from '../provider-base';

// Registry of all providers
export const providers: Record<string, JobProvider> = {
  linkedin: linkedInRapidProvider,
  jsearch: jsearchProvider,
  // Future providers:
  // jsearch: jSearchProvider,
  // adzuna: adzunaProvider,
  // remotive: remotiveProvider,
};

// Get all enabled providers
export function getEnabledProviders(): JobProvider[] {
  return Object.values(providers).filter(p => p.enabled);
}

// Get a specific provider by name
export function getProvider(name: string): JobProvider | undefined {
  return providers[name];
}

// Check if any job providers are enabled
export function hasEnabledProviders(): boolean {
  return getEnabledProviders().length > 0;
}

export { linkedInRapidProvider };

