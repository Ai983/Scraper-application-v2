import { useState, useEffect } from "react";
import { api } from "../services/api";
import ResultsTable from "./ResultsTable";

export default function Shortlisted() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    setMessage("");
    api.getShortlisted()
      .then((res) => {
        const data = res.data;
        setRows(data.rows || []);
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

  // When a vendor is unshortlisted from the table, remove it from this view
  const handleShortlistChange = (leadId, isShortlisted) => {
    if (!isShortlisted) {
      setRows((rs) => rs.filter((r) => r.id !== leadId));
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Shortlisted Vendors</h2>
        <p className="card-desc">
          Vendors you've personally verified and saved for future use.
          Click the ★ icon on a row to remove it from this list.
        </p>

        {loading && <p className="loading-text">Loading...</p>}
        {message && !loading && <p className="info-text">{message}</p>}
      </div>

      {rows.length > 0 && !loading && (
        <ResultsTable
          rows={rows}
          fromCache={true}
          onShortlistChange={handleShortlistChange}
        />
      )}
    </div>
  );
}
