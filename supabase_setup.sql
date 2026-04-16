-- ============================================
-- Run this in Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste > Run
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_leads (
    id BIGSERIAL PRIMARY KEY,
    business_name TEXT NOT NULL,
    company_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    website TEXT DEFAULT '',
    rating REAL,
    reviews INTEGER DEFAULT 0,
    has_phone TEXT DEFAULT 'no',
    has_website TEXT DEFAULT 'no',
    website_quality_score INTEGER DEFAULT 0,
    commercial_score INTEGER DEFAULT 0,
    commercial_match TEXT DEFAULT '',
    address_quality_score INTEGER DEFAULT 0,
    relevance_score INTEGER DEFAULT 0,
    final_score REAL DEFAULT 0,
    source_url TEXT DEFAULT '',
    source TEXT DEFAULT 'google_places_api',
    place_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vendor_leads_city ON vendor_leads(city);
CREATE INDEX IF NOT EXISTS idx_vendor_leads_category ON vendor_leads(category);
CREATE INDEX IF NOT EXISTS idx_vendor_leads_city_category ON vendor_leads(city, category);

-- Enable Row Level Security (allow all for now — tighten later if needed)
ALTER TABLE vendor_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON vendor_leads
    FOR ALL
    USING (true)
    WITH CHECK (true);
