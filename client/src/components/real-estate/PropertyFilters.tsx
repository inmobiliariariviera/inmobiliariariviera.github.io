import { MapPin } from "lucide-react";
import { PROPERTY_CATEGORIES } from "@/lib/propertyCategories";
import { LOCATION_SCOPE_LABELS, type LocationScope } from "@/lib/locationScopes";
import type { PropertyCategoryFilter, PropertyOperationFilter } from "@/lib/propertyFilters";

export type PropertyFilterValues = {
  operation: PropertyOperationFilter;
  category: PropertyCategoryFilter;
  locationScope: LocationScope;
  priceCurrency: "all" | "USD" | "ARS";
  priceMin: string;
  priceMax: string;
  surfaceMin: string;
  surfaceMax: string;
};

type Props = {
  idPrefix: string;
  values: PropertyFilterValues;
  onChange: <K extends keyof PropertyFilterValues>(key: K, value: PropertyFilterValues[K]) => void;
};

export default function PropertyFilters({ idPrefix, values, onChange }: Props) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="property-filter-fields">
      <label className="property-filter-field" htmlFor={id("operation")}>
        <span>Operación</span>
        <select id={id("operation")} value={values.operation} onChange={(event) => onChange("operation", event.target.value as PropertyOperationFilter)}>
          <option value="Todas">Venta y alquiler</option>
          <option value="Venta">Venta</option>
          <option value="Alquiler">Alquiler</option>
        </select>
      </label>
      <label className="property-filter-field" htmlFor={id("category")}>
        <span>Tipo de propiedad</span>
        <select id={id("category")} value={values.category} onChange={(event) => onChange("category", event.target.value as PropertyCategoryFilter)}>
          <option value="Todas">Todos los tipos</option>
          {PROPERTY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      <label className="property-filter-field" htmlFor={id("location")}>
        <span><MapPin size={14} aria-hidden="true" /> Ubicación</span>
        <select id={id("location")} value={values.locationScope} onChange={(event) => onChange("locationScope", event.target.value as LocationScope)}>
          <option value="all">Todas las zonas permitidas</option>
          <option value="traslasierra">{LOCATION_SCOPE_LABELS.traslasierra}</option>
          <option value="merlo">{LOCATION_SCOPE_LABELS.merlo}</option>
        </select>
      </label>
      <label className="property-filter-field" htmlFor={id("currency")}>
        <span>Moneda del precio</span>
        <select id={id("currency")} value={values.priceCurrency} onChange={(event) => onChange("priceCurrency", event.target.value as PropertyFilterValues["priceCurrency"])}>
          <option value="all">Todas las monedas</option>
          <option value="USD">Dólares · USD</option>
          <option value="ARS">Pesos · ARS</option>
        </select>
      </label>
      <fieldset className="property-filter-field property-filter-range">
        <legend>Rango de precio</legend>
        <div>
          <label htmlFor={id("price-min")} className="sr-only">Precio mínimo, en la moneda publicada</label>
          <input id={id("price-min")} type="number" min="0" step="any" inputMode="decimal" placeholder="Mínimo" value={values.priceMin} disabled={values.priceCurrency === "all"} aria-describedby={id("price-range-help")} onChange={(event) => onChange("priceMin", event.target.value)} />
          <span aria-hidden="true">—</span>
          <label htmlFor={id("price-max")} className="sr-only">Precio máximo, en la moneda publicada</label>
          <input id={id("price-max")} type="number" min="0" step="any" inputMode="decimal" placeholder="Máximo" value={values.priceMax} disabled={values.priceCurrency === "all"} aria-describedby={id("price-range-help")} onChange={(event) => onChange("priceMax", event.target.value)} />
        </div>
        <small id={id("price-range-help")}>{values.priceCurrency === "all" ? "Elegí USD o ARS para habilitar el rango." : `El rango se compara en ${values.priceCurrency}, sin conversión.`}</small>
      </fieldset>
      <fieldset className="property-filter-field property-filter-range">
        <legend>Superficie · m²</legend>
        <div>
          <label htmlFor={id("surface-min")} className="sr-only">Superficie mínima en metros cuadrados</label>
          <input id={id("surface-min")} type="number" min="0" step="any" inputMode="decimal" placeholder="Mínima" value={values.surfaceMin} onChange={(event) => onChange("surfaceMin", event.target.value)} />
          <span aria-hidden="true">—</span>
          <label htmlFor={id("surface-max")} className="sr-only">Superficie máxima en metros cuadrados</label>
          <input id={id("surface-max")} type="number" min="0" step="any" inputMode="decimal" placeholder="Máxima" value={values.surfaceMax} onChange={(event) => onChange("surfaceMax", event.target.value)} />
        </div>
        <small>Las hectáreas se expresan como m² equivalentes.</small>
      </fieldset>
    </div>
  );
}
