# Resume Generation Training Rules

Extracted from gold standard examples in `training/examples/001-example/`

**Focus**: These rules govern **content quality** — bullet structure, experience selection, summary writing, keyword integration. Section ordering is handled separately by the DOCX generator.

---

## 1. Resume Structure

The resume sections appear in this order (handled by docx-generator.ts):

1. **Contact Info** (name, email, phone, LinkedIn)
2. **Professional Summary** (3-4 sentences)
3. **Professional Experience** (reverse chronological)
4. **Skills** (after experience)
5. **Education**
6. **Certifications**

> ℹ️ **Note**: Skills placement is intentionally AFTER Experience. Do not change this.

---

## 2. Professional Summary Rules

### Structure
- 3-4 impactful sentences in a single paragraph
- Minimum 350 characters
- NO bullet points in summary

### Content Formula
1. **Sentence 1**: Years of experience + primary domain expertise
2. **Sentence 2**: 2-3 verified quantified achievements with specific metrics
3. **Sentence 3**: Key tools/skills relevant to target JD
4. **Sentence 4**: Connection to target role's core requirements

### Examples from Gold Standards

**AML Analyst (Paylocity)**:
> "Detail-oriented and proactive professional with 3+ years of hands-on AML, fraud, and financial crime investigations experience in FinTech environments. Possesses proven ability to monitor, investigate, and report suspicious activities in compliance with Anti-Money Laundering (AML) regulations and internal policies. Proficient in SQL for data extraction and analysis, experienced in leveraging modern risk management tools to identify and mitigate financial crime risks, and skilled in cross-functional collaboration to enhance customer experience and ensure regulatory compliance."

**Trust & Safety (Snap)**:
> "Trust & Safety expert with 7+ years of experience in fraud prevention, risk management, and operational excellence, adept at building and improving processes to enhance platform safety and mitigate risks. Proven ability to leverage data-driven decision-making and technical skills, including SQL, Python, and data visualization tools, to identify trends and patterns, create automations, and optimize workflows. Expertise in proactive harm and abuse detection, content moderation, and cross-functional collaboration. Ready to support Snap's Trust & Safety team and contribute to a safe platform experience for Snapchatters by applying subject matter expertise and a hands-on approach to proactive detection."

---

## 3. Skills Section Rules

### Placement
- Skills appear AFTER experience, BEFORE education
- This is the current placement and should NOT change

### Formatting Options

**Option A: Categorized (for specialized roles)**
```
Fraud & AML Investigations: AML, KYC, SAR Narratives, Fraud Prevention...
Technical Skills: SQL, Tableau, Power BI, LexisNexis, Sonnet, Sentilink...
Regulations & Compliance: Bank Secrecy Act (BSA), USA PATRIOT Act, FinCEN...
Data Analysis & Reporting: Data Extraction, Data Analysis, Trend Identification...
```

**Option B: Single Block (for generalist roles)**
```
Trust & Safety - Content Moderation - Data Analysis - SQL - Python - Advanced Excel...
```

### Skill Selection Rules
1. Include 30-40 skills total
2. Prioritize skills that appear in the JD
3. Include technical/universal skills (SQL, Python, Excel, Google Suite, Office Suite)
4. Include domain-specific skills from candidate's background
5. Can infer related skills (e.g., "Google Suite" implies Sheets, Docs, Slides)

---

## 4. Experience Selection Rules

### What TO Include
- Experiences with bullets that semantically align with JD responsibilities
- Experiences with domain-relevant keywords (fraud, AML, compliance, etc.)
- Most recent roles (recency matters)
- Roles with strong metrics that ARE relevant to the target role

### What NOT to Include
- Experiences that don't align with JD IF better alternatives exist
- Example: "Satterberg Foundation role excluded for fraud/fintech roles - nonprofit grant management doesn't align with fraud domain"

### Exception
- If no aligned experiences exist, include most recent roles with decent bullets
- Never produce an empty experience section

---

## 5. Bullet Quality Rules

### Structure: Action + Context + Result
Every bullet should follow this pattern:
- **Action**: Strong verb (Led, Developed, Implemented, Analyzed, Created)
- **Context**: What was done and where/how
- **Result**: Quantified impact with metrics

### Examples from Gold Standards

