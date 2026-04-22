import { useState, useEffect } from "react";
import { api } from "../services/api";

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(rows) {
  const headers = [
    "#", "Business Name", "Phone", "Address", "GST", "Category",
    "City", "Rating", "Reviews", "Website", "Source URL", "Shortlisted",
  ];

  const lines = [headers.join(",")];
  rows.forEach((r, i) => {
    lines.push([
      i + 1,
      escapeCSV(r.business_name),
      escapeCSV(r.phone),
      escapeCSV(r.address),
      escapeCSV(r.gst),
      escapeCSV(r.category),
      escapeCSV(r.city),
      r.rating ?? "",
      r.reviews ?? 0,
      escapeCSV(r.website),
      escapeCSV(r.source_url),
      r.is_shortlisted ? "yes" : "no",
    ].join(","));
  });

  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hagerstone-leads-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ResultsTable({ rows, fromCache, onShortlistChange }) {
  const [localRows, setLocalRows] = useState(rows);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => setLocalRows(rows), [rows]);

  if (!localRows || localRows.length === 0) return null;

  const toggleShortlist = async (row) => {
    if (!row.id) {
      alert("This lead can't be shortlisted (not saved yet). Please retry the search.");
      return;
    }
    const next = !row.is_shortlisted;
    setPendingId(row.id);
    // Optimistic update
    setLocalRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_shortlisted: next } : r)));
    try {
      await api.setShortlist(row.id, next);
      if (onShortlistChange) onShortlistChange(row.id, next);
    } catch {
      // Revert on error
      setLocalRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, is_shortlisted: !next } : r)));
      alert("Failed to update shortlist. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="card results-card">
      <div className="results-header">
        <div>
          <h2>Results ({localRows.length})</h2>
          {fromCache && <span className="badge badge-cached">From saved data</span>}
          {!fromCache && <span className="badge badge-fresh">Fresh search</span>}
        </div>
        <button
          type="button"
          className="btn-download"
          onClick={() => downloadCSV(localRows)}
        >
          ⬇ Download Excel
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>★</th>
              <th>Business Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>GST</th>
              <th>Category</th>
              <th>Rating</th>
              <th>Website</th>
            </tr>
          </thead>
          <tbody>
            {localRows.map((r, i) => (
              <tr key={r.id || r.place_id || i} className={r.is_shortlisted ? "row-shortlisted" : ""}>
                <td className="cell-num">{i + 1}</td>
                <td className="cell-star">
                  <button
                    type="button"
                    className={`star-btn ${r.is_shortlisted ? "active" : ""}`}
                    onClick={() => toggleShortlist(r)}
                    disabled={pendingId === r.id}
                    aria-label={r.is_shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                    title={r.is_shortlisted ? "Shortlisted (click to remove)" : "Add to shortlist"}
                  >
                    {r.is_shortlisted ? "★" : "☆"}
                  </button>
                </td>
                <td className="cell-name">
                  {r.source_url ? (
                    <a href={r.source_url} target="_blank" rel="noreferrer">{r.business_name}</a>
                  ) : (
                    r.business_name
                  )}
                </td>
                <td className="cell-phone">{r.phone || "—"}</td>
                <td className="cell-addr">{r.address || "—"}</td>
                <td className="cell-gst">{r.gst || "—"}</td>
                <td>{r.category}</td>
                <td className="cell-num">{r.rating || "—"}</td>
                <td className="cell-web">
                  {r.website ? (
                    <a href={r.website} target="_blank" rel="noreferrer">
                      {r.website.replace(/^https?:\/\//, "").slice(0, 30)}
                    </a>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
