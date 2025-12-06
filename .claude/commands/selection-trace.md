# /selection-trace (inspect latest generation rationale)

Quickly view why the model chose specific bullets (scores, boosts, inferred signals) for a generated resume.

## Usage (Terminal, macOS)

```bash
# Show selection trace for a resume version
npx tsx scripts/show-selection-trace.ts <resumeVersionId>
```

Tips:
- Copy a resume version id from `resume_versions` in Supabase or from the dashboard URL/query if surfaced.
- Command logs with `(IS $)` hit Supabase; `(NO $)` are local.

## What you’ll see
- Inference signals: experienceHighlights, metricSignals
- Job keyword sample
- Per-experience: bulletBudget, alignmentReasons, selectedBullets with `scoreBreakdown` (similarity/toolBoost/metricBoost/final) and candidateSample
- First experience deep dive with text + scoreBreakdown for selected and candidate bullets

## Expected outcome
- Clear rationale for bullet selection and any inferred truths, ready to share or debug.

