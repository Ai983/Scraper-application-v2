import { useState } from "react";

const KEYWORDS = [
  "Electrical Contractor", "Plumber", "Carpenter", "Painter",
  "Tile Contractor", "Stone Contractor", "HVAC Contractor",
  "False Ceiling Contractor", "Interior Designer", "Civil Contractor",
  "Waterproofing Contractor", "Flooring Contractor", "Welder",
  "Fabricator", "Mason", "Glass Contractor",
];

const CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune",
  "Kolkata", "Gurgaon", "Noida", "Jaipur", "Ahmedabad", "Lucknow",
  "Chandigarh", "Indore", "Ludhiana", "Ghaziabad", "Faridabad",
  "Nagpur", "Bhopal", "Patna", "Kochi",
];

export default function SearchForm({ onSearch, loading }) {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [maxResults, setMaxResults] = useState(5);

  const clamp = (n) => Math.min(50, Math.max(1, n));
  const decResults = () => setMaxResults((n) => clamp(n - 1));
  const incResults = () => setMaxResults((n) => clamp(n + 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      alert("Enter both keyword and city");
      return;
    }
    onSearch(keyword.trim(), city.trim(), maxResults);
  };

  return (
    <div className="card search-card">
      <h2>Search Vendors & Contractors</h2>
      <p className="card-desc">
        Search Google's verified business database. Results are saved automatically
        so you don't have to search again.
      </p>

      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-row">
          <div className="field">
            <label>Keyword / Trade</label>
            <input
              type="text"
              placeholder="e.g. Painter"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={loading}
              list="kw-list"
            />
            <datalist id="kw-list">
              {KEYWORDS.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>

          <div className="field">
            <label>City</label>
            <input
              type="text"
              placeholder="e.g. Delhi"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
              list="city-list"
            />
            <datalist id="city-list">
              {CITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="field field-small">
            <label>Max Results</label>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={decResults}
                disabled={loading || maxResults <= 1}
                aria-label="Decrease"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="50"
                value={maxResults}
                onChange={(e) => setMaxResults(clamp(Number(e.target.value) || 1))}
                disabled={loading}
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={incResults}
                disabled={loading || maxResults >= 50}
                aria-label="Increase"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
    </div>
  );
}
