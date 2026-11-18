import { useEffect, useState } from "react";
import { properties as demoProperties, type Property } from "@/data/properties";
import { isSupabaseConfigured, propertyFromRow, supabase, type PropertyRow } from "@/lib/supabase";

type PublicPropertiesState = {
  properties: Property[];
  loading: boolean;
  error: string | null;
  isDemo: boolean;
};

export function usePublicProperties(): PublicPropertiesState {
  const [state, setState] = useState<PublicPropertiesState>({
    properties: isSupabaseConfigured ? [] : demoProperties,
    loading: isSupabaseConfigured,
    error: null,
    isDemo: !isSupabaseConfigured,
  });

  useEffect(() => {
    if (!supabase) {
      setState({ properties: demoProperties, loading: false, error: null, isDemo: true });
      return;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null, isDemo: false }));
    supabase
      .from("properties")
      .select("*")
      .in("status", ["published", "sold", "rented"])
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ properties: [], loading: false, error: error.message, isDemo: false });
          return;
        }
        void resolvePublicProperties((data ?? []) as PropertyRow[]).then((properties) => {
          if (!active) return;
          setState({ properties, loading: false, error: null, isDemo: false });
        }).catch(() => {
          if (!active) return;
          const safeRows = ((data ?? []) as PropertyRow[]).map((row) => ({
            ...row,
            images: (row.images ?? []).filter((image) => /^https?:\/\//i.test(image)),
          }));
          setState({
            properties: safeRows.map(propertyFromRow),
            loading: false,
            error: "No se pudieron cargar algunas fotos. Intentá actualizar la página.",
            isDemo: false,
          });
        });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

async function resolvePublicProperties(rows: PropertyRow[]): Promise<Property[]> {
  if (!supabase || rows.length === 0) return rows.map(propertyFromRow);
  const imagePaths = new Set<string>();
  for (const row of rows) {
    for (const image of row.images ?? []) {
      if (image && !/^https?:\/\//i.test(image)) imagePaths.add(image);
    }
  }

  const signedUrls: Record<string, string> = {};
  const propertyIds = rows.map((row) => row.id);
  for (let index = 0; index < propertyIds.length; index += 100) {
    const { data, error } = await supabase.functions.invoke("public-property-images", {
      body: { property_ids: propertyIds.slice(index, index + 100) },
    });
    if (error) throw error;
    Object.assign(signedUrls, data?.images ?? {});
  }

  return rows.map((row) => propertyFromRow({
    ...row,
    images: (row.images ?? [])
      .map((image) => (/^https?:\/\//i.test(image) ? image : signedUrls[image]))
      .filter((image): image is string => Boolean(image)),
  }));
}
