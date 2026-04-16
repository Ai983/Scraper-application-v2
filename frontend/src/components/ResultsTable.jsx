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
