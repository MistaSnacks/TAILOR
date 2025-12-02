# Dashboard Performance Improvements

## Completed Improvements ✅

### 1. Server Component Layout
- **Converted the dashboard layout to a server component** (`app/dashboard/layout.tsx`)
- Created `components/dashboard/sidebar.tsx` with client-side sidebar and main content components
- The layout now streams from the server while sidebar state/animations are handled client-side

### 2. Trimmed Client-Side Logging
- **Removed production console logs** from `hooks/use-auth.ts`, dashboard pages, and API routes
- Created `lib/debug.ts` utility for gated logging (only in development)
- All API routes now use silent error handling unless in development

### 3. Reduced API Payload Sizes
- **`/api/upload` GET**: Changed from `select('*')` to `select('id, file_name, file_type, file_size, parse_status, created_at')`
- **`/api/profile`**: Skills now only fetch `id, canonical_name, name, source_count`
- Removed parsed content blobs from document list responses

### 4. Reduced Motion Support
- **Created `hooks/use-reduced-motion.ts`** to detect `prefers-reduced-motion` preference
- Updated all dashboard pages to respect reduced motion:
  - `app/dashboard/page.tsx`
  - `app/dashboard/profile/page.tsx`
  - `app/dashboard/documents/page.tsx`
  - `components/dashboard/sidebar.tsx`
- Animations are disabled for users with reduced motion preference

### 5. SWR Data Fetching
- **Created `hooks/use-dashboard-data.ts`** with SWR-based hooks:
  - `useDashboardStats()` - cached dashboard statistics
  - `useDocuments()` - cached document list
  - `useProfileData()` - cached profile, experiences, and skills
- Cache configuration prevents unnecessary refetches on tab changes

## Remaining Ideas (Optional Future Work)

- **Handle document/experience lists more efficiently** (`app/dashboard/profile/page.tsx`): Consider windowing long lists or lazily hydrating details when users have dozens of records.

- **Cache shared dashboard stats server-side**: Move the query into the layout with `cache()`/`revalidatePath` for even faster initial loads.

- **Virtualize long lists**: For users with many documents/experiences, implement virtual scrolling.
