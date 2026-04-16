"""
Supabase operations for vendor_leads table.

Table schema (create this in Supabase SQL editor):

CREATE TABLE vendor_leads (
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

CREATE INDEX idx_vendor_leads_city ON vendor_leads(city);
CREATE INDEX idx_vendor_leads_category ON vendor_leads(category);
CREATE INDEX idx_vendor_leads_city_category ON vendor_leads(city, category);
"""

from typing import List, Dict, Any
from app.services.supabase_client import get_supabase


TABLE = "vendor_leads"


def save_leads(rows: List[Dict[str, Any]]) -> int:
    """Insert rows into Supabase. Returns count inserted."""
    if not rows:
        return 0
    
    db = get_supabase()
    
    # Remove place_id from insert if you don't want it stored (keeping it)
    clean_rows = []
    for r in rows:
        clean_rows.append({
            "business_name": r.get("business_name", ""),
            "company_name": r.get("company_name", ""),
            "phone": r.get("phone", ""),
            "address": r.get("address", ""),
            # gst is intentionally omitted — column does not exist yet in Supabase.
            # To persist GST, run: ALTER TABLE vendor_leads ADD COLUMN gst TEXT DEFAULT '';
            # Then re-add "gst": r.get("gst", ""), here.
            "city": r.get("city", "").lower().strip(),
            "category": r.get("category", "").lower().strip(),
            "website": r.get("website", ""),
            "rating": r.get("rating"),
            "reviews": r.get("reviews", 0),
            "has_phone": r.get("has_phone", "no"),
            "has_website": r.get("has_website", "no"),
            "website_quality_score": r.get("website_quality_score", 0),
            "commercial_score": r.get("commercial_score", 0),
            "commercial_match": r.get("commercial_match", ""),
            "address_quality_score": r.get("address_quality_score", 0),
            "relevance_score": r.get("relevance_score", 0),
            "final_score": r.get("final_score", 0),
            "source_url": r.get("source_url", ""),
            "source": r.get("source", "google_places_api"),
            "place_id": r.get("place_id", ""),
        })
    
    result = db.table(TABLE).insert(clean_rows).execute()
    return len(result.data) if result.data else 0


def get_leads(city: str, category: str = "") -> List[Dict[str, Any]]:
    """Fetch saved leads for a city + optional category."""
    db = get_supabase()
    
    query = db.table(TABLE).select("*").eq("city", city.lower().strip())
    
    if category:
        query = query.eq("category", category.lower().strip())
    
    query = query.order("final_score", desc=True).limit(500)
    result = query.execute()
    return result.data if result.data else []


def get_all_cities() -> List[str]:
    """Get distinct cities that have data."""
    db = get_supabase()
    result = db.table(TABLE).select("city").execute()
    if not result.data:
        return []
    cities = sorted(set(r["city"] for r in result.data if r.get("city")))
    return cities


def get_categories_for_city(city: str) -> List[str]:
    """Get distinct categories for a city."""
    db = get_supabase()
    result = db.table(TABLE).select("category").eq("city", city.lower().strip()).execute()
    if not result.data:
        return []
    cats = sorted(set(r["category"] for r in result.data if r.get("category")))
    return cats


def check_existing(city: str, category: str) -> int:
    """Check how many leads exist for this city+category."""
    db = get_supabase()
    result = (
        db.table(TABLE)
        .select("id", count="exact")
        .eq("city", city.lower().strip())
        .eq("category", category.lower().strip())
        .execute()
    )
    return result.count if result.count else 0