**Strong Bullets (include these)**:
- "Managed a daily queue of 40-60 escalated fraud and credit disputes, validating cardholder claims and assigning liability aligning with Visa and TD policies, contributing to a 10-20% reduction in repeat disputes"
- "Investigated over 3000 accounts weekly, analyzing alerts stemming from transactional activity and new account applications, preventing average company losses of $200,000 per week"
- "Created automations using SQL, Python, Tableau, and Google App Scripts to generate productivity dashboards, chargeback worksheets, and Sonnet work queues, optimizing operational workflows for a 2-person team and increasing efficiency by 25%"

### Bullet Count per Experience
- Most recent role: 5-6 bullets
- Second role: 4-5 bullets
- Third/Fourth roles: 3-4 bullets
- Older roles: 2-3 bullets

---

## 6. Experience Alignment Examples

### AML Analyst Role (Paylocity)

**Included Experiences** (in order):
1. Fraud and Credit Analyst, TD Bank (current - highly relevant)
2. Back Office Operations Lead, POSSIBLE FINANCE (fraud/KYC work)
3. Fraud Operations Manager, SELF FINANCIAL INC (fraud investigations)

**Excluded**: Satterberg Foundation (nonprofit grants - not AML relevant)

### Trust & Safety Role (Snap)

**Included Experiences** (in order):
1. Fraud and Credit Analyst, TD Bank
2. Back Office Operations Lead, POSSIBLE FINANCE
3. Fraud Operations Manager, SELF FINANCIAL INC
4. Operations Manager, SATTERBERG FOUNDATION ← Included here because:
   - T&S is broader than pure fraud
   - SQL/data analysis skills transfer
   - No better alternatives exist

### Operations Director Role (Formation)

**Included Experiences** (in order):
1. Back Office Operations Lead, POSSIBLE FINANCE
2. Operations Manager, SATTERBERG FOUNDATION ← Primary focus here because:
   - Direct operations/admin experience
   - Budget/finance management
   - Vendor/stakeholder coordination
   - Mission-driven environment match

---

## 7. Keyword Integration Rules

### From JD → Resume
1. Extract hard skills from JD (SQL, Python, specific tools)
2. Extract soft skills from JD (cross-functional, analytical, communication)
3. Extract domain terms from JD (AML, fraud, compliance, trust & safety)
4. Weave these naturally into summary, skills, and bullets

### Keyword Density
- Summary: 3-5 JD keywords
- Skills: 10-15 JD keywords
- Each bullet: 1-2 JD keywords where natural

---

## 8. What Makes a "100% ATS Score" Resume

Based on the gold standards that achieved 100% on Jobscan:

1. **Keyword Match**: Skills section contains exact JD keywords
2. **Section Order**: Standard ATS-friendly order (Summary → Experience → Skills → Education)
3. **Date Formatting**: "Month Year" format (e.g., "Jan 2022 - Mar 2024")
4. **No Graphics/Tables**: Pure text formatting
5. **Consistent Formatting**: Same bullet style, same date format throughout
6. **Relevant Content**: Bullets directly address JD responsibilities

---

## 9. Domain-Specific Patterns

### Fraud/AML/Compliance Roles
**Must include keywords**: AML, KYC, SAR, BSA, fraud detection, investigations, suspicious activity, transaction monitoring, risk mitigation, compliance

**Must include tools**: SQL, Sentilink, Sardine, GIACT, Experian, case management systems

### Trust & Safety Roles
**Must include keywords**: content moderation, abuse detection, platform safety, proactive detection, harm prevention, machine learning, cross-functional

**Must include tools**: SQL, Python, Looker, Grafana, data visualization

### Operations Roles
**Must include keywords**: process improvement, workflow optimization, project management, stakeholder management, cross-functional collaboration, KPI management

**Must include tools**: Excel, Google Workspace, Asana, Jira, Trello, QuickBooks

---

## 10. Anti-Patterns (What NOT to Do)

1. ❌ Don't include experiences just because they have metrics if irrelevant to JD
2. ❌ Don't use generic bullets without specific context
3. ❌ Don't fabricate metrics or experiences
4. ❌ Don't include placeholder text
5. ❌ Don't move skills before experience section (keep current order)
6. ❌ Don't use bullet points in the summary
7. ❌ Don't exceed 6 bullets per experience
8. ❌ Don't include address in contact info

