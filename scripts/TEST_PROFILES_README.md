# TAILOR Test Profiles

This directory contains scripts to create and use 5 test user profiles with enriched work histories. These profiles help test how the AI model selects and formats content for different types of job seekers.

## 📋 Test Profiles Overview

| # | Profile Type | Name | Email | Documents |
|---|-------------|------|-------|-----------|
| 1 | **Principal Engineer** | Marcus Chen | principal.engineer@test.tailor.dev | 6 docs |
| 2 | **Retail/Customer Service** | Jessica Martinez | retail.worker@test.tailor.dev | 7 docs |
| 3 | **Teacher → Tech** | David Thompson | teacher.to.tech@test.tailor.dev | 7 docs |
| 4 | **Warehouse/Forklift** | Robert Jackson | warehouse.operator@test.tailor.dev | 6 docs |
| 5 | **Government Employee** | Patricia Williams | government.employee@test.tailor.dev | 7 docs |

## 🚀 Quick Start

### Step 1: Seed the Test Profiles

Run the seed script in Supabase SQL Editor:

```bash
# Option A: Copy/paste into Supabase Dashboard > SQL Editor
# Open scripts/seed-test-profiles.sql and run it

# Option B: Use psql directly
psql -h <supabase-host> -d postgres -U postgres -f scripts/seed-test-profiles.sql
```

### Step 2: Create a Session for a Test User

In Supabase SQL Editor, run:

```sql
-- Example: Create session for Principal Engineer
INSERT INTO sessions (session_token, user_id, expires)
SELECT 'test-session-principal-engineer',
       u.id,
       NOW() + INTERVAL '30 days'
FROM users u 
WHERE u.email = 'principal.engineer@test.tailor.dev';
```

### Step 3: Set the Session Cookie

In your browser console on the TAILOR app:

```javascript
// Set the session cookie
document.cookie = "next-auth.session-token=test-session-principal-engineer; path=/; max-age=2592000";

// Refresh the page
location.reload();
```

### Step 4: Trigger Document Ingestion

After logging in as a test user, run the reingest script in browser console:

```javascript
// Paste contents of scripts/reingest-browser.js
// Or call the ingestion API directly
```

## 📊 Profile Details

### 1. Principal Engineer (Marcus Chen)

**Background:** 15+ years at top tech companies (Stripe, Google, AWS)

**Documents:**
- Master resume with full work history
- Earlier resume version (different bullet emphasis)
- Technical blog posts & conference talks
- Open source contributions (Kubernetes, OpenTelemetry)
- Performance review highlights
- Side project portfolio

**Skills Focus:**
- Distributed systems, cloud architecture
- Technical leadership, mentoring
- System design at scale
- Go, Rust, Python, Java

**Best For Testing:**
- Staff+ engineering roles
- System architect positions
- Technical lead roles

---

### 2. Retail/Customer Service (Jessica Martinez)

**Background:** 5+ years in retail and food service with leadership progression

**Documents:**
- Main resume (Target, Starbucks, Old Navy)
- Restaurant experience (server role)
- Customer service achievements
- Training & development experience
- Bilingual service skills
- Volunteer coordination
- Seasonal Amazon CS experience

**Skills Focus:**
- Customer service excellence
- Team leadership & training
- Cash handling, POS systems
- Bilingual (Spanish/English)

**Best For Testing:**
- Customer service representative roles
- Retail management positions
- Call center jobs
- Service industry careers

---

### 3. Teacher Transitioning to Tech (David Thompson)

**Background:** 11 years as STEM teacher, completed coding bootcamp

**Documents:**
- Career transition resume (tech-focused)
- Teaching-focused resume
- Portfolio projects (web apps)
- Transferable skills summary
- Bootcamp capstone project
- Online courses & self-study
- Hackathon experience

**Skills Focus:**
- JavaScript, React, Node.js, Python
- Curriculum development, training
- Technical communication
- Project management

**Best For Testing:**
- Junior developer roles
- EdTech positions
- Technical training roles
- Career change scenarios

---

### 4. Warehouse Associate/Forklift Operator (Robert Jackson)

**Background:** 8+ years in warehouse operations and logistics

