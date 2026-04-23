from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from app.scrapers.google_places import search_google_places
from app.services.database import (
    save_leads,
    get_leads,
    get_all_cities,
    get_categories_for_city,
    check_existing,
    set_shortlist,
    get_shortlisted,
    delete_lead,
)

router = APIRouter(prefix="/api", tags=["leads"])


# ─── Request / Response models ────────────────────────────

class SearchRequest(BaseModel):
    keyword: str = Field(..., min_length=2)
    city: str = Field(..., min_length=2)
    max_results: int = Field(default=20, ge=1, le=200)


class SearchResponse(BaseModel):
    status: str
    message: str
    count: int
    rows: List[Dict[str, Any]]
    from_cache: bool = False


class LeadsResponse(BaseModel):
    city: str
    category: str
    count: int
    rows: List[Dict[str, Any]]


# ─── Endpoints ────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/search", response_model=SearchResponse)
def search_vendors(req: SearchRequest):
    """
    Main endpoint. Checks Supabase first — if data exists, returns cached.
    If not, scrapes via Google Places API and saves to Supabase.
    """
    city = req.city.strip().lower()
    keyword = req.keyword.strip().lower()

    # Check if we already have data
    existing_count = check_existing(city, keyword)

    if existing_count > 0:
        all_cached = get_leads(city, keyword)
        # Trim to what the user actually asked for. If we have less than
        # requested, return everything we have and prompt for a fresh fetch.
        rows = all_cached[: req.max_results]
        if len(all_cached) >= req.max_results:
            msg = (
                f"Showing {len(rows)} saved result(s) for '{keyword}' in '{city}'. "
                f"Click below to fetch fresh data from Apify if you want newer results."
            )
        else:
            msg = (
                f"Only {len(rows)} saved result(s) for '{keyword}' in '{city}' "
                f"(you asked for {req.max_results}). "
                f"Click below to fetch fresh data from Apify."
            )
        return SearchResponse(
            status="ok",
            message=msg,
            count=len(rows),
            rows=rows,
            from_cache=True,
        )

    # No cached data — scrape fresh
    try:
        rows = search_google_places(
            keyword=req.keyword,
            city=req.city,
            max_results=req.max_results,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    if not rows:
        return SearchResponse(
            status="ok",
            message=f"No results found for '{keyword}' in '{city}'",
            count=0,
            rows=[],
            from_cache=False,
        )

    # Save to Supabase and use the inserted rows (with IDs) for the response
    try:
        saved_rows = save_leads(rows)
        print(f"[DB] Saved {len(saved_rows)} rows for {keyword} in {city}")
        if saved_rows:
            rows = saved_rows
    except Exception as e:
        print(f"[DB] Save failed: {e}")
        # Still return scraped results (without IDs) if save fails

    return SearchResponse(
        status="ok",
        message=f"Found {len(rows)} new results for '{keyword}' in '{city}'",
        count=len(rows),
        rows=rows,
        from_cache=False,
    )


@router.post("/search/fresh", response_model=SearchResponse)
def search_fresh(req: SearchRequest):
    """Force a fresh scrape even if cached data exists."""
    try:
        rows = search_google_places(
            keyword=req.keyword,
            city=req.city,
            max_results=req.max_results,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    if rows:
        try:
            saved_rows = save_leads(rows)
            if saved_rows:
                rows = saved_rows
        except Exception as e:
            print(f"[DB] Save failed: {e}")

    return SearchResponse(
        status="ok",
        message=f"Fresh search: {len(rows)} results for '{req.keyword}' in '{req.city}'",
        count=len(rows),
        rows=rows,
        from_cache=False,
    )


@router.get("/leads/{city}")
def get_city_leads(city: str, category: Optional[str] = None):
    """Get saved leads for a city, optionally filtered by category."""
    rows = get_leads(city, category or "")
    return LeadsResponse(
        city=city,
        category=category or "all",
        count=len(rows),
        rows=rows,
    )


@router.get("/cities")
def list_cities():
    """Get all cities that have saved data."""
    return {"cities": get_all_cities()}


@router.get("/categories/{city}")
def list_categories(city: str):
    """Get all categories saved for a city."""
    return {"city": city, "categories": get_categories_for_city(city)}


# ─── Shortlist endpoints ──────────────────────────────────

class ShortlistRequest(BaseModel):
    is_shortlisted: bool


@router.post("/leads/{lead_id}/shortlist")
def update_shortlist(lead_id: int, req: ShortlistRequest):
    """Mark or unmark a lead as shortlisted."""
    try:
        updated = set_shortlist(lead_id, req.is_shortlisted)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")
        return {"status": "ok", "lead": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.get("/shortlisted")
def list_shortlisted():
    """Get all shortlisted leads across cities and categories."""
    rows = get_shortlisted()
    return {"count": len(rows), "rows": rows}


@router.delete("/leads/{lead_id}")
def remove_lead(lead_id: int):
    """Permanently delete a lead from the database."""
    try:
        deleted = delete_lead(lead_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")
        return {"status": "ok", "deleted_id": lead_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
