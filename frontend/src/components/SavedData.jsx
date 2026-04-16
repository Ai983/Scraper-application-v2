import { useState, useEffect } from "react";
import { api } from "../services/api";
import ResultsTable from "./ResultsTable";

export default function SavedData() {
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load cities on mount
  useEffect(() => {
    api.getCities()
      .then((res) => setCities(res.data.cities || []))
      .catch(() => setMessage("Could not load cities"));
  }, []);

  // Load categories when city changes
  useEffect(() => {
    if (!selectedCity) {
      setCategories([]);
      setSelectedCategory("");
      setRows([]);
      return;
    }
    api.getCategories(selectedCity)
      .then((res) => setCategories(res.data.categories || []))
      .catch(() => {});
  }, [selectedCity]);

  // Load data only when BOTH city and category are selected
  useEffect(() => {
    if (!selectedCity || !selectedCategory) {
      setRows([]);
      setMessage("");
      return;
    }
    setLoading(true);
    setMessage("");

    api.getLeads(selectedCity, selectedCategory)
      .then((res) => {
        const data = res.data;
        setRows(data.rows || []);
        if (data.rows.length === 0) {
          setMessage(`No data found for ${selectedCity} → ${selectedCategory}`);
        }
      })
      .catch(() => setMessage("Failed to load data"))
      .finally(() => setLoading(false));
  }, [selectedCity, selectedCategory]);

  return (
    <div>
      <div className="card">
        <h2>Saved Data</h2>
        <p className="card-desc">
          Browse previously searched vendor data stored in the database.
          Select both a city and a category to view results.
        </p>

        <div className="filter-row">
          <div className="field">
            <label>City</label>
            <select
              value={selectedCity}
              onChange={(e) => { setSelectedCity(e.target.value); setSelectedCategory(""); }}
            >
              <option value="">— Select City —</option>
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
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading && <p className="loading-text">Loading...</p>}
        {message && !loading && <p className="info-text">{message}</p>}
      </div>

      {rows.length > 0 && !loading && (
        <ResultsTable rows={rows} fromCache={true} />
      )}
    </div>
  );
}
