import { useState } from "react";
import { supabase, BUCKET, CATEGORIES, TABLES } from "./config";

export default function ProductForm({
  table,
  product,
  onClose,
  onSaved,
  onError,
}) {
  const edit = !!product;
  const hasCategory = TABLES[table].hasCategory;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? CATEGORIES[0],
    new_price: product?.new_price ?? "",
    old_price: product?.old_price ?? "",
    image: product?.image ?? "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(product?.image ?? "");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function pickFile(e) {
    const f = e.target.files[0];
    setFile(f || null);
    if (f) setPreview(URL.createObjectURL(f));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      let image = form.image.trim();
      if (file) {
        const path = `${table}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type });
        if (up.error)
          throw new Error("Image upload failed: " + up.error.message);
        image = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }
      if (!image) throw new Error("Add an image file or link.");
      const row = {
        name: form.name.trim(),
        ...(hasCategory && { category: form.category }),
        image,
        new_price: Number(form.new_price),
        old_price: Number(form.old_price),
      };
      const res = edit
        ? await supabase.from(table).update(row).eq("id", product.id)
        : await supabase.from(table).insert(row);
      if (res.error) throw new Error(res.error.message);
      onSaved(edit ? "Product updated" : "Product added");
    } catch (err) {
      onError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h3>{edit ? "Edit product" : "Add product"}</h3>

        <div className="field">
          <label htmlFor="f_name">Name</label>
          <input
            id="f_name"
            required
            autoFocus
            value={form.name}
            onChange={set("name")}
          />
        </div>

        {hasCategory && (
          <div className="field">
            <label htmlFor="f_cat">Category</label>
            <select id="f_cat" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="row">
          <div className="field">
            <label htmlFor="f_new">Price</label>
            <input
              id="f_new"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.new_price}
              onChange={set("new_price")}
            />
          </div>
          <div className="field">
            <label htmlFor="f_old">Old price</label>
            <input
              id="f_old"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.old_price}
              onChange={set("old_price")}
            />
          </div>
        </div>

        <div className="field">
          <label>Image</label>
          <div className="imgbox">
            {preview && (
              <img
                src={preview}
                alt=""
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                onLoad={(e) => (e.currentTarget.style.visibility = "visible")}
              />
            )}
            <div className="col">
              <input type="file" accept="image/*" onChange={pickFile} />
              <div className="hint">Or paste an image link:</div>
              <input
                placeholder="https://…"
                value={form.image}
                style={{ marginTop: 4 }}
                onChange={(e) => {
                  set("image")(e);
                  setPreview(e.target.value);
                  setFile(null);
                }}
              />
            </div>
          </div>
        </div>

        <div className="foot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {edit ? "Save changes" : "Add product"}
          </button>
        </div>
      </form>
    </div>
  );
}
