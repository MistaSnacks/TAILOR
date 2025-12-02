# Resume Output Issues - Investigation & Fixes

## Date: December 2, 2025

## Issues Identified

### 1. **Overly Aggressive Placeholder Detection** ⚠️ CRITICAL
   - **Location**: `lib/resume-content.ts:187`
   - **Problem**: The string `'location'` was listed as a placeholder match, causing legitimate location fields to be removed
   - **Impact**: Any resume with a location field containing "location" would have that field stripped
   - **Fix**: Removed `'location'` from `PLACEHOLDER_EXACT_MATCHES`

### 2. **Overly Aggressive Regex Patterns** ⚠️ HIGH
   - **Location**: `lib/resume-content.ts:230-233`
   - **Problem**: Patterns like `/\bfull\s+name\b/i`, `/\bemail\s+address\b/i`, `/\bphone\s+number\b/i`, `/\baddress\s+line\b/i` could match legitimate content
   - **Impact**: Legitimate text containing these phrases would be flagged as placeholders
   - **Fix**: Removed these overly aggressive regex patterns

### 3. **Double Cleaning of Resume Content** ⚠️ HIGH
   - **Location**: `app/api/generate/route.ts:244, 293`
   - **Problem**: `removeGhostData()` was called twice:
     - Once before the critic pass (line 244)
     - Once after the validator pass (line 293)
   - **Impact**: Legitimate content could be removed after the critic/validator passes modified the structure
   - **Fix**: Removed the first call; only clean once at the very end after all processing

### 4. **Bullet Format Handling** ⚠️ MEDIUM
   - **Location**: `lib/resume-content.ts:502-507`
   - **Problem**: `removeGhostData()` only handled string bullets, but the generator returns objects with `text` and `source_ids` properties
   - **Impact**: Bullets in object format would be incorrectly processed or lost
   - **Fix**: Updated `removeGhostData()` to handle both string and object bullet formats

## Changes Made

### `lib/resume-content.ts`
1. Removed `'location'` from `PLACEHOLDER_EXACT_MATCHES` array
2. Removed `'full name'`, `'email address'`, `'phone number'`, `'address line'` from `PLACEHOLDER_EXACT_MATCHES`
3. Removed overly aggressive regex patterns that could match legitimate content
4. Updated `removeGhostData()` to handle both string and object bullet formats

### `app/api/generate/route.ts`
1. Removed the first `removeGhostData()` call before the critic pass
2. Updated variable name from `cleanedDraft` to `finalResumeContent` for clarity
3. Only call `removeGhostData()` once at the very end after all processing

## Testing Recommendations

1. **Test location fields**: Verify that legitimate location values (e.g., "San Francisco, CA", "Remote", "New York, NY") are preserved
2. **Test bullet formats**: Verify that bullets in both string and object formats are handled correctly
3. **Test placeholder removal**: Verify that actual placeholders (e.g., "Company Name", "N/A") are still removed
4. **Test resume generation**: Generate a few resumes and verify content is not being incorrectly stripped

## Related Files Modified
- `lib/resume-content.ts` - Placeholder detection and ghost data removal
- `app/api/generate/route.ts` - Generation pipeline flow

## Commit Message Suggestion
```
fix: resume output issues - remove overly aggressive placeholder detection

- Remove 'location' from placeholder matches (legitimate field)
- Remove overly aggressive regex patterns that match real content
- Fix double cleaning issue - only clean once at end
- Fix bullet format handling to support both string and object formats

Fixes issues where legitimate resume content was being incorrectly removed.
```

