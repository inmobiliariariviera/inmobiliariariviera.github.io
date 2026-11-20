import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, Building2, CalendarDays, Check, ClipboardList, Download, FileClock, FileText,
  FolderOpen, LoaderCircle, LockKeyhole, Plus, Receipt, Save, Search, ShieldCheck, UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import type { PropertyRow } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "admin" | "manager" | "secretary";
type Dossier = {
  id: string; property_id: string; tenant_name: string; tenant_phone: string | null; tenant_email: string | null;
  contract_start: string | null; contract_end: string | null; current_rent: number | string; rent_currency: "ARS" | "USD";
  increase_index: string; increase_interval_months: number | null; next_increase_on: string | null;
  status: "draft" | "active" | "ended" | "cancelled"; notes: string; created_at: string; updated_at: string;
};
type RentalEvent = {
  id: string; dossier_id: string; event_type: "rent_increase" | "payment" | "repair" | "inspection" | "notice" | "document" | "contract" | "other";
  title: string; description: string; occurred_on: string; due_on: string | null; paid_on: string | null;
  payment_status: "pending" | "paid" | "late" | "partial" | null; amount: number | string | null; currency: "ARS" | "USD" | null;
  previous_rent: number | string | null; new_rent: number | string | null; effective_on: string | null;
  index_name: string | null; reference: string | null; document_path: string | null; created_at: string;
};
type Settlement = {
  id: string; dossier_id: string; period_start: string; period_end: string; gross_rent: number | string;
  deductions: number | string; net_to_owner: number | string; currency: "ARS" | "USD"; status: "draft" | "ready" | "paid";
  paid_at: string | null; notes: string; created_at: string;
};
type AuditEntry = {
  id: number; property_id: string; actor_id: string | null; actor_email: string | null; action: string;
  entity_table: string; entity_id: string; old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null; created_at: string;
};
type DossierDraft = {
  tenant_name: string; tenant_phone: string; tenant_email: string; contract_start: string; contract_end: string;
  current_rent: string; rent_currency: "ARS" | "USD"; increase_index: string; increase_interval_months: string;
  next_increase_on: string; status: Dossier["status"]; notes: string;
};
type EventDraft = {
  event_type: RentalEvent["event_type"]; title: string; description: string; occurred_on: string; due_on: string;
  paid_on: string; payment_status: "pending" | "paid" | "late" | "partial"; amount: string;
  currency: "ARS" | "USD"; reference: string;
};
type SettlementDraft = {
  period_start: string; period_end: string; gross_rent: string; deductions: string; currency: "ARS" | "USD";
  status: Settlement["status"]; paid_at: string; notes: string;
};

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const blankDraft = (property?: PropertyRow): DossierDraft => ({
  tenant_name: "", tenant_phone: "", tenant_email: "", contract_start: "", contract_end: "",
  current_rent: property ? String(property.price) : "0", rent_currency: property?.currency ?? "ARS",
  increase_index: "", increase_interval_months: "", next_increase_on: "", status: "draft", notes: "",
});
const fromDossier = (item: Dossier): DossierDraft => ({
  tenant_name: item.tenant_name ?? "", tenant_phone: item.tenant_phone ?? "", tenant_email: item.tenant_email ?? "",
  contract_start: item.contract_start ?? "", contract_end: item.contract_end ?? "", current_rent: String(item.current_rent ?? 0),
  rent_currency: item.rent_currency, increase_index: item.increase_index ?? "",
  increase_interval_months: item.increase_interval_months == null ? "" : String(item.increase_interval_months),
  next_increase_on: item.next_increase_on ?? "", status: item.status, notes: item.notes ?? "",
});
const blankEvent = (): EventDraft => ({
  event_type: "payment", title: "Pago de alquiler", description: "", occurred_on: today(), due_on: "", paid_on: today(),
  payment_status: "paid", amount: "", currency: "ARS", reference: "",
});
const blankSettlement = (): SettlementDraft => ({
  period_start: "", period_end: "", gross_rent: "", deductions: "0", currency: "ARS", status: "draft", paid_at: "", notes: "",
});
const eventNames: Record<RentalEvent["event_type"], string> = {
  rent_increase: "Aumento de alquiler", payment: "Pago de alquiler", repair: "Reparación", inspection: "Inspección",
  notice: "Aviso / comunicación", document: "Documento", contract: "Contrato", other: "Otro evento",
};
const eventOptions: Array<Exclude<RentalEvent["event_type"], "rent_increase">> = ["payment", "repair", "inspection", "notice", "document", "contract", "other"];
const statusNames: Record<Dossier["status"], string> = { draft: "Borrador", active: "Activo", ended: "Finalizado", cancelled: "Cancelado" };
const paymentNames: Record<NonNullable<RentalEvent["payment_status"]>, string> = { pending: "Pendiente", paid: "Pagado", late: "Atrasado", partial: "Parcial" };
const settlementNames: Record<Settlement["status"], string> = { draft: "Borrador", ready: "Listo para liquidar", paid: "Pagado" };
const auditNames: Record<string, string> = { INSERT: "Creación", UPDATE: "Edición", DELETE: "Eliminación", rental_dossiers: "Expediente", rental_events: "Evento", rental_owner_settlements: "Liquidación" };
const auditFields: Record<string, string> = {
  tenant_name: "Inquilino/a", tenant_phone: "Teléfono", tenant_email: "Email", contract_start: "Inicio de contrato",
  contract_end: "Fin de contrato", current_rent: "Canon vigente", rent_currency: "Moneda", increase_index: "Índice",
  increase_interval_months: "Intervalo de ajuste (meses)", next_increase_on: "Próximo ajuste", status: "Estado",
  notes: "Notas", title: "Título", description: "Detalle", occurred_on: "Fecha", due_on: "Vencimiento",
  paid_on: "Fecha de pago", payment_status: "Estado de pago", amount: "Importe", currency: "Moneda",
  previous_rent: "Canon anterior", new_rent: "Canon nuevo", effective_on: "Vigente desde", index_name: "Índice aplicado",
  reference: "Referencia", document_path: "Documento adjunto", period_start: "Inicio del período", period_end: "Fin del período",
  gross_rent: "Alquiler bruto", deductions: "Deducciones", net_to_owner: "Neto al propietario", paid_at: "Fecha de liquidación",
};
const allowedDocuments = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const formatDate = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("es-AR", { dateStyle: "medium" }) : "Sin definir";
const money = (value: number | string | null | undefined, currency: "ARS" | "USD" | null = "ARS") =>
  value == null ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: currency ?? "ARS", maximumFractionDigits: 2 }).format(Number(value));
