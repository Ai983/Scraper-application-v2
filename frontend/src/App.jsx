import { useState, useEffect } from "react";
import { api } from "./services/api";
import SearchForm from "./components/SearchForm";
import ResultsTable from "./components/ResultsTable";
import SavedData from "./components/SavedData";
import Shortlisted from "./components/Shortlisted";

export default function App() {
  const [view, setView] = useState("search"); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [lastSearch, setLastSearch] = useState({ keyword: "", city: "", maxResults: 10 });

  const handleSearch = async (keyword, city, maxResults) => {
    setLoading(true);
    setMessage("");
    setResults([]);
    setFromCache(false);
    setLastSearch({ keyword, city, maxResults });

    try {
      const res = await api.search(keyword, city, maxResults);
      const data = res.data;
      setResults(data.rows || []);
      setFromCache(data.from_cache || false);
      setMessage(data.message || "");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Search failed. Check your API key and try again.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFreshSearch = async () => {
    if (!lastSearch.keyword || !lastSearch.city) return;
    setLoading(true);
    setMessage("");
    setResults([]);
    setFromCache(false);

    try {
      const res = await api.searchFresh(lastSearch.keyword, lastSearch.city, lastSearch.maxResults);
      const data = res.data;
      setResults(data.rows || []);
      setFromCache(false);
      setMessage(data.message || "");
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Fresh search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1 className="logo">Hagerstone <span>Data Scraper</span></h1>
          <nav className="nav">
            <button
              className={`nav-btn ${view === "search" ? "active" : ""}`}
              onClick={() => setView("search")}
            >
              Search
            </button>
            <button
              className={`nav-btn ${view === "saved" ? "active" : ""}`}
              onClick={() => setView("saved")}
            >
              Saved Data
            </button>
            <button
              className={`nav-btn ${view === "shortlisted" ? "active" : ""}`}
              onClick={() => setView("shortlisted")}
            >
              Shortlisted
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {view === "search" && (
          <>
            <SearchForm onSearch={handleSearch} loading={loading} />

            {loading && (
              <div className="loading-card">
                <div className="spinner"></div>
                <p>Searching...</p>
                <p className="loading-sub">This may take 30-60 seconds</p>
              </div>
            )}

            {message && !loading && (
              <div className={`message-card ${fromCache ? "cached" : "fresh"}`}>
                <p>{message}</p>
                {fromCache && (
                  <button className="btn-secondary" onClick={handleFreshSearch}>
                    Fetch fresh data from Apify
                  </button>
                )}
              </div>
            )}

            {results.length > 0 && !loading && (
              <ResultsTable rows={results} fromCache={fromCache} />
            )}
          </>
        )}

        {view === "saved" && <SavedData />}

        {view === "shortlisted" && <Shortlisted />}
      </main>
    </div>
  );
}
