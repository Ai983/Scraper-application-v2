function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // If contains comma, quote, newline — wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(rows) {
  const headers = [
    "#", "Business Name", "Phone", "Address", "GST", "Category",
    "City", "Rating", "Reviews", "Website", "Source URL",
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
    ].join(","));
  });

  // BOM so Excel renders UTF-8 (Hindi/special chars) correctly
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

export default function ResultsTable({ rows, fromCache }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="card results-card">
      <div className="results-header">
        <div>
          <h2>Results ({rows.length})</h2>
          {fromCache && <span className="badge badge-cached">From saved data</span>}
          {!fromCache && <span className="badge badge-fresh">Fresh search</span>}
        </div>
        <button
          type="button"
          className="btn-download"
          onClick={() => downloadCSV(rows)}
          aria-label="Download results as Excel/CSV"
        >
          ⬇ Download Excel
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
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
            {rows.map((r, i) => (
              <tr key={r.id || r.place_id || i}>
                <td className="cell-num">{i + 1}</td>
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
