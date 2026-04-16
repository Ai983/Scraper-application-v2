"""
Google Maps scraper via Apify (compass/crawler-google-places actor).
Keeps the original `search_google_places` function name and signature
for backward compatibility with routes.py — internally uses Apify.
"""

import re
import time
from typing import List, Dict, Any, Optional, Callable

import httpx

from app.config import settings

# Apify actor: compass/crawler-google-places — most popular Google Maps scraper.
# Uses ~ instead of / in URL.
APIFY_ACTOR_ID = "compass~crawler-google-places"
APIFY_RUN_SYNC_URL = (
    f"https://api.apify.com/v2/acts/{APIFY_ACTOR_ID}/run-sync-get-dataset-items"
)

GENERIC_NAMES = {
    "restaurant", "hotel", "shop", "store", "company", "enterprise",
    "business", "agency", "services", "trading", "industries", "solutions",
    "group", "house", "home", "office", "center", "centre", "market",
    "mart", "traders", "associates", "brothers", "international", "national",
    "dealer", "dealers", "supplier", "suppliers", "distributor", "distributors",
    "manufacturer", "manufacturers", "exporter", "exporters", "importer", "importers",
    "wholesale", "retail", "showroom", "gallery", "studio",
}

NEGATIVE_WORDS = {
    "school", "institute", "academy", "college", "training",
    "course", "classes", "university", "coaching", "tuition",
}

COMMERCIAL_WORDS = {
    "commercial", "office", "corporate", "contractor", "contracting",
    "industrial", "installation", "maintenance", "service", "interior",
    "interiors", "renovation", "construction", "builder", "plumbing",
    "plumber", "electrical", "carpenter", "carpentry", "painting",
    "painter", "tile", "stone", "mason", "fabrication", "welding",
    "hvac", "false ceiling", "flooring", "waterproofing", "civil",
}

CITY_CLUSTERS = {
    "delhi": {"delhi", "new delhi", "noida", "greater noida", "ghaziabad", "faridabad", "gurgaon", "gurugram"},
    "noida": {"noida", "greater noida", "delhi", "new delhi", "ghaziabad"},
    "gurgaon": {"gurgaon", "gurugram", "delhi", "new delhi"},
    "gurugram": {"gurgaon", "gurugram", "delhi", "new delhi"},
    "ghaziabad": {"ghaziabad", "delhi", "new delhi", "noida"},
    "mumbai": {"mumbai", "navi mumbai", "thane"},
    "bangalore": {"bangalore", "bengaluru"},
    "bengaluru": {"bangalore", "bengaluru"},
    "hyderabad": {"hyderabad", "secunderabad"},
    "pune": {"pune", "pimpri", "chinchwad"},
    "chennai": {"chennai"},
    "kolkata": {"kolkata"},
    "jaipur": {"jaipur"},
    "lucknow": {"lucknow"},
    "chandigarh": {"chandigarh", "mohali", "panchkula"},
    "ludhiana": {"ludhiana"},
    "ahmedabad": {"ahmedabad"},
    "indore": {"indore"},
}


GST_REGEX = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][A-Z0-9]\b")


def _extract_gst(*texts: str) -> str:
    """Find an Indian GSTIN in any of the given text fields."""
    for t in texts:
        if not t:
            continue
        m = GST_REGEX.search(t.upper())
        if m:
            return m.group(0)
    return ""


