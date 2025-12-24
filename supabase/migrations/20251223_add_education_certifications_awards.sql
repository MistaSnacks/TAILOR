-- ============================================================
-- Education, Certifications, and Military Awards Tables
-- ============================================================

-- Canonical Education Table
CREATE TABLE IF NOT EXISTS canonical_education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_date TEXT,
  end_date TEXT,
  gpa TEXT,
  honors TEXT[],
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_education_user_id ON canonical_education(user_id);

-- Canonical Certifications Table
CREATE TABLE IF NOT EXISTS canonical_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date TEXT,
  expiration_date TEXT,
  credential_id TEXT,
  credential_url TEXT,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_certifications_user_id ON canonical_certifications(user_id);

-- Military Awards / Decorations Table
-- For DD214s and other military service documents
CREATE TABLE IF NOT EXISTS military_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- e.g., "Army Commendation Medal"
  abbreviation TEXT,                     -- e.g., "ARCOM"
  category TEXT CHECK (category IN ('medal', 'ribbon', 'badge', 'citation', 'other')),
  description TEXT,                      -- Description or citation text
  date_awarded TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_military_awards_user_id ON military_awards(user_id);

-- Military Service Details (optional, for users who served)
CREATE TABLE IF NOT EXISTS military_service (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,                  -- e.g., "Army", "Navy", "Air Force"
  rank TEXT,                             -- e.g., "SPC", "SSG", "CPT"
  pay_grade TEXT,                        -- e.g., "E04", "O3"
  mos_code TEXT,                         -- Military Occupational Specialty code
  mos_title TEXT,                        -- MOS description
  service_start TEXT,
  service_end TEXT,
  discharge_type TEXT,                   -- e.g., "Honorable", "General"
  character_of_service TEXT,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                        -- One service record per user (can be extended later)
);

CREATE INDEX IF NOT EXISTS idx_military_service_user_id ON military_service(user_id);

-- Enable RLS (policies managed at API layer with NextAuth)
ALTER TABLE canonical_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE military_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE military_service ENABLE ROW LEVEL SECURITY;

