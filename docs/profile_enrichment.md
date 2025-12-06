# Profile Enrichment

## Overview

Profile enrichment allows users to promote high-quality bullets from generated resumes back into their canonical profile. This creates a feedback loop where the canonical profile becomes richer and more refined over time.

## How It Works

### 1. Generation Creates Candidates

When the resume generator creates a tailored resume:
- The writer agent may merge multiple canonical bullets into a single, more impactful bullet
- Each generated bullet includes provenance metadata:
  - `source_ids`: The canonical bullet IDs that were used
  - `merged_from`: If multiple bullets were merged, their IDs are tracked

### 2. User Reviews Candidates

After generating resumes, users can:
- View enrichment candidates for each canonical experience
- See which bullets were merged and their source provenance
- Preview how the bullet would appear in their canonical profile

### 3. Promotion to Canonical Profile

When a user promotes a bullet:
- The bullet is added to the canonical profile with full provenance
- The `source_bullet_ids` field preserves the lineage
- The bullet gets a new embedding for future retrieval
- The canonical profile is immediately available for future generations

## API Endpoints

### POST `/api/profile/enrich`

Promotes a bullet to the canonical profile.

**Request Body:**
```json
{
  "canonicalExperienceId": "uuid",
  "promotedBullet": {
    "text": "Reduced fraud losses by 45% through implementation of ML-based detection system",
    "sourceIds": ["bullet-uuid-1", "bullet-uuid-2"],
    "mergedFrom": ["candidate-uuid-1", "candidate-uuid-2"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "bulletId": "new-bullet-uuid",
  "message": "Bullet promoted to canonical profile"
}
```

### GET `/api/profile/enrich?experienceId=xxx`

Retrieves enrichment candidates for a canonical experience.

**Response:**
```json
{
  "experienceId": "uuid",
  "company": "Acme Corp",
  "title": "Senior Engineer",
  "candidates": [
    {
      "text": "Led team of 5 engineers to deliver...",
      "sourceIds": ["uuid1", "uuid2"],
      "mergedFrom": ["uuid3"],
      "resumeId": "resume-uuid",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

## React Hook

### `useProfileEnrichment()`

```typescript
import { useProfileEnrichment } from '@/hooks/use-profile-enrichment';

function MyComponent() {
  const { loading, error, fetchCandidates, promoteBullet } = useProfileEnrichment();

  const handleFetch = async () => {
    const result = await fetchCandidates('experience-uuid');
    console.log(result.candidates);
  };

  const handlePromote = async () => {
    const success = await promoteBullet('experience-uuid', {
      text: 'Bullet text',
      sourceIds: ['uuid1', 'uuid2'],
    });
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleFetch}>Fetch Candidates</button>
      <button onClick={handlePromote}>Promote Bullet</button>
    </div>
  );
}
```

## UI Component

### `ProfileEnrichmentPanel`

```tsx
import { ProfileEnrichmentPanel } from '@/components/profile-enrichment-panel';

function ProfilePage() {
  return (
    <ProfileEnrichmentPanel
      canonicalExperienceId="uuid"
      company="Acme Corp"
      title="Senior Engineer"
      onBulletPromoted={() => {
        console.log('Bullet promoted!');
        // Refresh canonical profile
      }}
    />
  );
}
```

## Benefits

### For Users
- **Continuous Improvement**: Canonical profile gets better with each generation
- **Quality Control**: Users approve only the best merged bullets
- **Transparency**: Full provenance tracking shows where bullets came from

### For the System
- **Richer Canonical Profile**: More diverse, high-quality bullets for future generations
- **Better Retrieval**: Promoted bullets have embeddings optimized for semantic search
- **Feedback Loop**: User approval signals which merges are most valuable

## Database Schema

The enrichment feature uses the existing `canonical_bullets` table with these key fields:

- `content`: The bullet text
- `source_bullet_ids`: Array of source bullet IDs (provenance)
- `representative_bullet_id`: NULL for promoted bullets (distinguishes them from deduped bullets)
- `embedding`: Vector embedding for semantic search
- `avg_similarity`: Set to 1.0 for user-approved bullets (high confidence)

## Best Practices

### For Users
1. **Review Regularly**: Check enrichment candidates after each generation
2. **Be Selective**: Only promote bullets that are truly better than existing ones
3. **Check Provenance**: Verify that merged bullets preserve factual accuracy

### For Developers
1. **Preserve Provenance**: Always track `source_ids` and `merged_from`
2. **Validate Ownership**: Ensure users can only enrich their own profiles
3. **Deduplicate**: Don't show candidates that already exist in canonical profile
4. **Limit Candidates**: Show only the most recent/relevant suggestions (e.g., top 10)

## Future Enhancements

- **Auto-suggest**: Automatically identify high-quality candidates for promotion
- **Bulk Promotion**: Allow users to promote multiple bullets at once
- **Undo**: Allow users to remove promoted bullets if they change their mind
- **Analytics**: Track which types of merges users prefer to improve the writer agent
- **Collaborative Filtering**: Suggest promotions based on what similar users have promoted





