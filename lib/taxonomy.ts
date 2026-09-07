import { useEffect, useState } from "react";

import { supabase, CATEGORIES, PROGRAM_TYPES } from "./supabase";

export type Taxonomy = {
  /** Category names exactly as the admin entered them (Kulliyya = whole team). */
  categories: string[];
  /** Item types (Stage, Non-stage, Sports, Group…) exactly as the admin entered them. */
  types: string[];
  /** Item types the admin marked as group kinds. */
  groupTypes: string[];
  loading: boolean;
};

const FALLBACK: Omit<Taxonomy, "loading"> = {
  categories: [...CATEGORIES],
  types: [...PROGRAM_TYPES],
  groupTypes: ["Group"],
};

let cache: Omit<Taxonomy, "loading"> | null = null;

export async function fetchTaxonomy(): Promise<Omit<Taxonomy, "loading">> {
  const [cats, items] = await Promise.all([
    supabase.from("categories").select("name,sort").order("sort"),
    supabase.from("category_items").select("name,kind,sort").order("sort"),
  ]);
  const categories = (cats.data ?? []).map((c) => (c as { name: string }).name);
  const rows = (items.data ?? []) as { name: string; kind: string }[];
  const next = {
    categories: categories.length ? categories : FALLBACK.categories,
    types: rows.length ? rows.map((r) => r.name) : FALLBACK.types,
    groupTypes: rows.filter((r) => r.kind === "Group").map((r) => r.name),
  };
  cache = next;
  return next;
}

/** Categories and item types come from the admin-managed lists, never hardcoded. */
export function useTaxonomy(): Taxonomy {
  const [value, setValue] = useState(cache ?? FALLBACK);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let active = true;
    void fetchTaxonomy()
      .then((next) => {
        if (active) setValue(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const channel = supabase
      .channel(`taxonomy-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        void fetchTaxonomy().then((n) => active && setValue(n));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "category_items" }, () => {
        void fetchTaxonomy().then((n) => active && setValue(n));
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { ...value, loading };
}
