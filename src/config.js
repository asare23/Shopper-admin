import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const BUCKET = import.meta.env.VITE_STORAGE_BUCKET || "products";
export const CATEGORIES = ["men", "women", "kids"];
export const TABLES = {
  cat_products: {
    label: "Category products",
    sub: "Items shown on the Men, Women and Kids pages",
    hasCategory: true,
  },
  new_products: {
    label: "New arrivals",
    sub: "Items shown in the new arrivals section",
    hasCategory: false,
  },
  pop_products: {
    label: "Popular products",
    sub: "Items shown in the popular section",
    hasCategory: false,
  },
};
export const money = (n) =>
  n == null || n === ""
    ? "–"
    : Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
