/**
 * Admin configuration
 * Single source of truth for admin emails and admin checks
 */

export const ADMIN_EMAILS: readonly string[] = [
  'cmcmath89@gmail.com',
  'camren@gettailor.ai',
] as const;

/**
 * Check if an email is an admin email (case-insensitive)
 * @param email - Email to check (can be null/undefined)
 * @returns true if email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
}