**Documents:**
- Main resume (Amazon, Home Depot, Kroger)
- Safety certifications & training
- Equipment certifications
- Peak season leadership
- Process improvement (Kaizen)
- Early career (UPS)

**Skills Focus:**
- Forklift operation (multiple types)
- Inventory management
- Safety compliance
- Team leadership

**Best For Testing:**
- Warehouse associate roles
- Forklift operator positions
- Logistics coordinator jobs
- Operations roles

---

### 5. Government Employee (Patricia Williams)

**Background:** 12+ years federal service (GS-13), policy and grants management

**Documents:**
- Federal resume (HHS, Education, Census)
- Early federal career (GAO)
- Awards and recognition
- Interagency leadership (COVID response)
- Federal training & certifications
- Policy writing portfolio
- Data analysis portfolio

**Skills Focus:**
- Grants management
- Policy analysis
- Interagency coordination
- Data analysis (SAS, R, Tableau)

**Best For Testing:**
- Federal job applications
- Policy analyst roles
- Program manager positions
- Government contractor roles

## 🧪 Testing Resume Generation

### Test Different Job Types

1. **Tech Job for Principal Engineer:**
   ```
   Job: Staff Software Engineer at Netflix
   Expected: Technical focus, distributed systems, leadership
   ```

2. **Tech Job for Teacher→Tech:**
   ```
   Job: Junior Frontend Developer
   Expected: Bootcamp projects, transferable skills from teaching
   ```

3. **Customer Service Role for Retail Worker:**
   ```
   Job: Customer Success Manager
   Expected: Service achievements, training experience, bilingual skills
   ```

4. **Operations Role for Warehouse Worker:**
   ```
   Job: Warehouse Supervisor at UPS
   Expected: Safety record, equipment certs, leadership experience
   ```

5. **Federal Job for Government Employee:**
   ```
   Job: GS-14 Program Manager at VA
   Expected: Detailed federal format, KSAs, specific accomplishments
   ```

### Comparing Content Selection

Run the same job description against different profiles to see how the model:
- Selects relevant experience bullets
- Emphasizes different skills
- Formats content appropriately

### Checking Deduplication

Each profile has overlapping information across documents. Verify that:
- Similar bullets are merged properly
- Canonical experiences are created correctly
- Skills are normalized and deduplicated

## 🔧 Useful Queries

### Get All Test User IDs

```sql
SELECT id, name, email 
FROM users 
WHERE email LIKE '%@test.tailor.dev';
```

### View Document Stats for a Profile

```sql
SELECT 
    u.name,
    d.file_name,
    d.parse_status,
    jsonb_array_length(d.parsed_content->'experiences') as experiences,
    jsonb_array_length(d.parsed_content->'skills') as skills
FROM documents d
JOIN users u ON d.user_id = u.id
WHERE u.email = 'principal.engineer@test.tailor.dev';
```

### Check Canonical Data After Ingestion

```sql
-- Canonical experiences
SELECT ce.display_company, ce.primary_title, ce.bullet_count, ce.source_count
FROM canonical_experiences ce
JOIN users u ON ce.user_id = u.id
WHERE u.email = 'principal.engineer@test.tailor.dev';

-- Canonical skills
SELECT cs.label, cs.category, cs.source_count, cs.weight
FROM canonical_skills cs
JOIN users u ON cs.user_id = u.id
WHERE u.email = 'principal.engineer@test.tailor.dev'
ORDER BY cs.weight DESC
LIMIT 20;
```

### Clean Up Test Data

```sql
-- Remove all test profiles and their data
DELETE FROM users WHERE email LIKE '%@test.tailor.dev';
```

## 📁 Files

- `seed-test-profiles.sql` - SQL script to create all test profiles
- `switch-test-profile.js` - Browser helper to switch between profiles
- `reingest-browser.js` - Re-run document ingestion
- `TEST_PROFILES_README.md` - This documentation

## ⚠️ Notes

- Test profiles use `@test.tailor.dev` email domain
- All data is fictional/mock data for testing purposes
- Remember to run ingestion after seeding to populate canonical tables
- Sessions created for test users expire after 30 days by default