def _normalize_phone(phone: str) -> str:
    """Return a valid 10-digit Indian mobile/landline number or empty string."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("91") and len(digits) > 10:
        digits = digits[-10:]
    if len(digits) == 10 and digits[0] in "6789":
        return digits
    return ""


def _is_generic_name(name: str) -> bool:
    """Return True if the business name is too generic to be useful."""
    if not name or len(name.strip()) < 3:
        return True
    words = set(name.lower().split())
    return words.issubset(GENERIC_NAMES)


def _city_match(address: str, city: str) -> bool:
    if not address:
        return True
    addr = address.lower()
    c = city.lower().strip()
    if c in addr:
        return True
    cluster = CITY_CLUSTERS.get(c, {c})
    return any(x in addr for x in cluster)


def _is_negative(text: str) -> bool:
    t = text.lower()
    return any(w in t for w in NEGATIVE_WORDS)


def _commercial_score(text: str) -> int:
    t = text.lower()
    return min(sum(10 for w in COMMERCIAL_WORDS if w in t), 100)


def _commercial_match(text: str) -> str:
    t = text.lower()
    matches = [w for w in COMMERCIAL_WORDS if w in t]
    return ", ".join(matches[:3]) if matches else ""


def _website_quality(url: str) -> int:
    if not url:
        return 0
    u = url.lower()
    if any(d in u for d in ["facebook.com", "instagram.com", "justdial.com", "indiamart.com"]):
        return 1
    if ".com" in u or ".in" in u or ".co" in u:
        return 3
    return 2


def _address_quality(address: str, city: str) -> int:
    if not address:
        return 0
    score = 0
    if city.lower() in address.lower():
        score += 3
    if re.search(r"\d{6}", address):  # pincode
        score += 2
    if any(w in address.lower() for w in ["road", "street", "nagar", "colony", "sector", "block", "market"]):
        score += 2
    return score


def _relevance_score(name: str, types: list, address: str, keyword: str, city: str) -> int:
    score = 0
    kw = keyword.lower()
    n = name.lower()
    if kw in n:
        score += 100
    for part in kw.split():
        if len(part) > 3 and part in n:
            score += 50
    type_text = " ".join(types).lower()
    if kw in type_text:
        score += 30
    if _city_match(address, city):
        score += 50
    return score


def _final_score(relevance: int, comm: int, rating: float, reviews: int, has_phone: bool, has_website: bool, addr_quality: int, web_quality: int) -> float:
    return (
        relevance
        + comm * 0.5
        + (rating or 0) * 20
        + min(reviews or 0, 500) * 0.1
        + (50 if has_phone else 0)
        + web_quality * 10
        + addr_quality * 5
    )


# ─── Apify call ──────────────────────────────────────────

def _apify_run(keyword: str, city: str, max_results: int) -> list:
    """
    Run the compass/crawler-google-places actor synchronously and return items.
    Fetches 3x the requested amount so strict filtering still yields enough.
    """
    token = settings.apify_token
    if not token or token.startswith("YOUR_"):
        raise ValueError("Set APIFY_TOKEN in .env")

    fetch_target = max_results * 2
    query = f"{keyword} in {city}"

    payload = {
        "searchStringsArray": [query],
        "language": "en",
        "maxCrawledPlacesPerSearch": fetch_target,
        "countryCode": "in",
        "skipClosedPlaces": True,
        "scrapePlaceDetailPage": True,
        "scrapeContacts": False,
        "includeWebResults": False,
    }

    print(f"[APIFY] query='{query}' fetch_target={fetch_target}")

    # Sync endpoint blocks until run completes; allow up to 5 minutes.
    with httpx.Client(timeout=300.0) as client:
        resp = client.post(
            APIFY_RUN_SYNC_URL,
            params={"token": token},
            json=payload,
        )
        if resp.status_code >= 400:
            print(f"[APIFY] HTTP {resp.status_code}: {resp.text[:500]}")
            resp.raise_for_status()
        data = resp.json()

    if not isinstance(data, list):
        print(f"[APIFY] Unexpected response type: {type(data)}")
        return []

    print(f"[APIFY] Returned {len(data)} raw items")
    return data


# ─── Main function (name preserved for routes.py compat) ───

def search_google_places(
    keyword: str,
    city: str,
    max_results: int = 20,
    on_progress: Optional[Callable[[int, int, str], None]] = None,
) -> List[Dict[str, Any]]:
    """
    Search Google Maps via Apify and return rows matching the Excel format.
    Function name kept for backward compatibility — internally uses Apify.
    """
    print(f"[SCRAPER] keyword='{keyword}' city='{city}' max={max_results}")

    if on_progress:
        on_progress(0, max_results, "Starting Apify scraper...")

    try:
        raw_items = _apify_run(keyword, city, max_results)
    except httpx.HTTPStatusError as e:
        print(f"[SCRAPER] Apify error: {e.response.status_code}")
        raise
    except httpx.TimeoutException:
        print(f"[SCRAPER] Apify timeout")
        raise

    if not raw_items:
        return []

    rows = []
    total = len(raw_items)

    for idx, p in enumerate(raw_items):
        if on_progress:
            on_progress(idx + 1, total, f"Processing {idx+1}/{total}")

        name = (p.get("title") or "").strip()
        address = (p.get("address") or "").strip()
        # Apify may return categories array; flatten for filter checks
        cats = p.get("categories") or []
        if not isinstance(cats, list):
            cats = [str(cats)]
        primary_cat = (p.get("categoryName") or (cats[0] if cats else "") or "").strip()
        types = [primary_cat] + [c for c in cats if c != primary_cat]

        combined = f"{name} {address} {' '.join(types)}"

        # --- Quality gate: business name must not be generic ---
        if _is_generic_name(name):
            print(f"[SCRAPER] Skip generic name: '{name}'")
            continue

        # --- Quality gate: business must be operational ---
        # Apify uses booleans permanentlyClosed / temporarilyClosed
        if p.get("permanentlyClosed") or p.get("temporarilyClosed"):
            print(f"[SCRAPER] Skip closed: '{name}'")
            continue

        if _is_negative(combined):
            continue
        if not _city_match(address, city):
            continue

        # Phone — Apify returns phone (formatted) and phoneUnformatted
        phone_raw = p.get("phone") or p.get("phoneUnformatted") or ""
        phone_clean = _normalize_phone(phone_raw)

        website = (p.get("website") or "").strip()
        rating = p.get("totalScore")
        reviews = p.get("reviewsCount")
        place_id = p.get("placeId") or ""
        maps_url = p.get("url") or ""

        # --- Quality gate: must have a valid 10-digit Indian phone number ---
        if not phone_clean:
            print(f"[SCRAPER] Skip no valid phone: '{name}' (raw='{phone_raw}')")
            continue

        # --- Quality gate: address must be non-empty and at least 10 chars ---
        if not address or len(address.strip()) < 10:
            print(f"[SCRAPER] Skip incomplete address: '{name}'")
            continue

        # Try to find GST in any returned text fields (rarely present on Google Maps)
        gst = _extract_gst(
            address,
            p.get("description") or "",
            p.get("subTitle") or "",
            name,
        )

        has_website = bool(website)
        comm = _commercial_score(combined)
        comm_match = _commercial_match(combined)
        web_q = _website_quality(website)
        addr_q = _address_quality(address, city)
        rel = _relevance_score(name, types, address, keyword, city)
        final = _final_score(rel, comm, float(rating or 0), int(reviews or 0), True, has_website, addr_q, web_q)

        rows.append({
            "business_name": name,
            "company_name": "",
            "phone": phone_clean,
            "address": address,
            "gst": gst,
            "city": city.strip().lower(),
            # Always store the user's keyword as category — needed for cache lookups
            # to work correctly. Apify's primary category (primary_cat) is preserved
            # in commercial_match for reference.
            "category": keyword.strip().lower(),
            "website": website,
            "rating": float(rating) if rating else None,
            "reviews": int(reviews) if reviews else 0,
            "has_phone": "yes",
            "has_website": "yes" if has_website else "no",
            "website_quality_score": web_q,
            "commercial_score": comm,
            "commercial_match": comm_match,
            "address_quality_score": addr_q,
            "relevance_score": rel,
            "final_score": round(final, 1),
            "source_url": maps_url,
            "source": "apify_google_maps",
            "place_id": place_id,
        })

    # Deduplicate by phone and by name
    seen_phones = set()
    seen_names = set()
    deduped = []
    for r in rows:
        ph = r["phone"]
        nm = r["business_name"].lower()
        if ph in seen_phones:
            continue
        if nm in seen_names:
            continue
        seen_phones.add(ph)
        seen_names.add(nm)
        deduped.append(r)

    deduped.sort(key=lambda x: x["final_score"], reverse=True)
    final_rows = deduped[:max_results]
    print(f"[SCRAPER] Returning {len(final_rows)} rows (from {len(raw_items)} raw)")
    return final_rows
