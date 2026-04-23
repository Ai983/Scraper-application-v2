import { useState, useEffect, useMemo } from "react";
import { api } from "../services/api";
import ResultsTable from "./ResultsTable";

export default function Shortlisted() {
  const [allRows, setAllRows] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    setMessage("");
    api.getShortlisted()
      .then((res) => {
        const data = res.data;
        setAllRows(data.rows || []);
        if (!data.rows || data.rows.length === 0) {
          setMessage(
            "No shortlisted vendors yet. Click the ☆ icon next to any vendor in Search or Saved Data to add them here."
          );
        }
      })
      .catch(() => setMessage("Failed to load shortlisted vendors."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Cities present in the shortlist
  const cities = useMemo(() => {
    return Array.from(new Set(allRows.map((r) => r.city).filter(Boolean))).sort();
  }, [allRows]);

  // Categories present for the selected city (or all if no city selected)
  const categories = useMemo(() => {
    const filtered = selectedCity
      ? allRows.filter((r) => r.city === selectedCity)
      : allRows;
    return Array.from(new Set(filtered.map((r) => r.category).filter(Boolean))).sort();
  }, [allRows, selectedCity]);

  // Final filtered rows shown in the table
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (selectedCity && r.city !== selectedCity) return false;
      if (selectedCategory && r.category !== selectedCategory) return false;
      return true;
    });
  }, [allRows, selectedCity, selectedCategory]);

  // When a vendor is unshortlisted, drop it from the local list
  const handleShortlistChange = (leadId, isShortlisted) => {
    if (!isShortlisted) {
      setAllRows((rs) => rs.filter((r) => r.id !== leadId));
    }
  };

  // When a vendor is deleted entirely, drop it from the local list too
  const handleDelete = (leadId) => {
    setAllRows((rs) => rs.filter((r) => r.id !== leadId));
  };

  const clearFilters = () => {
    setSelectedCity("");
    setSelectedCategory("");
  };

  const hasFilters = selectedCity || selectedCategory;

  return (
    <div>
      <div className="card">
        <h2>Shortlisted Vendors</h2>
        <p className="card-desc">
          Vendors you've personally verified and saved for future use.
          Filter by city or category, or click the ★ icon to remove a vendor.
        </p>

        {allRows.length > 0 && (
          <>
            <div className="filter-row">
              <div className="field">
                <label>City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedCategory("");
                  }}
                >
                  <option value="">All Cities ({cities.length})</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {categories.length > 0 && (
                <div className="field">
                  <label>Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories ({categories.length})</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {hasFilters && (
                <div className="field field-small">
                  <label>&nbsp;</label>
                  <button
                    type="button"
                    className="btn-secondary btn-clear-filter"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            <p className="info-text">
              Showing <strong>{filteredRows.length}</strong> of {allRows.length} shortlisted vendors
            </p>
          </>
        )}

        {loading && <p className="loading-text">Loading...</p>}
        {message && !loading && <p className="info-text">{message}</p>}
      </div>

      {filteredRows.length > 0 && !loading && (
        <ResultsTable
          rows={filteredRows}
          fromCache={true}
          onShortlistChange={handleShortlistChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