const readableSnapshot = (values: Record<string, unknown> | null) => Object.entries(values ?? {})
  .filter(([key, value]) => key in auditFields && value !== null && value !== "" && value !== undefined)
  .map(([key, value]) => `${auditFields[key]}: ${String(value)}`);

export default function RentalDossiersPanel({ properties, role, currentUserId }: { properties: PropertyRow[]; role: Role; currentUserId: string }) {
  const client = supabase;
  const isAdmin = role === "owner" || role === "admin";
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [events, setEvents] = useState<RentalEvent[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [draft, setDraft] = useState<DossierDraft>(blankDraft());
  const [eventDraft, setEventDraft] = useState<EventDraft>(blankEvent());
  const [increaseDraft, setIncreaseDraft] = useState({ newRent: "", currency: "ARS" as "ARS" | "USD", effectiveOn: today(), indexName: "", reference: "", description: "" });
  const [settlementDraft, setSettlementDraft] = useState<SettlementDraft>(blankSettlement());
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [existingRentalPropertyIds, setExistingRentalPropertyIds] = useState<Set<string>>(() => new Set());
  const selectedProperty = properties.find((item) => item.id === selectedPropertyId) ?? null;

  const folderProperties = useMemo(() => properties
    .filter((item) => item.operation === "Alquiler" || existingRentalPropertyIds.has(item.id)), [properties, existingRentalPropertyIds]);
  const filteredProperties = useMemo(() => folderProperties
    .filter((item) => `${item.title} ${item.location} ${item.region}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title, "es")), [folderProperties, query]);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.from("rental_dossiers").select("property_id").limit(1000).then(({ data, error }) => {
      if (!active) return;
      if (error) { toast.error(`No se pudieron listar las carpetas existentes: ${error.message}`); return; }
      setExistingRentalPropertyIds(new Set((data ?? []).map((item: { property_id: string }) => item.property_id)));
    });
    return () => { active = false; };
  }, [client]);

  useEffect(() => {
    if (!client || !selectedPropertyId) {
      setDossier(null); setEvents([]); setAudit([]); setSettlements([]); setDraft(blankDraft(selectedProperty ?? undefined));
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await client.from("rental_dossiers").select("*").eq("property_id", selectedPropertyId).maybeSingle();
      if (!active) return;
      if (error) {
        toast.error(`No se pudo cargar la carpeta de alquiler: ${error.message}`);
        setDossier(null); setEvents([]); setAudit([]); setSettlements([]); setLoading(false); return;
      }
      const item = data as Dossier | null;
      setDossier(item);
      setDraft(item ? fromDossier(item) : blankDraft(selectedProperty ?? undefined));
      if (!item) {
        setEvents([]); setAudit([]); setSettlements([]); setLoading(false); return;
      }
      const [eventResult, auditResult, settlementResult] = await Promise.all([
        client.from("rental_events").select("*").eq("dossier_id", item.id).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(100),
        isAdmin ? client.from("rental_activity_audit").select("*").eq("property_id", selectedPropertyId).order("created_at", { ascending: false }).limit(150) : Promise.resolve({ data: [], error: null }),
        isAdmin ? client.from("rental_owner_settlements").select("*").eq("dossier_id", item.id).order("period_end", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      ]);
      if (!active) return;
      if (eventResult.error) toast.error(`No se pudo cargar la cronología: ${eventResult.error.message}`);
      if (auditResult.error) toast.error(`No se pudo cargar la auditoría interna: ${auditResult.error.message}`);
      if (settlementResult.error) toast.error(`No se pudieron cargar las liquidaciones: ${settlementResult.error.message}`);
      setEvents((eventResult.data ?? []) as RentalEvent[]);
      setAudit((auditResult.data ?? []) as AuditEntry[]);
      setSettlements((settlementResult.data ?? []) as Settlement[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [client, selectedPropertyId, isAdmin, refreshVersion]);

  const saveDossier = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !selectedProperty || !isAdmin) return;
    const rent = Number(draft.current_rent);
    if (!Number.isFinite(rent) || rent < 0) { toast.error("Ingresá un canon válido."); return; }
    if (draft.contract_start && draft.contract_end && draft.contract_end < draft.contract_start) { toast.error("La fecha de fin no puede ser anterior al inicio del contrato."); return; }
    setSaving(true);
    const payload = {
      property_id: selectedProperty.id, tenant_name: draft.tenant_name.trim(), tenant_phone: draft.tenant_phone.trim() || null,
      tenant_email: draft.tenant_email.trim() || null, contract_start: draft.contract_start || null, contract_end: draft.contract_end || null,
      current_rent: rent, rent_currency: draft.rent_currency, increase_index: draft.increase_index.trim(),
      increase_interval_months: draft.increase_interval_months ? Number(draft.increase_interval_months) : null,
      next_increase_on: draft.next_increase_on || null, status: draft.status, notes: draft.notes.trim(),
    };
    const result = dossier
      ? await client.from("rental_dossiers").update(payload).eq("id", dossier.id).select("*").single()
      : await client.from("rental_dossiers").insert({ ...payload, created_by: currentUserId }).select("*").single();
    setSaving(false);
    if (result.error) { toast.error(`No se pudo guardar el expediente: ${result.error.message}`); return; }
    toast.success(dossier ? "Expediente actualizado y auditado" : "Carpeta de alquiler creada");
    setRefreshVersion((value) => value + 1);
  };

  const uploadDocument = async (eventId: string, file: File) => {
    if (!client || !selectedProperty) return false;
    if (file.size > 10 * 1024 * 1024 || !allowedDocuments.has(file.type)) {
      toast.error("El documento debe ser PDF, imagen o DOCX y no superar 10 MB."); return false;
    }
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-150);
    const path = `${selectedProperty.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await client.storage.from("rental-documents").upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) { toast.error(`El evento quedó registrado, pero no se pudo subir el archivo: ${uploadError.message}`); return false; }
    const { error: attachError } = await client.rpc("attach_rental_document", { p_event_id: eventId, p_path: path });
    if (attachError) { toast.error(`El evento quedó registrado, pero no se pudo vincular el archivo: ${attachError.message}`); return false; }
    toast.success("Documento guardado en la carpeta privada");
    return true;
  };

  const addEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !dossier) return;
    if (eventDraft.event_type === "document" && !eventFile) { toast.error("Elegí un archivo para registrar el documento."); return; }
    if (eventDraft.event_type === "payment" && (!eventDraft.amount || Number(eventDraft.amount) < 0)) { toast.error("Ingresá el importe del alquiler recibido."); return; }
    setSavingEvent(true);
    const { data, error } = await client.rpc("record_rental_event", {
      p_dossier_id: dossier.id, p_event_type: eventDraft.event_type, p_title: eventDraft.title.trim(),
      p_description: eventDraft.description.trim(), p_occurred_on: eventDraft.occurred_on || today(),
      p_due_on: eventDraft.event_type === "payment" ? eventDraft.due_on || null : null,
      p_paid_on: eventDraft.event_type === "payment" ? eventDraft.paid_on || null : null,
      p_payment_status: eventDraft.event_type === "payment" ? eventDraft.payment_status : null,
      p_amount: eventDraft.event_type === "payment" ? Number(eventDraft.amount) : null,
      p_currency: eventDraft.event_type === "payment" ? eventDraft.currency : null,
      p_reference: eventDraft.reference.trim() || null,
    });
    if (error) { setSavingEvent(false); toast.error(`No se pudo registrar el evento: ${error.message}`); return; }
    const eventId = String(data);
    if (eventDraft.event_type === "document" && eventFile) await uploadDocument(eventId, eventFile);
    setSavingEvent(false); setEventDraft(blankEvent()); setEventFile(null);
    setRefreshVersion((value) => value + 1);
  };

  const addIncrease = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !dossier || !isAdmin) return;
    const newRent = Number(increaseDraft.newRent);
    if (!Number.isFinite(newRent) || newRent <= Number(dossier.current_rent)) { toast.error("El nuevo canon debe superar al vigente."); return; }
    setSavingEvent(true);
    const { error } = await client.rpc("record_rental_increase", {
      p_dossier_id: dossier.id, p_effective_on: increaseDraft.effectiveOn, p_new_rent: newRent,
      p_currency: increaseDraft.currency, p_index_name: increaseDraft.indexName.trim(),
      p_reference: increaseDraft.reference.trim() || null, p_description: increaseDraft.description.trim(),
    });
    setSavingEvent(false);
    if (error) { toast.error(`No se pudo registrar el aumento: ${error.message}`); return; }
    toast.success("Aumento registrado; se actualizó el canon vigente y quedó auditado");
    setIncreaseDraft({ newRent: "", currency: draft.rent_currency, effectiveOn: today(), indexName: draft.increase_index, reference: "", description: "" });
    setRefreshVersion((value) => value + 1);
  };

  const addSettlement = async (event: FormEvent) => {
    event.preventDefault();
    if (!client || !dossier || !isAdmin) return;
    const gross = Number(settlementDraft.gross_rent);
    const deductions = Number(settlementDraft.deductions || 0);
    if (!settlementDraft.period_start || !settlementDraft.period_end || settlementDraft.period_end < settlementDraft.period_start || !Number.isFinite(gross) || gross < 0 || !Number.isFinite(deductions) || deductions < 0) {
      toast.error("Revisá el período, el alquiler bruto y las deducciones."); return;
    }
    const { error } = await client.from("rental_owner_settlements").insert({
      dossier_id: dossier.id, period_start: settlementDraft.period_start, period_end: settlementDraft.period_end,
      gross_rent: gross, deductions, net_to_owner: gross - deductions, currency: settlementDraft.currency,
      status: settlementDraft.status, paid_at: settlementDraft.status === "paid" ? settlementDraft.paid_at || today() : null,
      notes: settlementDraft.notes.trim(), created_by: currentUserId,
    });
    if (error) { toast.error(`No se pudo guardar la liquidación privada: ${error.message}`); return; }
    toast.success("Liquidación privada guardada; sólo Dueño y Administrador pueden verla");
    setSettlementDraft(blankSettlement()); setRefreshVersion((value) => value + 1);
  };

  const setSettlementStatus = async (item: Settlement, status: Settlement["status"]) => {
    if (!client || !isAdmin) return;
    const { error } = await client.from("rental_owner_settlements").update({ status, paid_at: status === "paid" ? item.paid_at || today() : null }).eq("id", item.id);
    if (error) toast.error(`No se pudo actualizar el estado: ${error.message}`);
    else { toast.success("Estado de liquidación actualizado y auditado"); setRefreshVersion((value) => value + 1); }
  };

  const openDocument = async (path: string) => {
    if (!client) return;
    const { data, error } = await client.storage.from("rental-documents").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) { toast.error("No se pudo abrir el documento privado."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (!client) return <section className="admin-panel-card"><p>La base de datos no está configurada.</p></section>;

  if (!selectedProperty) return (
    <section className="admin-panel-card rental-dossiers-panel">
      <div className="admin-panel-heading"><div><h2>Carpetas de alquiler</h2><p>Un expediente interno por inmueble: contratos, canon vigente, pagos, aumentos, mantenimiento y documentos privados.</p></div><span className="admin-count-pill">{folderProperties.length} propiedades</span></div>
      <div className="admin-toolbar"><label className="admin-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar propiedad o localidad" /></label><span>Acceso para personal autorizado</span></div>
      {filteredProperties.length ? <div className="rental-folder-grid">{filteredProperties.map((property) => <button type="button" key={property.id} className="rental-folder-card" onClick={() => setSelectedPropertyId(property.id)}>
        <span className="rental-folder-icon"><FolderOpen size={20} /></span><span className="rental-folder-copy"><strong>{property.title}</strong><small><Building2 size={13} /> {property.location} · {property.region}</small><small><Receipt size={13} /> Canon publicado: {money(property.price, property.currency)}</small></span><span className="rental-folder-open">Abrir carpeta</span>
      </button>)}</div> : <div className="admin-empty"><span><FolderOpen size={18} /></span><strong>No hay propiedades de alquiler</strong><p>Las propiedades con operación “Alquiler” aparecerán como carpetas individuales.</p></div>}
    </section>
  );

  return (
    <div className="rental-dossiers-panel">
      <section className="admin-panel-card rental-folder-detail">
        <div className="rental-detail-top"><button type="button" className="admin-secondary-button" onClick={() => setSelectedPropertyId(null)}><ArrowLeft size={15} /> Todas las carpetas</button><span className="rental-access-note"><ShieldCheck size={14} /> Sólo personal autorizado</span></div>
        <div className="admin-panel-heading rental-detail-heading"><div><span className="admin-eyebrow">CARPETA DE ALQUILER</span><h2>{selectedProperty.title}</h2><p><Building2 size={13} /> {selectedProperty.location} · {selectedProperty.region}</p></div><span className={`rental-status rental-status-${dossier?.status ?? "missing"}`}>{dossier ? statusNames[dossier.status] : "Sin expediente"}</span></div>
        {loading ? <div className="rental-loading"><LoaderCircle className="spin" size={18} /> Cargando expediente, eventos y permisos…</div> : <>
          {!dossier && !isAdmin && <div className="rental-security-note"><LockKeyhole size={17} /><div><strong>La carpeta aún no está creada</strong><p>Un Dueño o Administrador debe abrir el expediente antes de que el equipo pueda consultar el contrato y sus eventos.</p></div></div>}
          {!dossier && isAdmin && <div className="rental-security-note"><FileText size={17} /><div><strong>Esta propiedad todavía no tiene expediente</strong><p>Completá los datos iniciales del contrato. Los cambios quedan registrados en la auditoría interna.</p></div></div>}
          {dossier && <div className="rental-key-facts"><div><small>Canon vigente</small><strong>{money(dossier.current_rent, dossier.rent_currency)}</strong><span>Importe del alquiler, visible para el equipo autorizado</span></div><div><small>Próximo ajuste</small><strong>{formatDate(dossier.next_increase_on)}</strong><span>{dossier.increase_index || "Índice sin especificar"}{dossier.increase_interval_months ? ` · cada ${dossier.increase_interval_months} meses` : ""}</span></div><div><small>Vencimiento de contrato</small><strong>{formatDate(dossier.contract_end)}</strong><span>{dossier.tenant_name || "Inquilino/a sin registrar"}</span></div></div>}
          <form className="rental-dossier-form" onSubmit={saveDossier}>
            <div className="rental-section-heading"><div><h3><FileText size={16} /> Contrato y contacto</h3><p>{isAdmin ? "Editá los datos del expediente; cada cambio se registra." : "Consulta de datos del contrato. Sólo Dueño o Administrador puede editar."}</p></div>{isAdmin && <button type="submit" className="admin-primary-button" disabled={saving}><Save size={15} /> {saving ? "Guardando…" : dossier ? "Guardar cambios" : "Crear carpeta"}</button>}</div>
            <div className="rental-fields-grid">
              <label>Inquilino/a<input disabled={!isAdmin} value={draft.tenant_name} onChange={(event) => setDraft({ ...draft, tenant_name: event.target.value })} maxLength={180} placeholder="Nombre y apellido" /></label>
              <label>Teléfono<input disabled={!isAdmin} value={draft.tenant_phone} onChange={(event) => setDraft({ ...draft, tenant_phone: event.target.value })} maxLength={80} placeholder="Contacto" /></label>
              <label>Email<input disabled={!isAdmin} type="email" value={draft.tenant_email} onChange={(event) => setDraft({ ...draft, tenant_email: event.target.value })} maxLength={320} placeholder="Email del inquilino/a" /></label>
              <label>Estado del contrato<select disabled={!isAdmin} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Dossier["status"] })}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Inicio de contrato<input disabled={!isAdmin} type="date" value={draft.contract_start} onChange={(event) => setDraft({ ...draft, contract_start: event.target.value })} /></label>
              <label>Fin de contrato<input disabled={!isAdmin} type="date" value={draft.contract_end} onChange={(event) => setDraft({ ...draft, contract_end: event.target.value })} /></label>
              <label>Canon de alquiler<input disabled={!isAdmin} required type="number" min="0" step="0.01" value={draft.current_rent} onChange={(event) => setDraft({ ...draft, current_rent: event.target.value })} /></label>
              <label>Moneda<select disabled={!isAdmin} value={draft.rent_currency} onChange={(event) => setDraft({ ...draft, rent_currency: event.target.value as "ARS" | "USD" })}><option value="ARS">Pesos argentinos (ARS)</option><option value="USD">Dólares (USD)</option></select></label>
              <label>Índice acordado<input disabled={!isAdmin} value={draft.increase_index} onChange={(event) => setDraft({ ...draft, increase_index: event.target.value })} placeholder="IPC, ICL u otro según contrato" /></label>
              <label>Frecuencia de ajuste<input disabled={!isAdmin} type="number" min="1" max="36" value={draft.increase_interval_months} onChange={(event) => setDraft({ ...draft, increase_interval_months: event.target.value })} placeholder="Meses" /></label>
              <label>Próxima fecha de ajuste<input disabled={!isAdmin} type="date" value={draft.next_increase_on} onChange={(event) => setDraft({ ...draft, next_increase_on: event.target.value })} /></label>
              <label className="rental-field-wide">Notas operativas<textarea disabled={!isAdmin} rows={3} maxLength={12000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Servicios, llaves, acuerdos operativos, contactos de emergencia…" /></label>
            </div>
          </form>

          {dossier && isAdmin && <form className="rental-subpanel" onSubmit={addIncrease}>
            <div className="rental-section-heading"><div><h3><CalendarDays size={16} /> Registrar aumento de alquiler</h3><p>Guarda canon anterior y nuevo, índice, referencia y fecha de vigencia. Actualiza el canon del expediente y deja evidencia en auditoría.</p></div></div>
            <div className="rental-fields-grid rental-increase-grid">
              <label>Nuevo canon<input required type="number" min="0.01" step="0.01" value={increaseDraft.newRent} onChange={(event) => setIncreaseDraft({ ...increaseDraft, newRent: event.target.value })} /></label>
              <label>Moneda<select value={increaseDraft.currency} onChange={(event) => setIncreaseDraft({ ...increaseDraft, currency: event.target.value as "ARS" | "USD" })}><option value="ARS">ARS</option><option value="USD">USD</option></select></label>
              <label>Vigente desde<input required type="date" value={increaseDraft.effectiveOn} onChange={(event) => setIncreaseDraft({ ...increaseDraft, effectiveOn: event.target.value })} /></label>
              <label>Índice aplicado<input value={increaseDraft.indexName} onChange={(event) => setIncreaseDraft({ ...increaseDraft, indexName: event.target.value })} placeholder="IPC, ICL…" /></label>
              <label>Referencia<input value={increaseDraft.reference} onChange={(event) => setIncreaseDraft({ ...increaseDraft, reference: event.target.value })} placeholder="Cláusula / período" /></label>
              <label className="rental-field-wide">Nota<textarea rows={2} value={increaseDraft.description} onChange={(event) => setIncreaseDraft({ ...increaseDraft, description: event.target.value })} placeholder="Motivo o detalle del ajuste" /></label>
              <button className="admin-primary-button" type="submit" disabled={savingEvent}><Plus size={15} /> Registrar aumento</button>
            </div>
          </form>}

          {dossier && <section className="rental-subpanel">
            <div className="rental-section-heading"><div><h3><ClipboardList size={16} /> Registro operativo</h3><p>La cronología es de sólo agregado: para corregir algo, agregá un nuevo evento explicativo. No se borra el historial.</p></div></div>
            <form className="rental-event-form" onSubmit={addEvent}>
              <label>Tipo<select value={eventDraft.event_type} onChange={(event) => { const type = event.target.value as EventDraft["event_type"]; setEventDraft({ ...eventDraft, event_type: type, title: type === "payment" ? "Pago de alquiler" : type === "document" ? "Documento del contrato" : eventNames[type] }); setEventFile(null); }}>
                {eventOptions.map((type) => <option value={type} key={type}>{eventNames[type]}</option>)}
              </select></label>
              <label>Título<input required minLength={2} maxLength={180} value={eventDraft.title} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })} /></label>
              <label>Fecha<input required type="date" value={eventDraft.occurred_on} onChange={(event) => setEventDraft({ ...eventDraft, occurred_on: event.target.value })} /></label>
              {eventDraft.event_type === "payment" && <>
                <label>Importe del alquiler<input required type="number" min="0" step="0.01" value={eventDraft.amount} onChange={(event) => setEventDraft({ ...eventDraft, amount: event.target.value })} /></label>
                <label>Moneda<select value={eventDraft.currency} onChange={(event) => setEventDraft({ ...eventDraft, currency: event.target.value as "ARS" | "USD" })}><option value="ARS">ARS</option><option value="USD">USD</option></select></label>
                <label>Estado<select value={eventDraft.payment_status} onChange={(event) => setEventDraft({ ...eventDraft, payment_status: event.target.value as EventDraft["payment_status"] })}>{Object.entries(paymentNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label>Vencimiento<input type="date" value={eventDraft.due_on} onChange={(event) => setEventDraft({ ...eventDraft, due_on: event.target.value })} /></label>
                <label>Fecha de pago<input type="date" value={eventDraft.paid_on} onChange={(event) => setEventDraft({ ...eventDraft, paid_on: event.target.value })} /></label>
              </>}
              {eventDraft.event_type === "document" && <label className="rental-file-field"><UploadCloud size={15} /> Archivo<input required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setEventFile(event.target.files?.[0] ?? null)} /><small>PDF, imagen o DOCX · máximo 10 MB · almacenamiento privado</small></label>}
              <label>Referencia<input value={eventDraft.reference} onChange={(event) => setEventDraft({ ...eventDraft, reference: event.target.value })} maxLength={180} placeholder="Recibo, conversación, orden…" /></label>
              <label className="rental-field-wide">Detalle<textarea rows={2} value={eventDraft.description} onChange={(event) => setEventDraft({ ...eventDraft, description: event.target.value })} maxLength={8000} placeholder="Detalle operativo para el equipo" /></label>
              <button type="submit" className="admin-primary-button" disabled={savingEvent}><Plus size={15} /> {savingEvent ? "Guardando…" : "Agregar al registro"}</button>
            </form>
            {events.length ? <div className="rental-event-list">{events.map((item) => <article className="rental-event-row" key={item.id}>
              <span className={`rental-event-icon rental-event-${item.event_type}`}><FileText size={16} /></span>
              <div className="rental-event-copy"><div><strong>{item.title}</strong><span className="rental-event-type">{eventNames[item.event_type]}</span></div><p>{item.description || item.reference || "Sin detalle adicional."}</p><small><CalendarDays size={12} /> {formatDate(item.occurred_on)}{item.reference ? ` · ${item.reference}` : ""}{item.payment_status ? ` · ${paymentNames[item.payment_status]}` : ""}</small>
                {item.event_type === "rent_increase" && <b className="rental-event-money">{money(item.previous_rent, item.currency)} → {money(item.new_rent, item.currency)} · vigente {formatDate(item.effective_on)}</b>}
                {item.event_type === "payment" && item.amount != null && <b className="rental-event-money">Alquiler registrado: {money(item.amount, item.currency)}</b>}
              </div>
              {item.document_path && <button type="button" className="admin-secondary-button rental-document-open" onClick={() => void openDocument(item.document_path!)}><Download size={14} /> Abrir</button>}
              {item.event_type === "document" && !item.document_path && <span className="rental-document-pending">Archivo no adjuntado</span>}
            </article>)}</div> : <div className="admin-empty"><span><ClipboardList size={18} /></span><strong>Sin eventos registrados</strong><p>Pagos de alquiler, reparaciones, inspecciones, avisos y documentos aparecerán aquí.</p></div>}
          </section>}

          {dossier && isAdmin && <section className="rental-subpanel rental-private-finance">
            <div className="rental-section-heading"><div><h3><LockKeyhole size={16} /> Liquidaciones al propietario · privado</h3><p>Este bloque y el neto a liquidar están protegidos también por RLS en Supabase. Secretarios y gestores no reciben estos datos.</p></div><span className="rental-private-badge"><LockKeyhole size={13} /> Dueño / Admin</span></div>
            <form className="rental-settlement-form" onSubmit={addSettlement}>
              <label>Desde<input required type="date" value={settlementDraft.period_start} onChange={(event) => setSettlementDraft({ ...settlementDraft, period_start: event.target.value })} /></label>
              <label>Hasta<input required type="date" value={settlementDraft.period_end} onChange={(event) => setSettlementDraft({ ...settlementDraft, period_end: event.target.value })} /></label>
              <label>Alquiler bruto<input required type="number" min="0" step="0.01" value={settlementDraft.gross_rent} onChange={(event) => setSettlementDraft({ ...settlementDraft, gross_rent: event.target.value })} /></label>
              <label>Deducciones<input type="number" min="0" step="0.01" value={settlementDraft.deductions} onChange={(event) => setSettlementDraft({ ...settlementDraft, deductions: event.target.value })} /></label>
              <label>Moneda<select value={settlementDraft.currency} onChange={(event) => setSettlementDraft({ ...settlementDraft, currency: event.target.value as "ARS" | "USD" })}><option value="ARS">ARS</option><option value="USD">USD</option></select></label>
              <label>Estado<select value={settlementDraft.status} onChange={(event) => setSettlementDraft({ ...settlementDraft, status: event.target.value as Settlement["status"] })}>{Object.entries(settlementNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              {settlementDraft.status === "paid" && <label>Fecha de pago<input type="date" value={settlementDraft.paid_at} onChange={(event) => setSettlementDraft({ ...settlementDraft, paid_at: event.target.value })} /></label>}
              <label className="rental-field-wide">Nota privada<textarea rows={2} value={settlementDraft.notes} onChange={(event) => setSettlementDraft({ ...settlementDraft, notes: event.target.value })} maxLength={8000} /></label>
              <div className="rental-net-preview"><small>Neto estimado para el dueño</small><strong>{money((Number(settlementDraft.gross_rent) || 0) - (Number(settlementDraft.deductions) || 0), settlementDraft.currency)}</strong><span>Alquiler bruto menos deducciones ingresadas</span></div>
              <button type="submit" className="admin-primary-button"><Plus size={15} /> Guardar liquidación privada</button>
            </form>
            {settlements.length > 0 && <div className="rental-settlement-list">{settlements.map((item) => <article className="rental-settlement-row" key={item.id}>
              <div><strong>{formatDate(item.period_start)} – {formatDate(item.period_end)}</strong><small>Bruto {money(item.gross_rent, item.currency)} · Deducciones {money(item.deductions, item.currency)}</small>{item.notes && <p>{item.notes}</p>}</div>
              <div className="rental-net-cell"><small>Neto propietario</small><strong>{money(item.net_to_owner, item.currency)}</strong></div>
              <select aria-label="Estado de liquidación" value={item.status} onChange={(event) => void setSettlementStatus(item, event.target.value as Settlement["status"])}>{Object.entries(settlementNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
            </article>)}</div>}
          </section>}

          {dossier && isAdmin && <section className="rental-subpanel rental-audit-section">
            <div className="rental-section-heading"><div><h3><FileClock size={16} /> Auditoría interna</h3><p>Antes y después de cada cambio, con usuario y fecha. Sólo Dueño y Administrador pueden consultar estos snapshots.</p></div><span className="admin-count-pill">{audit.length} eventos</span></div>
            {audit.length ? <div className="rental-audit-list">{audit.map((item) => <details key={item.id} className="rental-audit-item"><summary><span className={`audit-action ${item.action === "INSERT" ? "action-insert" : item.action === "UPDATE" ? "action-update" : "action-delete"}`}>{auditNames[item.action] ?? item.action}</span><strong>{auditNames[item.entity_table] ?? "Registro"}</strong><span>{item.actor_email || "Cuenta autorizada"}</span><time>{new Date(item.created_at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</time></summary><div className="rental-audit-snapshots"><div><strong>Antes</strong>{readableSnapshot(item.old_values).length ? readableSnapshot(item.old_values).map((line) => <p key={line}>{line}</p>) : <small>Sin datos anteriores.</small>}</div><div><strong>Después</strong>{readableSnapshot(item.new_values).length ? readableSnapshot(item.new_values).map((line) => <p key={line}>{line}</p>) : <small>Sin datos posteriores.</small>}</div></div></details>)}</div> : <div className="admin-empty"><span><FileClock size={18} /></span><strong>Sin cambios registrados</strong><p>Las ediciones, liquidaciones y eventos quedarán auditados aquí.</p></div>}
          </section>}

          <div className="rental-security-footer"><ShieldCheck size={15} /><span>El canon y los datos operativos son visibles sólo al personal autorizado. Las liquidaciones al propietario no se consultan ni se exponen a secretaría/gestión.</span></div>
        </>}
      </section>
    </div>
  );
}
