# Training Data: Gold Standard Resumes

This folder contains high-quality resume outputs paired with their job descriptions for evaluation and model tuning.

## Folder Structure

```
training/
├── README.md
├── examples/
│   ├── 001-fraud-analyst/
│   │   ├── job-description.txt       # Plain text JD
│   │   ├── input-resume.pdf          # Original candidate resume (optional)
│   │   ├── gold-output.docx          # The ideal tailored resume
│   │   ├── gold-output.json          # Structured JSON of the ideal output
│   │   └── notes.md                  # Why this is a good example
│   ├── 002-product-manager/
│   │   └── ...
│   └── ...
└── schema.json                       # JSON schema for gold-output.json
```

## How to Add a New Example

1. Create a numbered folder: `examples/NNN-role-name/`
2. Add the job description as `job-description.txt` (plain text)
3. Add the gold standard output:
   - `gold-output.docx` — the Word doc you'd want generated
   - `gold-output.json` — structured version matching our ResumeContent schema
4. Optionally add `input-resume.pdf` if you want to track the source material
5. Add `notes.md` explaining what makes this output excellent

## JSON Schema

The `gold-output.json` should match this structure:

```json
{
  "summary": "3-4 sentence professional summary...",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State",
      "startDate": "Mon YYYY",
      "endDate": "Mon YYYY or Present",
      "bullets": [
        "Action + Context + Result bullet with metrics..."
      ]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "endDate": "YYYY"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Org",
      "date": "YYYY"
    }
  ]
}
```

## Usage

These examples can be used for:

1. **Manual evaluation** — Compare generated output against gold standard
2. **Automated scoring** — Compute similarity/overlap metrics
3. **Few-shot prompting** — Include examples in generation prompts
4. **Fine-tuning** — If we move to a fine-tuned model

## File Formats

- **PDF/DOCX**: Git will store these as binary files. Keep them small (<500KB each).
- **TXT/JSON/MD**: Plain text, version-controlled normally.

## Git LFS (Optional)

If you have many large PDFs/DOCXs, consider using Git LFS:

```bash
# Install Git LFS (one time)
brew install git-lfs
git lfs install

# Track binary files
git lfs track "*.pdf"
git lfs track "*.docx"
git add .gitattributes
```

This keeps the repo fast while still versioning binary files.


