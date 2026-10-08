import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, CATEGORIES, TABLES, money } from "./config";
import ProductForm from "./ProductForm";

const PAGE_SIZE = 8;

export default function Dashboard({ user }) {
  const [view, setView] = useState("overview");
  const [table, setTable] = useState("cat_products");
  const [items, setItems] = useState([]);
  const [analyticsItems, setAnalyticsItems] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // product | {} (new) | null
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg, bad = false) => {
    setToast({ msg, bad });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id", { ascending: false });
    if (error) setError(error.message);
    else {
      setItems(data);
      setCounts((c) => ({ ...c, [table]: data.length }));
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    async function loadAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      const results = await Promise.all(
        Object.keys(TABLES).map(async (name) => {
          const { data, error } = await supabase
            .from(name)
            .select("*")
            .order("id", { ascending: false });
          return { name, data, error };
        }),
      );

      if (!active) return;
      const failed = results.find((result) => result.error);
      if (failed) setAnalyticsError(failed.error.message);
      const available = results.filter((result) => !result.error);
      setCounts(
        Object.fromEntries(
          available.map(({ name, data }) => [name, data.length]),
        ),
      );
      setAnalyticsItems(
        available.flatMap(({ name, data }) =>
          data.map((item) => ({ ...item, collection: name })),
        ),
      );
      setAnalyticsLoading(false);
    }
    loadAnalytics();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) =>
      e.key === "Escape" && (setEditing(null), setDeleting(null));
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const switchTable = (t) => {
    setView("products");
    setTable(t);
    setQ("");
    setCat("");
    setPage(1);
  };

  const totalProducts = Object.values(counts).reduce(
    (total, count) => total + count,
    0,
  );
  const discountedProducts = analyticsItems.filter(
    (item) => Number(item.old_price) > Number(item.new_price),
  );
  const pricedProducts = analyticsItems.filter(
    (item) =>
      Number.isFinite(Number(item.new_price)) && item.new_price !== null,
  );
  const averagePrice = pricedProducts.length
    ? pricedProducts.reduce(
        (total, item) => total + Number(item.new_price),
        0,
      ) / pricedProducts.length
    : null;
  const latestProducts = [...analyticsItems]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!s || String(p.name).toLowerCase().includes(s) || String(p.id) === s),
    );
  }, [items, q, cat]);
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = list.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstItem = list.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(currentPage * PAGE_SIZE, list.length);

  async function remove() {
    const { error } = await supabase.from(table).delete().eq("id", deleting.id);
    if (error) return notify(error.message, true);
    setDeleting(null);
    notify("Product deleted");
    load();
  }

  return (
    <div id="app">
      <aside>
        <h2>
          Shopper<span>.</span> Admin
        </h2>
        <div>
          {Object.entries(TABLES).map(([k, v]) => (
            <button
              key={k}
              className={
                "tab" + (view === "products" && k === table ? " on" : "")
              }
              style={{ width: "100%" }}
              onClick={() => switchTable(k)}
            >
              {v.label}
              <small>{counts[k] ?? ""}</small>
            </button>
          ))}
          <button
            className={"tab" + (view === "overview" ? " on" : "")}
            style={{ width: "100%", order: -1 }}
            onClick={() => setView("overview")}
          >
            Overview
          </button>
        </div>
        <div className="side-foot">
          <div>{user.email}</div>
          <button className="btn sm" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main>
        {view === "overview" ? (
          <>
            <div className="head overview-head">
              <div>
                <span className="eyebrow">STORE SNAPSHOT</span>
                <h1>Dashboard</h1>
                <p>Your product catalog at a glance.</p>
              </div>
              <button
                className="btn primary"
                onClick={() => {
                  setTable("cat_products");
                  setView("products");
                  setEditing({});
                }}
              >
                Add product
              </button>
            </div>

            {analyticsError && (
              <div className="overview-alert">
                Some catalog data could not be loaded: {analyticsError}
              </div>
            )}

            <div className="metric-grid">
              <section className="metric metric-primary">
                <span>Products across collections</span>
                <strong>{analyticsLoading ? "..." : totalProducts}</strong>
                <small>{Object.keys(TABLES).length} product collections</small>
              </section>
              <section className="metric">
                <span>On sale</span>
                <strong>
                  {analyticsLoading ? "..." : discountedProducts.length}
                </strong>
                <small>Products with a reduced price</small>
              </section>
              <section className="metric">
                <span>Average listed price</span>
                <strong>
                  {analyticsLoading
                    ? "..."
                    : averagePrice == null
                      ? "–"
                      : money(averagePrice)}
                </strong>
                <small>Across products with a price</small>
              </section>
            </div>

            <div className="overview-grid">
              <section className="overview-panel category-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Catalog by category</h2>
                    <p>Products assigned a category</p>
                  </div>
                </div>
                {CATEGORIES.map((category) => {
                  const count = analyticsItems.filter(
                    (item) => item.category === category,
                  ).length;
                  const share = analyticsItems.length
                    ? Math.round((count / analyticsItems.length) * 100)
                    : 0;
                  return (
                    <div className="category-row" key={category}>
                      <div className="category-label">
                        <span>{category}</span>
                        <strong>{analyticsLoading ? "..." : count}</strong>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {!analyticsLoading && analyticsItems.length === 0 && (
                  <p className="panel-empty">No catalog data available yet.</p>
                )}
              </section>

              <section className="overview-panel collection-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Collections</h2>
                    <p>Inventory by storefront placement</p>
                  </div>
                </div>
                {Object.entries(TABLES).map(([name, collection]) => (
                  <button
                    className="collection-row"
                    key={name}
                    onClick={() => switchTable(name)}
                  >
                    <span>
                      <strong>{collection.label}</strong>
                      <small>{collection.sub}</small>
                    </span>
                    <b>{analyticsLoading ? "..." : (counts[name] ?? 0)}</b>
                  </button>
                ))}
              </section>
            </div>

            <section className="overview-panel recent-panel">
              <div className="panel-heading">
                <div>
                  <h2>Recently added</h2>
                  <p>Latest products across your collections</p>
                </div>
              </div>
              {latestProducts.length ? (
                <div className="recent-list">
                  {latestProducts.map((item, index) => (
                    <div
                      className="recent-row"
                      key={`${item.collection}-${item.id}-${index}`}
                    >
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.visibility = "hidden";
                        }}
                      />
                      <div className="recent-name">
                        <strong>{item.name || "Untitled product"}</strong>
                        <small>
                          {TABLES[item.collection].label} ·{" "}
                          {item.category || "Uncategorized"}
                        </small>
                      </div>
                      <span className="recent-price">
                        {money(item.new_price)}
                      </span>
                      <time>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : "Date unavailable"}
                      </time>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-empty">
                  {analyticsLoading
                    ? "Loading catalog..."
                    : "No products have been added yet."}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="head">
              <div>
                <h1>{TABLES[table].label}</h1>
                <p>{TABLES[table].sub}</p>
              </div>
              <button className="btn primary" onClick={() => setEditing({})}>
                Add product
              </button>
            </div>

            <div className="tools">
              <input
                type="search"
                placeholder="Search by name or id"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              {TABLES[table].hasCategory && (
                <select
                  value={cat}
                  onChange={(e) => {
                    setCat(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    {TABLES[table].hasCategory && <th>Category</th>}
                    <th>Price</th>
                    <th>Was</th>
                    <th>Discount</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <img
                          className="thumb"
                          src={p.image}
                          alt=""
                          loading="lazy"
                          onError={(e) =>
                            (e.currentTarget.style.visibility = "hidden")
                          }
                        />
                      </td>
                      <td className="name">
                        {p.name}
                        <div className="hint">ID {p.id}</div>
                      </td>
                      {TABLES[table].hasCategory && (
                        <td>
                          <span className="pill">{p.category}</span>
                        </td>
                      )}
                      <td>{money(p.new_price)}</td>
                      <td className="old">{money(p.old_price)}</td>
                      <td className="off">
                        {p.old_price > p.new_price
                          ? Math.round((1 - p.new_price / p.old_price) * 100) +
                            "% off"
                          : "–"}
                      </td>
                      <td>
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString()
                          : "–"}
                      </td>
                      <td>
                        <div className="acts">
                          <button
                            className="btn sm"
                            onClick={() => setEditing(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn sm"
                            onClick={() => setDeleting(p)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(loading || error || list.length === 0) && (
                <div className="empty">
                  {loading
                    ? "Loading products…"
                    : error
                      ? "Could not load products: " + error
                      : items.length
                        ? "No products match your search."
                        : "No products yet. Select “Add product” to create the first one."}
                </div>
              )}
              {list.length > 0 && !loading && !error && (
                <nav className="pagination" aria-label="Product table pagination">
                  <span className="pagination-summary">
                    Showing {firstItem}–{lastItem} of {list.length} products
                  </span>
                  <div className="pagination-controls">
                    <button
                      className="page-button"
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Previous
                    </button>
                    {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                      (pageNumber) => (
                        <button
                          className={`page-button page-number${pageNumber === currentPage ? " active" : ""}`}
                          type="button"
                          key={pageNumber}
                          aria-label={`Page ${pageNumber}`}
                          aria-current={pageNumber === currentPage ? "page" : undefined}
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ),
                    )}
                    <button
                      className="page-button"
                      type="button"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </div>
          </>
        )}
      </main>

      {editing && (
        <ProductForm
          table={table}
          product={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            notify(msg);
            load();
          }}
          onError={(m) => notify(m, true)}
        />
      )}

      {deleting && (
        <div className="overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <h3>Delete this product?</h3>
            <p style={{ color: "var(--mute)", margin: "0 0 18px" }}>
              “{deleting.name}” will be removed from{" "}
              {TABLES[table].label.toLowerCase()}. This can't be undone.
            </p>
            <div className="foot">
              <button className="btn" onClick={() => setDeleting(null)}>
                Keep product
              </button>
              <button className="btn danger" onClick={remove}>
                Delete product
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div id="toast" className={toast.bad ? "bad" : ""}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
