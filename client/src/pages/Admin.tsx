import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Bell, Building2, CalendarClock, Check, CheckCircle2,
  ClipboardList, Clock3, DollarSign, FileClock, Home, LoaderCircle, LogOut, Mail,
  MapPin, Pencil, Phone, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, UploadCloud,
  Star, Users, WalletCards, X,
} from "lucide-react";
import { toast } from "sonner";
import OperationsPanel from "@/components/real-estate/OperationsPanel";
import { formatPrice, type PropertyStatus } from "@/data/properties";
import { isSupabaseConfigured, supabase, type PropertyRow } from "@/lib/supabase";

type Role = "owner" | "admin" | "manager" | "secretary" | "user";
type Tab = "overview" | "properties" | "leads" | "reviews" | "followups" | "operations" | "audit" | "team";
type LeadRow = {
  id: string; name: string; email: string | null; phone: string | null; message: string;
  property_id: string | null; stage: string; source: string; created_at: string; budget_max: number | string | null; budget_currency: "USD" | "ARS" | null; financing: string | null; urgency: string | null; preferred_operation: string | null; preferred_zone: string | null; priority: "high" | "normal" | "low"; tags: string[] | null;
};
type FollowUpRow = {
  id: string; title: string; notes: string; due_at: string; status: "pending" | "done" | "cancelled";
  lead_id: string | null; property_id: string | null; created_at: string;
};
type AuditRow = {
  id: number; actor_id: string | null; action: string; entity_table: string; entity_id: string;
  old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null; created_at: string;
};
type TeamRow = { id: string; email: string | null; full_name: string | null; role: Role; created_at: string };
type ReviewRow = { id: string; author_name: string; rating: number; comment: string; is_approved: boolean; created_at: string };
type PropertyDraft = {
  title: string; operation: "Venta" | "Alquiler"; category: string; location: string; region: string;
  price: string; currency: "USD" | "ARS"; price_frequency: string; surface: string; covered_surface: string; surface_unit: "ha" | "m²";
  bedrooms: string; bathrooms: string; rooms: string; legal_status: string; features: string;
  description: string; images: string; status: PropertyStatus;
};
const blankProperty: PropertyDraft = {
  title: "", operation: "Venta", category: "Casa", location: "", region: "", price: "", currency: "USD",
  price_frequency: "mes", surface: "", covered_surface: "", surface_unit: "m²", bedrooms: "", bathrooms: "", rooms: "",
  legal_status: "A confirmar", features: "", description: "", images: "", status: "draft",
};
const statusNames: Record<PropertyStatus, string> = {
  draft: "Borrador", published: "Publicado", sold: "Vendido", rented: "Alquilado", archived: "Archivado",
};
const roleNames: Record<Role, string> = { owner: "Dueño", admin: "Administrador", manager: "Gestor", secretary: "Secretaría", user: "Sin acceso" };
const leadStages: Record<string, string> = {
  new: "Nuevo", contacted: "Contactado", visit: "Visita", negotiation: "Negociación", won: "Ganado", lost: "Perdido",
};
const stageOptions = ["new", "contacted", "visit", "negotiation", "won", "lost"];
const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Resumen", icon: Home },
  { id: "properties", label: "Propiedades", icon: Building2 },
  { id: "leads", label: "Consultas", icon: Users },
  { id: "reviews", label: "Reseñas", icon: Star },
  { id: "followups", label: "Seguimientos", icon: CalendarClock },
  { id: "operations", label: "Operaciones y caja", icon: WalletCards },
  { id: "audit", label: "Auditoría", icon: FileClock },
  { id: "team", label: "Equipo y roles", icon: BadgeCheck },
];
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dateLabel = (value: string) => new Date(value).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/property-images/";
function decodeStoragePath(path: string): string {
  try { return decodeURIComponent(path); } catch { return path; }
}
function imageObjectPath(image: string): string | null {
  try {
    const parsed = new URL(image);
    const markerIndex = parsed.pathname.indexOf(STORAGE_PUBLIC_MARKER);
    return markerIndex >= 0 ? decodeStoragePath(parsed.pathname.slice(markerIndex + STORAGE_PUBLIC_MARKER.length)) : null;
  } catch {
    return /^https?:\/\//i.test(image) ? null : decodeStoragePath(image);
  }
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<{ role: string; full_name: string | null } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({});
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [query, setQuery] = useState("");
  const [propertyDraft, setPropertyDraft] = useState<PropertyDraft>(blankProperty);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [leadDraft, setLeadDraft] = useState({ name: "", email: "", phone: "", message: "", budget_max: "", budget_currency: "USD" as "USD" | "ARS", financing: "to_define", urgency: "medium", preferred_operation: "", preferred_zone: "", priority: "normal" as "high" | "normal" | "low", tags: "" });
  const [taskDraft, setTaskDraft] = useState({ title: "", notes: "", due_at: "", lead_id: "", property_id: "" });
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) toast.error(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase || !session) { setProfile(null); return; }
    supabase.from("profiles").select("role, full_name").eq("id", session.user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { toast.error(`No se pudo verificar el rol: ${error.message}`); setProfile(null); return; }
      setProfile(data as { role: string; full_name: string | null } | null);
    });
    return () => { active = false; };
  }, [session]);

  const loadWorkspace = async () => {
    const client = supabase;
    if (!client) return;
    setDataLoading(true);
    const [propertyResult, leadResult, taskResult, reviewResult] = await Promise.all([
      client.from("properties").select("*").order("updated_at", { ascending: false }),
      client.from("leads").select("*").order("created_at", { ascending: false }),
      client.from("follow_ups").select("*").order("due_at", { ascending: true }),
      client.from("reviews").select("*").order("created_at", { ascending: false }),
    ]);
    const err = propertyResult.error || leadResult.error || taskResult.error || reviewResult.error;
    if (err) toast.error(`No se pudieron cargar algunos datos: ${err.message}`);
    const propertyRows = (propertyResult.data ?? []) as PropertyRow[];
    const privatePaths = [...new Set(propertyRows.flatMap((row) => (row.images ?? []).map(imageObjectPath).filter((path): path is string => Boolean(path))))];
    const signedEntries = await Promise.all(privatePaths.map(async (path) => {
      const { data } = await client.storage.from("property-images").createSignedUrl(path, 1800);
      return data?.signedUrl ? [path, data.signedUrl] as const : null;
    }));
    setSignedImageUrls(Object.fromEntries(signedEntries.filter((entry): entry is readonly [string, string] => entry !== null)));
    setProperties(propertyRows);
    setLeads((leadResult.data ?? []) as LeadRow[]);
    setFollowUps((taskResult.data ?? []) as FollowUpRow[]);
    setReviews((reviewResult.data ?? []) as ReviewRow[]);
    if (profile && ["owner", "admin"].includes(profile.role)) {
      const [auditResult, teamResult] = await Promise.all([
        client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
        client.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: true }),
      ]);
      if (auditResult.error || teamResult.error) toast.error(`No se pudieron cargar auditoría/equipo: ${(auditResult.error || teamResult.error)?.message}`);
      setAudit((auditResult.data ?? []) as AuditRow[]);
      setTeam((teamResult.data ?? []) as TeamRow[]);
    } else { setAudit([]); setTeam([]); }
    setDataLoading(false);
  };

  useEffect(() => {
    if (profile && ["owner", "admin", "manager", "secretary"].includes(profile.role)) void loadWorkspace();
    // loadWorkspace reads the current session and is intentionally called on role changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const filteredProperties = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    return properties.filter((item) => `${item.title} ${item.location} ${item.slug} ${statusNames[item.status]}`.toLocaleLowerCase("es-AR").includes(normalized));
  }, [properties, query]);
  const filteredLeads = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-AR");
    return leads.filter((item) => `${item.name} ${item.email ?? ""} ${item.phone ?? ""} ${item.message}`.toLocaleLowerCase("es-AR").includes(normalized));
  }, [leads, query]);
  const pendingTasks = followUps.filter((task) => task.status === "pending");
  const overdueTasks = pendingTasks.filter((task) => new Date(task.due_at).getTime() < Date.now());
  const activeListings = properties.filter((item) => ["published", "sold", "rented"].includes(item.status)).length;
  const reviewDueProperties = properties.filter((item) => item.status === "published" && item.created_at && Date.now() - new Date(item.created_at).getTime() >= 90 * 86400000);
  const role = (profile?.role ?? "user") as Role;
  const isAdmin = role === "owner" || role === "admin";
  const canManageProperties = ["owner", "admin", "manager"].includes(role);
  const canDeleteRecords = isAdmin;
  const canManageTeam = isAdmin;
  const adminImageSource = (image?: string | null) => {
    if (!image) return undefined;
    const path = imageObjectPath(image);
    return path ? signedImageUrls[path] : image;
  };

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email: login.email.trim(), password: login.password });
    if (error) toast.error(`No se pudo iniciar sesión: ${error.message}`);
    else toast.success("Sesión iniciada");
    setLoggingIn(false);
  };
  const signOut = async () => {
    await supabase?.auth.signOut();
    setProfile(null);
    setSession(null);
    toast.success("Sesión cerrada");
  };

  const openNewProperty = () => { setEditingId(null); setPropertyDraft(blankProperty); setImageFiles([]); setEditorOpen(true); setTab("properties"); };
  const openEditProperty = (row: PropertyRow) => {
    setEditingId(row.id);
    setEditorOpen(true);
    setPropertyDraft({
      title: row.title, operation: row.operation, category: row.category, location: row.location, region: row.region,
      price: String(row.price), currency: row.currency, price_frequency: row.price_frequency ?? "mes", surface: String(row.surface),
      covered_surface: row.covered_surface == null ? "" : String(row.covered_surface),
      surface_unit: row.surface_unit, bedrooms: row.bedrooms == null ? "" : String(row.bedrooms),
      bathrooms: row.bathrooms == null ? "" : String(row.bathrooms), rooms: row.rooms == null ? "" : String(row.rooms),
      legal_status: row.legal_status, features: (row.features ?? []).join(", "), description: row.description,
      images: (row.images ?? []).map((image) => imageObjectPath(image) ?? image).join("\n"), status: row.status,
    });
    setImageFiles([]);
  };
  const saveProperty = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !session) return;
    if (!propertyDraft.title.trim() || !propertyDraft.location.trim() || !propertyDraft.region.trim()) {
      toast.error("Completá título, localidad y región."); return;
    }
    if (Number(propertyDraft.price) < 0 || Number(propertyDraft.surface) <= 0) { toast.error("Revisá el precio y la superficie."); return; }
    if (propertyDraft.covered_surface.trim() && (!Number.isFinite(Number(propertyDraft.covered_surface)) || Number(propertyDraft.covered_surface) <= 0)) { toast.error("La superficie cubierta debe ser mayor a cero o quedar vacía si no está confirmada."); return; }
    const enteredImages = propertyDraft.images.split(/\n+/).map((value) => value.trim()).filter(Boolean);
    const validPathPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}-[a-zA-Z0-9._-]+$/i;
    if (enteredImages.some((image) => {
      if (/^https:\/\//i.test(image)) return false;
      const path = imageObjectPath(image);
      return !path || !validPathPattern.test(path);
    })) { toast.error("Usá URLs HTTPS o rutas válidas del almacenamiento privado."); return; }
    if (enteredImages.length + imageFiles.length === 0 || enteredImages.length + imageFiles.length > 12) {
      toast.error("Agregá entre 1 y 12 imágenes."); return;
    }
    const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    if (imageFiles.some((file) => file.size > 8 * 1024 * 1024 || !allowedImageTypes.has(file.type))) {
      toast.error("Cada imagen debe ser una imagen válida de hasta 8 MB."); return;
    }
    setSaving(true);
    const uploadedPaths: string[] = [];
    try {
      for (const file of imageFiles) {
        const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-");
        const objectPath = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("property-images").upload(objectPath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(objectPath);
      }
      const images = [...enteredImages, ...uploadedPaths];
      const data = {
        slug: slugify(propertyDraft.title), operation: propertyDraft.operation, title: propertyDraft.title.trim(),
        category: propertyDraft.category, location: propertyDraft.location.trim(), region: propertyDraft.region.trim(),
        price: Number(propertyDraft.price), currency: propertyDraft.currency,
        price_frequency: propertyDraft.operation === "Alquiler" ? propertyDraft.price_frequency || "mes" : null,
        surface: Number(propertyDraft.surface), surface_unit: propertyDraft.surface_unit,
        covered_surface: propertyDraft.covered_surface.trim() ? Number(propertyDraft.covered_surface) : null,
        bedrooms: propertyDraft.bedrooms ? Number(propertyDraft.bedrooms) : null,
        bathrooms: propertyDraft.bathrooms ? Number(propertyDraft.bathrooms) : null,
        rooms: propertyDraft.rooms ? Number(propertyDraft.rooms) : null,
        legal_status: propertyDraft.legal_status.trim() || "A confirmar",
        features: propertyDraft.features.split(",").map((item) => item.trim()).filter(Boolean),
        description: propertyDraft.description.trim(), images, status: propertyDraft.status,
        published_at: propertyDraft.status === "published" ? new Date().toISOString() : null,
      };
      const result = editingId
        ? await supabase.from("properties").update(data).eq("id", editingId)
        : await supabase.from("properties").insert({ ...data, created_by: session.user.id });
      if (result.error) throw result.error;
      if (editingId) {
        const previous = properties.find((row) => row.id === editingId)?.images ?? [];
        const retained = new Set(images.map(imageObjectPath).filter((path): path is string => Boolean(path)));
        const removed = previous.map(imageObjectPath).filter((path): path is string => Boolean(path) && !retained.has(path!));
        if (removed.length) await supabase.storage.from("property-images").remove(removed);
      }
      toast.success(editingId ? "Propiedad actualizada" : "Propiedad creada");
      setEditingId(null); setEditorOpen(false); setPropertyDraft(blankProperty); setImageFiles([]); await loadWorkspace();
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from("property-images").remove(uploadedPaths);
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la propiedad.");
    } finally { setSaving(false); }
  };
  const archiveProperty = async (row: PropertyRow) => {
    if (!supabase || !window.confirm(`¿Archivar “${row.title}”? La propiedad se conservará y podrá reactivarse.`)) return;
    const { error } = await supabase.from("properties").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success("Propiedad archivada sin borrar su historial"); await loadWorkspace(); }
  };
  const setPropertyStatus = async (row: PropertyRow, status: PropertyStatus) => {
    if (!supabase) return;
    const operation = status === "sold" ? "Venta" : status === "rented" ? "Alquiler" : row.operation;
    const { error } = await supabase.from("properties").update({ status, operation, ...(status === "published" ? { published_at: new Date().toISOString() } : {}) }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success(`Estado actualizado: ${statusNames[status]}`); await loadWorkspace(); }
  };
  const addManualLead = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !session) return;
    const { error } = await supabase.from("leads").insert({ ...leadDraft, email: leadDraft.email.trim() || null, phone: leadDraft.phone.trim() || null, budget_max: leadDraft.budget_max ? Number(leadDraft.budget_max) : null, tags: leadDraft.tags.split(",").map((tag) => tag.trim()).filter(Boolean), source: "manual", created_by: session.user.id });
    if (error) toast.error(error.message); else { toast.success("Consulta agregada al CRM"); setLeadDraft({ name: "", email: "", phone: "", message: "", budget_max: "", budget_currency: "USD", financing: "to_define", urgency: "medium", preferred_operation: "", preferred_zone: "", priority: "normal", tags: "" }); await loadWorkspace(); }
  };
  const updateLeadStage = async (id: string, stage: string) => {
    const { error } = await supabase!.from("leads").update({ stage }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Etapa actualizada"); await loadWorkspace(); }
  };
  const addFollowUp = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !session) return;
    if (!taskDraft.title.trim() || !taskDraft.due_at) { toast.error("Indicá un título y fecha para el seguimiento."); return; }
    const { error } = await supabase.from("follow_ups").insert({
      title: taskDraft.title.trim(), notes: taskDraft.notes.trim(), due_at: new Date(taskDraft.due_at).toISOString(),
      lead_id: taskDraft.lead_id || null, property_id: taskDraft.property_id || null, created_by: session.user.id,
    });
    if (error) toast.error(error.message); else { toast.success("Seguimiento creado"); setTaskDraft({ title: "", notes: "", due_at: "", lead_id: "", property_id: "" }); await loadWorkspace(); }
  };
  const toggleFollowUp = async (task: FollowUpRow) => {
    const status = task.status === "done" ? "pending" : "done";
    const { error } = await supabase!.from("follow_ups").update({ status }).eq("id", task.id);
    if (error) toast.error(error.message); else { toast.success(status === "done" ? "Seguimiento completado" : "Seguimiento reabierto"); await loadWorkspace(); }
  };
  const deleteLead = async (lead: LeadRow) => {
    if (!supabase || !canDeleteRecords || !window.confirm(`¿Eliminar la consulta de ${lead.name}?`)) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) toast.error(error.message); else { toast.success("Consulta eliminada"); await loadWorkspace(); }
  };
  const deleteFollowUp = async (task: FollowUpRow) => {
    if (!supabase || !canDeleteRecords || !window.confirm(`¿Eliminar el seguimiento “${task.title}”?`)) return;
    const { error } = await supabase.from("follow_ups").delete().eq("id", task.id);
    if (error) toast.error(error.message); else { toast.success("Seguimiento eliminado"); await loadWorkspace(); }
  };
  const updateReview = async (review: ReviewRow, is_approved: boolean) => {
    if (!supabase) return;
    const { error } = await supabase.from("reviews").update({ is_approved }).eq("id", review.id);
    if (error) toast.error(error.message); else { toast.success(is_approved ? "Reseña publicada" : "Reseña ocultada"); await loadWorkspace(); }
  };
  const deleteReview = async (review: ReviewRow) => {
    if (!supabase || !canDeleteRecords || !window.confirm(`¿Eliminar la reseña de ${review.author_name}?`)) return;
    const { error } = await supabase.from("reviews").delete().eq("id", review.id);
    if (error) toast.error(error.message); else { toast.success("Reseña eliminada"); await loadWorkspace(); }
  };
  const changeTeamRole = async (member: TeamRow, nextRole: Role) => {
    if (!supabase || member.id === session?.user.id || member.role === nextRole) return;
    if (!window.confirm(`¿Cambiar el cargo de ${member.full_name || member.email || "esta cuenta"} a “${roleNames[nextRole]}”?`)) { await loadWorkspace(); return; }
    const { error } = await supabase.rpc("set_team_role", { target_user_id: member.id, new_role: nextRole });
    if (error) toast.error(error.message);
    else toast.success(`Cargo actualizado: ${roleNames[nextRole]}`);
    await loadWorkspace();
  };

  if (!isSupabaseConfigured || !supabase) return <SetupMessage />;
  if (authLoading) return <AdminLoading />;
  if (!session) return <LoginView login={login} setLogin={setLogin} onSubmit={signIn} loading={loggingIn} />;
  if (!profile) return <AccessDenied onSignOut={signOut} loading={true} />;
  if (!["owner", "admin", "manager", "secretary"].includes(profile.role)) return <AccessDenied onSignOut={signOut} loading={false} />;

  const visibleTabs = tabs.filter((item) => item.id === "audit" ? isAdmin : item.id === "team" ? canManageTeam : true);
  return (
    <div className="app-shell admin-shell">
      <AdminHeader name={profile.full_name || session.user.email || "Equipo Riviera"} roleLabel={roleNames[role]} notifications={reviewDueProperties.map((item) => `${item.title} · ${Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)} días publicada`)} onNotificationClick={() => setTab("operations")} onSignOut={signOut} onRefresh={() => void loadWorkspace()} refreshing={dataLoading} />
      <main className="admin-main">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-heading"><span className="admin-avatar"><ShieldCheck size={19} /></span><div><strong>Administración</strong><small>{profile.full_name || session.user.email}</small></div></div>
          <nav aria-label="Panel de administración">
            {visibleTabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tab === id ? "admin-nav-item active" : "admin-nav-item"} onClick={() => { setTab(id); setQuery(""); }}><Icon size={17} /> {label}{id === "leads" && leads.filter((lead) => lead.stage === "new").length > 0 && <span className="admin-nav-count">{leads.filter((lead) => lead.stage === "new").length}</span>}</button>)}
          </nav>
          <div className="admin-sidebar-bottom"><span><span className="admin-online-dot" /> {roleNames[role]}</span><button type="button" onClick={signOut}><LogOut size={15} /> Cerrar sesión</button></div>
        </aside>
        <section className="admin-content">
          <header className="admin-topbar"><div><span className="admin-eyebrow">GESTIÓN INMOBILIARIA</span><h1>{visibleTabs.find((item) => item.id === tab)?.label}</h1><p className="admin-welcome">Hola, {profile.full_name || "equipo"}. Elegí una sección para empezar.</p></div><button className="admin-refresh" type="button" onClick={() => void loadWorkspace()} disabled={dataLoading}><RefreshCw size={15} className={dataLoading ? "spin" : ""} /> Actualizar datos</button></header>
          {tab === "overview" && <Overview properties={properties} leads={leads} tasks={followUps} audit={audit} isAdmin={isAdmin} setTab={setTab} />}
          {tab === "properties" && <section className="admin-panel-card">
            <div className="admin-panel-heading"><div><h2>Inventario de propiedades</h2><p>Administrá precios, fotos, disponibilidad y publicación.</p></div>{canManageProperties && <button type="button" className="admin-primary-button" onClick={openNewProperty}><Plus size={16} /> Nueva propiedad</button>}</div>
            {editorOpen && <PropertyEditor draft={propertyDraft} setDraft={setPropertyDraft} files={imageFiles} setFiles={setImageFiles} editing={Boolean(editingId)} saving={saving} onCancel={() => { setEditingId(null); setEditorOpen(false); setPropertyDraft(blankProperty); setImageFiles([]); }} onSubmit={saveProperty} />}
            <div className="admin-toolbar"><label className="admin-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar título, zona o estado" /></label><span>{filteredProperties.length} propiedades</span></div>
            {filteredProperties.length === 0 ? <EmptyState title="No hay propiedades todavía" detail="Creá un aviso para empezar a organizar el inventario." /> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Propiedad</th><th>Precio</th><th>Estado</th><th>Actualizada</th><th>Acciones</th></tr></thead><tbody>{filteredProperties.map((item) => <tr key={item.id}><td><div className="admin-property-cell"><img src={adminImageSource(item.images?.[0])} alt="" /><div><strong>{item.title}</strong><small><MapPin size={12} /> {item.location} · {item.operation}</small></div></div></td><td>{formatPrice(Number(item.price), item.currency)}{item.price_frequency && <small className="admin-subline"> / {item.price_frequency}</small>}</td><td>{canManageProperties ? <select className={`status-select status-${item.status}`} aria-label={`Estado de ${item.title}`} value={item.status} onChange={(event) => void setPropertyStatus(item, event.target.value as PropertyStatus)}>{Object.entries(statusNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : <span className={`lead-stage-pill status-${item.status}`}>{statusNames[item.status]}</span>}</td><td>{dateLabel(item.updated_at)}</td><td><div className="admin-row-actions">{canManageProperties && <button type="button" aria-label={`Editar ${item.title}`} onClick={() => openEditProperty(item)}><Pencil size={15} /></button>}<a href={`#/propiedad/${item.slug}`} target="_blank" rel="noreferrer" aria-label={`Ver ${item.title}`}><Home size={15} /></a>{canDeleteRecords && <button type="button" className="danger" aria-label={`Archivar ${item.title}`} onClick={() => void archiveProperty(item)}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div>}
          </section>}
          {tab === "leads" && <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Consultas y clientes</h2><p>Seguimiento comercial de consultas del sitio y contactos registrados por el equipo.</p></div><span className="admin-count-pill">{leads.length} contactos</span></div>
            <form className="admin-inline-form crm-contact-form" onSubmit={addManualLead}><strong><Plus size={15} /> Agregar contacto</strong><input required minLength={2} value={leadDraft.name} onChange={(e) => setLeadDraft({ ...leadDraft, name: e.target.value })} placeholder="Nombre"/><input type="email" value={leadDraft.email} onChange={(e) => setLeadDraft({ ...leadDraft, email: e.target.value })} placeholder="Email (opcional)"/><input value={leadDraft.phone} onChange={(e) => setLeadDraft({ ...leadDraft, phone: e.target.value })} placeholder="Teléfono"/><input required minLength={3} value={leadDraft.message} onChange={(e) => setLeadDraft({ ...leadDraft, message: e.target.value })} placeholder="Interés / nota inicial"/><input type="number" min="0" value={leadDraft.budget_max} onChange={(e) => setLeadDraft({ ...leadDraft, budget_max: e.target.value })} placeholder="Presupuesto declarado"/><select value={leadDraft.budget_currency} onChange={(e) => setLeadDraft({ ...leadDraft, budget_currency: e.target.value as "USD" | "ARS" })}><option>USD</option><option>ARS</option></select><select value={leadDraft.financing} onChange={(e) => setLeadDraft({ ...leadDraft, financing: e.target.value })}><option value="to_define">Forma de pago a definir</option><option value="cash">Contado</option><option value="mortgage">Crédito</option><option value="installments">Cuotas</option></select><select value={leadDraft.urgency} onChange={(e) => setLeadDraft({ ...leadDraft, urgency: e.target.value })}><option value="high">Urgencia alta</option><option value="medium">Urgencia media</option><option value="low">Urgencia baja</option></select><input value={leadDraft.preferred_zone} onChange={(e) => setLeadDraft({ ...leadDraft, preferred_zone: e.target.value })} placeholder="Zona de interés"/><select value={leadDraft.priority} onChange={(e) => setLeadDraft({ ...leadDraft, priority: e.target.value as "high" | "normal" | "low" })}><option value="high">Prioridad alta</option><option value="normal">Prioridad normal</option><option value="low">Prioridad baja</option></select><input value={leadDraft.tags} onChange={(e) => setLeadDraft({ ...leadDraft, tags: e.target.value })} placeholder="Etiquetas: campo, inversor"/><button className="admin-primary-button" type="submit"><Plus size={15}/> Agregar</button></form>
            <div className="admin-toolbar"><label className="admin-search"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nombre, email o mensaje"/></label></div>
            {filteredLeads.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Contacto</th><th>Interés</th><th>Segmentación comercial</th><th>Origen</th><th>Etapa</th><th>Fecha</th>{canDeleteRecords && <th>Acciones</th>}</tr></thead><tbody>{filteredLeads.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong><small className="admin-contact-details">{lead.email && <span><Mail size={12}/> {lead.email}</span>}{lead.phone && <span><Phone size={12}/> {lead.phone}</span>}</small></td><td><span className="admin-message">{lead.message}</span>{lead.property_id && <small className="admin-subline">{properties.find((item) => item.id === lead.property_id)?.title ?? "Propiedad asociada"}</small>}</td><td><span className={`lead-priority-pill priority-${lead.priority}`}>{lead.priority === "high" ? "Prioridad alta" : lead.priority === "low" ? "Prioridad baja" : "Prioridad normal"}</span><small className="admin-subline">{lead.budget_max ? `${lead.budget_currency ?? "USD"} ${Number(lead.budget_max).toLocaleString("es-AR")}` : "Presupuesto a definir"}{lead.preferred_zone ? ` · ${lead.preferred_zone}` : ""}</small></td><td>{lead.source === "website" ? "Sitio web" : lead.source === "manual" ? "Manual" : lead.source}</td><td><select className={`status-select lead-${lead.stage}`} value={lead.stage} onChange={(e) => void updateLeadStage(lead.id, e.target.value)} aria-label={`Etapa de ${lead.name}`}>{stageOptions.map((stage) => <option key={stage} value={stage}>{leadStages[stage]}</option>)}</select></td><td>{dateLabel(lead.created_at)}</td>{canDeleteRecords && <td><button type="button" className="admin-row-delete" aria-label={`Eliminar consulta de ${lead.name}`} onClick={() => void deleteLead(lead)}><Trash2 size={15}/></button></td>}</tr>)}</tbody></table></div> : <EmptyState title="No hay consultas" detail="Las consultas recibidas desde las fichas y los contactos manuales aparecerán aquí para ordenar por etapa y datos comerciales declarados."/>}
          </section>}
          {tab === "reviews" && <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Reseñas y reputación</h2><p>Moderá las reseñas enviadas desde la web antes de publicarlas.</p></div><span className="admin-count-pill">{reviews.filter((review) => !review.is_approved).length} pendientes</span></div>
            {reviews.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Persona</th><th>Calificación</th><th>Comentario</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>{reviews.map((review) => <tr key={review.id}><td><strong>{review.author_name}</strong></td><td><span className="review-stars" aria-label={`${review.rating} de 5 estrellas`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></td><td><span className="admin-message">{review.comment}</span></td><td><span className={`lead-stage-pill ${review.is_approved ? "status-published" : "lead-new"}`}>{review.is_approved ? "Publicada" : "Pendiente"}</span></td><td>{dateLabel(review.created_at)}</td><td><div className="admin-row-actions"><button type="button" aria-label={review.is_approved ? "Ocultar reseña" : "Publicar reseña"} onClick={() => void updateReview(review, !review.is_approved)}>{review.is_approved ? <X size={15} /> : <Check size={15} />}</button>{canDeleteRecords && <button type="button" className="danger" aria-label={`Eliminar reseña de ${review.author_name}`} onClick={() => void deleteReview(review)}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="No hay reseñas todavía" detail="Las reseñas enviadas desde la página pública aparecerán aquí para su moderación."/>}
          </section>}
          {tab === "followups" && <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Agenda de seguimientos</h2><p>Organizá llamadas, visitas y próximos pasos comerciales.</p></div><span className="admin-count-pill">{pendingTasks.length} pendientes</span></div>
            <form className="admin-task-form" onSubmit={addFollowUp}><label>Tarea<input required value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} placeholder="Ej. Llamar para coordinar visita"/></label><label>Fecha y hora<input required type="datetime-local" value={taskDraft.due_at} onChange={(e) => setTaskDraft({ ...taskDraft, due_at: e.target.value })}/></label><label>Asociar consulta<select value={taskDraft.lead_id} onChange={(e) => setTaskDraft({ ...taskDraft, lead_id: e.target.value })}><option value="">Sin asociación</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</select></label><label>Asociar propiedad<select value={taskDraft.property_id} onChange={(e) => setTaskDraft({ ...taskDraft, property_id: e.target.value })}><option value="">Sin asociación</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="task-notes-field">Nota<textarea value={taskDraft.notes} onChange={(e) => setTaskDraft({ ...taskDraft, notes: e.target.value })} rows={2} placeholder="Detalles del seguimiento"/></label><button type="submit" className="admin-primary-button"><Plus size={15}/> Crear seguimiento</button></form>
            {followUps.length ? <div className="admin-task-list">{followUps.map((task) => { const property = properties.find((item) => item.id === task.property_id); const lead = leads.find((item) => item.id === task.lead_id); const overdue = task.status === "pending" && new Date(task.due_at).getTime() < Date.now(); return <article className={`admin-task-row ${task.status === "done" ? "is-done" : ""}`} key={task.id}><button className="task-check" type="button" aria-label={task.status === "done" ? "Reabrir seguimiento" : "Marcar completado"} onClick={() => void toggleFollowUp(task)}>{task.status === "done" ? <CheckCircle2 size={19}/> : <span/>}</button><div className="admin-task-copy"><strong>{task.title}</strong>{task.notes && <p>{task.notes}</p>}<small>{lead && <span><Users size={12}/>{lead.name}</span>}{property && <span><Building2 size={12}/>{property.title}</span>}</small></div><span className={`task-date ${overdue ? "is-overdue" : ""}`}><Clock3 size={13}/>{dateLabel(task.due_at)}{overdue && " · Vencida"}</span>{canDeleteRecords && <button type="button" className="admin-row-delete" aria-label={`Eliminar seguimiento ${task.title}`} onClick={() => void deleteFollowUp(task)}><Trash2 size={15}/></button>}</article>;})}</div> : <EmptyState title="Sin seguimientos agendados" detail="Agregá una llamada, visita u otra acción para no perder el próximo paso."/>}
          </section>}
          {tab === "operations" && <OperationsPanel properties={properties} session={session} canManageFinance={isAdmin} />}
          {tab === "audit" && <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Registro de auditoría</h2><p>Historial automático e inmutable de cambios en propiedades, consultas, seguimientos y cargos.</p></div><span className="admin-count-pill">Últimos {audit.length} eventos</span></div>
            {audit.length ? <div className="admin-audit-list">{audit.map((item) => <details className="admin-audit-event" key={item.id}><summary><span className={`audit-action action-${item.action.toLowerCase()}`}>{item.action === "INSERT" ? "Creación" : item.action === "UPDATE" ? "Edición" : "Eliminación"}</span><strong>{entityLabel(item.entity_table)}</strong><code>{item.entity_id.slice(0, 8)}</code><time>{dateLabel(item.created_at)}</time><span className="audit-expand">Ver detalle</span></summary><div className="audit-snapshots"><div><strong>Antes</strong><pre>{item.old_values ? JSON.stringify(item.old_values, null, 2) : "—"}</pre></div><div><strong>Después</strong><pre>{item.new_values ? JSON.stringify(item.new_values, null, 2) : "—"}</pre></div></div><small className="audit-actor">Usuario: {item.actor_id ?? "Visitante del sitio / proceso automático"} · Registro protegido por políticas de base de datos</small></details>)}</div> : <EmptyState title="Todavía no hay eventos" detail="Las acciones sobre propiedades, consultas y seguimientos se registrarán aquí automáticamente."/>}
          </section>}
          {tab === "team" && canManageTeam && <TeamManager team={team} currentUserId={session.user.id} currentRole={role} onRoleChange={changeTeamRole} />}
        </section>
      </main>
    </div>
  );
}

function AdminHeader({ name = "Panel de administración", roleLabel, notifications = [], onNotificationClick, onSignOut, onRefresh, refreshing = false }: { name?: string; roleLabel?: string; notifications?: string[]; onNotificationClick?: () => void; onSignOut?: () => void; onRefresh?: () => void; refreshing?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className="admin-header"><a className="admin-header-brand" href="#/admin" aria-label="Inicio del panel"><span className="admin-header-mark"><Building2 size={21}/></span><span><strong>RIVIERA</strong><small>GESTIÓN INMOBILIARIA</small></span></a><div className="admin-header-actions"><span className="admin-header-user"><strong>{name}</strong>{roleLabel && <small>{roleLabel}</small>}</span>{notifications.length > 0 && <div className="admin-notification-wrap"><button className="admin-notification-button has-notifications" type="button" aria-label={`${notifications.length} alertas de revisión`} aria-expanded={open} onClick={() => setOpen(!open)}><Bell size={19}/><span>{notifications.length}</span></button>{open && <div className="admin-notification-menu"><strong><Bell size={16}/> Revisiones pendientes ({notifications.length})</strong><p>Estos avisos publicados llevan 90 días o más y conviene revisar su vigencia.</p><ul>{notifications.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul>{notifications.length > 6 && <small>Y {notifications.length - 6} más…</small>}<button type="button" onClick={() => { setOpen(false); onNotificationClick?.(); }}>Ver alertas y operaciones</button></div>}</div>}{notifications.length === 0 && <span className="admin-no-alerts"><Bell size={18}/> Sin alertas</span>}{onRefresh && <button className="admin-header-icon-button" type="button" aria-label="Actualizar datos" onClick={onRefresh} disabled={refreshing}><RefreshCw size={18} className={refreshing ? "spin" : ""}/></button>}{onSignOut && <button className="admin-header-signout" type="button" onClick={onSignOut}><LogOut size={17}/> <span>Salir</span></button>}</div></header>;
}

function entityLabel(table: string) { return table === "properties" ? "Propiedad" : table === "leads" ? "Consulta" : table === "follow_ups" ? "Seguimiento" : table === "profiles" ? "Cargo de equipo" : table; }
function Overview({ properties, leads, tasks, audit, isAdmin, setTab }: { properties: PropertyRow[]; leads: LeadRow[]; tasks: FollowUpRow[]; audit: AuditRow[]; isAdmin: boolean; setTab: (tab: Tab) => void }) {
  const pending = tasks.filter((task) => task.status === "pending");
  const overdue = pending.filter((task) => new Date(task.due_at).getTime() < Date.now());
  const fresh = leads.filter((lead) => lead.stage === "new");
  const metrics = [
    { label: "Avisos activos", value: properties.filter((item) => ["published", "sold", "rented"].includes(item.status)).length, note: `${properties.length} en inventario`, icon: Building2 },
    { label: "Consultas nuevas", value: fresh.length, note: `${leads.length} contactos en CRM`, icon: Users },
    { label: "Seguimientos abiertos", value: pending.length, note: `${overdue.length} vencidos`, icon: CalendarClock, warn: overdue.length > 0 },
    ...(isAdmin ? [{ label: "Bitácora reciente", value: audit.length, note: "Eventos registrados", icon: FileClock }] : []),
  ];
  return <>
    <div className="admin-metric-grid">{metrics.map(({ label, value, note, icon: Icon, warn }) => <article className={`admin-metric-card ${warn ? "is-warning" : ""}`} key={label}><span className="admin-metric-icon"><Icon size={19}/></span><small>{label}</small><strong>{value}</strong><span>{note}</span></article>)}</div>
    <div className="admin-overview-grid"><section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Últimas consultas</h2><p>Contactos que requieren atención comercial.</p></div><button className="admin-text-button" type="button" onClick={() => setTab("leads")}>Ver CRM</button></div>{leads.slice(0, 5).length ? leads.slice(0, 5).map((lead) => <div className="overview-list-row" key={lead.id}><span className="overview-avatar"><Users size={16}/></span><div><strong>{lead.name}</strong><small>{lead.message}</small></div><span className={`lead-stage-pill lead-${lead.stage}`}>{leadStages[lead.stage] ?? lead.stage}</span></div>) : <EmptyState title="Sin consultas todavía" detail="Los contactos que lleguen desde la web aparecerán aquí."/>}</section>
      <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Próximos seguimientos</h2><p>Agenda de tareas pendientes.</p></div><button className="admin-text-button" type="button" onClick={() => setTab("followups")}>Abrir agenda</button></div>{pending.slice(0, 5).length ? pending.slice(0, 5).map((task) => <div className="overview-list-row" key={task.id}><span className="overview-avatar"><Clock3 size={16}/></span><div><strong>{task.title}</strong><small>{dateLabel(task.due_at)}</small></div><span className={new Date(task.due_at).getTime() < Date.now() ? "task-mini overdue" : "task-mini"}>{new Date(task.due_at).getTime() < Date.now() ? "Vencida" : "Pendiente"}</span></div>) : <EmptyState title="Agenda al día" detail="No hay seguimientos abiertos."/>}</section></div>
      <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Inventario reciente</h2><p>Últimas propiedades actualizadas.</p></div><button className="admin-text-button" type="button" onClick={() => setTab("properties")}>Ver propiedades</button></div>{properties.slice(0, 4).map((item) => <div className="overview-list-row" key={item.id}><span className="overview-avatar"><Building2 size={16}/></span><div><strong>{item.title}</strong><small>{item.location} · {formatPrice(Number(item.price), item.currency)}</small></div><span className={`lead-stage-pill status-${item.status}`}>{statusNames[item.status]}</span></div>)}</section>
    {isAdmin && <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Actividad reciente</h2><p>Últimos cambios registrados en la bitácora.</p></div><button className="admin-text-button" type="button" onClick={() => setTab("audit")}>Abrir auditoría</button></div>{audit.slice(0, 5).length ? audit.slice(0, 5).map((item) => <div className="overview-list-row" key={item.id}><span className="overview-avatar"><FileClock size={16}/></span><div><strong>{entityLabel(item.entity_table)} · {item.action === "INSERT" ? "creado" : item.action === "UPDATE" ? "actualizado" : "eliminado"}</strong><small>{dateLabel(item.created_at)} · {item.actor_id ? `Usuario ${item.actor_id.slice(0, 8)}` : "Origen público/automático"}</small></div></div>) : <EmptyState title="Sin cambios todavía" detail="Las operaciones sobre datos aparecerán en la bitácora."/>}</section>}
  </>;
}
function PropertyEditor({ draft, setDraft, files, setFiles, editing, saving, onCancel, onSubmit }: { draft: PropertyDraft; setDraft: (draft: PropertyDraft) => void; files: File[]; setFiles: (files: File[]) => void; editing: boolean; saving: boolean; onCancel: () => void; onSubmit: (event: FormEvent) => void }) {
  const update = <K extends keyof PropertyDraft>(key: K, value: PropertyDraft[K]) => setDraft({ ...draft, [key]: value });
  const previewImage = files[0] ? URL.createObjectURL(files[0]) : draft.images.split(/\n+/).map((value) => value.trim()).find((value) => /^https:\/\//i.test(value));
  return <form className="admin-property-editor" onSubmit={onSubmit}><div className="editor-heading"><div><h3>{editing ? "Editar propiedad" : "Nueva propiedad"}</h3><p>Los borradores no se muestran en la página pública.</p></div><button type="button" className="admin-icon-button" onClick={onCancel} aria-label="Cerrar formulario"><X size={17}/></button></div>
    <div className="admin-form-grid">
      <label className="field-wide">Título<input required value={draft.title} onChange={(e) => update("title", e.target.value)} placeholder="Casa con parque y vista a las sierras"/></label>
      <label>Operación<select value={draft.operation} onChange={(e) => update("operation", e.target.value as PropertyDraft["operation"])}><option>Venta</option><option>Alquiler</option></select></label>
      <label>Tipo<select value={draft.category} onChange={(e) => update("category", e.target.value)}>{["Casa", "Campo", "Terreno", "Departamento", "Local", "Otro"].map((category) => <option key={category}>{category}</option>)}</select></label>
      <label>Localidad<input required value={draft.location} onChange={(e) => update("location", e.target.value)} placeholder="San Javier"/></label>
      <label>Región / provincia<input required value={draft.region} onChange={(e) => update("region", e.target.value)} placeholder="Traslasierra, Córdoba"/></label>
      <label>Precio<input required min="0" type="number" value={draft.price} onChange={(e) => update("price", e.target.value)}/></label>
      <label>Moneda<select value={draft.currency} onChange={(e) => update("currency", e.target.value as "USD" | "ARS")}><option value="USD">Dólares estadounidenses (USD)</option><option value="ARS">Pesos argentinos (ARS)</option></select></label>
      {draft.operation === "Alquiler" && <label>Periodicidad<select value={draft.price_frequency} onChange={(e) => update("price_frequency", e.target.value)}><option value="mes">Por mes</option></select></label>}
      <label>Superficie<input required min="0.01" type="number" step="0.01" value={draft.surface} onChange={(e) => update("surface", e.target.value)}/></label>
      <label>Unidad<select value={draft.surface_unit} onChange={(e) => update("surface_unit", e.target.value as "ha" | "m²")}><option value="m²">m²</option><option value="ha">Hectáreas</option></select></label>
      <label>Superficie cubierta (m²)<small>Opcional; si falta, la web indica “A consultar”.</small><input min="0.01" type="number" step="0.01" value={draft.covered_surface} onChange={(e) => update("covered_surface", e.target.value)}/></label>
      <label>Dormitorios<input min="0" type="number" value={draft.bedrooms} onChange={(e) => update("bedrooms", e.target.value)}/></label>
      <label>Baños<input min="0" type="number" value={draft.bathrooms} onChange={(e) => update("bathrooms", e.target.value)}/></label>
      <label>Ambientes<input min="0" type="number" value={draft.rooms} onChange={(e) => update("rooms", e.target.value)}/></label>
      <label>Documentación<input value={draft.legal_status} onChange={(e) => update("legal_status", e.target.value)} placeholder="Escritura"/></label>
      <label>Estado<select value={draft.status} onChange={(e) => { const status = e.target.value as PropertyStatus; setDraft({ ...draft, status, ...(status === "sold" ? { operation: "Venta" as const } : status === "rented" ? { operation: "Alquiler" as const } : {}) }); }}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field-wide">Características <small>Separadas por coma</small><input value={draft.features} onChange={(e) => update("features", e.target.value)} placeholder="Parque, pileta, gas natural"/></label>
      <label className="field-wide">Descripción<textarea rows={4} value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder="Información clara sobre el inmueble"/></label>
      <label className="field-wide">Imágenes <small>Una URL HTTPS o ruta privada por línea (hasta 12)</small><textarea rows={3} value={draft.images} onChange={(e) => update("images", e.target.value)} placeholder="https://..."/></label>
      <label className="field-wide admin-file-picker"><UploadCloud size={17}/> Subir fotos desde tu dispositivo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 12))}/><small>{files.length ? `${files.length} archivo(s) listos · máximo 8 MB cada uno` : "Las fotos de borradores quedan privadas; los avisos activos se muestran con enlaces temporales."}</small></label>
    </div>
    <aside className="property-live-preview"><span className="admin-eyebrow">VISTA PREVIA EN VIVO</span>{previewImage ? <img src={previewImage} alt="Vista previa de la propiedad" /> : <div className="property-live-preview-empty"><Home size={22} /><span>Agregá una foto para verla acá</span></div>}<div><small>{draft.operation} · {draft.category}</small><h4>{draft.title || "Título de la propiedad"}</h4><p>{draft.location || "Localidad"}{draft.region ? ` · ${draft.region}` : ""}</p><strong>{draft.price ? `${draft.currency} ${Number(draft.price).toLocaleString("es-AR")}` : "Precio a confirmar"}</strong></div></aside>
    <div className="editor-actions"><button type="button" className="admin-secondary-button" onClick={onCancel}><ArrowLeft size={15}/> Cancelar</button><button type="submit" disabled={saving} className="admin-primary-button">{saving ? <LoaderCircle className="spin" size={16}/> : <Save size={16}/>} {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear propiedad"}</button></div>
  </form>;
}
function LoginView({ login, setLogin, onSubmit, loading }: { login: { email: string; password: string }; setLogin: (value: { email: string; password: string }) => void; onSubmit: (event: FormEvent) => void; loading: boolean }) {
  return <div className="admin-login-page"><AdminHeader/><main className="admin-login-card"><span className="admin-login-icon"><ShieldCheck size={25}/></span><span className="admin-eyebrow">ACCESO DEL EQUIPO</span><h1>Panel de administración</h1><p>Ingresá con la cuenta de Supabase autorizada por la inmobiliaria.</p><form onSubmit={onSubmit}><label>Email<input type="email" autoComplete="username" required value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })}/></label><label>Contraseña<input type="password" autoComplete="current-password" required value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })}/></label><button className="admin-primary-button" type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <ShieldCheck size={16}/>} Iniciar sesión</button></form><small>El registro de usuarios está deshabilitado en esta pantalla.</small></main></div>;
}
function SetupMessage() { return <div className="admin-login-page"><AdminHeader/><main className="admin-login-card setup-card"><span className="admin-login-icon"><AlertTriangle size={25}/></span><span className="admin-eyebrow">FALTA CONFIGURACIÓN</span><h1>Conectá Supabase</h1><p>Definí <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en `.env.local` para desarrollo o en GitHub Actions para publicar. Aplicá primero <code>supabase/schema.sql</code> y creá primero el usuario dueño en Supabase Auth y luego asignale el rol owner.</p><a className="admin-secondary-button" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Abrir Supabase</a></main></div>; }
function AccessDenied({ onSignOut, loading }: { onSignOut: () => void; loading: boolean }) { return <div className="admin-login-page"><AdminHeader onSignOut={onSignOut}/><main className="admin-login-card"><span className="admin-login-icon"><ShieldCheck size={25}/></span><h1>{loading ? "Verificando acceso…" : "Acceso no autorizado"}</h1><p>{loading ? "Consultando los permisos de esta cuenta." : "La cuenta inició sesión, pero todavía no tiene un rol habilitado. Solicitá autorización al dueño o administrador del sistema."}</p>{!loading && <button className="admin-secondary-button" type="button" onClick={onSignOut}><LogOut size={15}/> Cerrar sesión</button>}</main></div>; }
function AdminLoading() { return <div className="admin-login-page"><AdminHeader/><div className="admin-loading"><LoaderCircle className="spin" size={25}/> Cargando acceso…</div></div>; }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="admin-empty"><span><ClipboardList size={21}/></span><strong>{title}</strong><p>{detail}</p></div>; }


function TeamManager({ team, currentUserId, currentRole, onRoleChange }: { team: TeamRow[]; currentUserId: string; currentRole: Role; onRoleChange: (member: TeamRow, role: Role) => void }) {
  const allRoles: Role[] = ["owner", "admin", "manager", "secretary", "user"];
  const availableRoles = currentRole === "owner" ? allRoles : ["manager", "secretary", "user"] as Role[];
  const permissions: { role: Role; detail: string }[] = [
    { role: "owner", detail: "Acceso total, administra todos los cargos y conserva el control de la cuenta dueña." },
    { role: "admin", detail: "Gestiona inventario, CRM, seguimientos y auditoría; administra gestores/secretaría, no dueños ni administradores." },
    { role: "manager", detail: "Crea y edita propiedades, fotos, consultas y seguimientos; no borra registros ni administra equipo/auditoría." },
    { role: "secretary", detail: "Consulta inventario; registra y actualiza consultas y seguimientos. No edita propiedades ni ve equipo/auditoría." },
  ];
  return <section className="admin-panel-card">
    <div className="admin-panel-heading"><div><h2>Equipo y permisos</h2><p>Asigná el cargo adecuado a cada cuenta. Los cambios se registran en auditoría.</p></div><span className="admin-count-pill">{team.length} cuentas</span></div>
    <div className="team-security-note"><ShieldCheck size={16}/><span>Primero creá la cuenta en Supabase Auth. Las cuentas nuevas no tienen acceso hasta que se les asigne un rol. Nadie puede cambiar su propio cargo; un administrador no puede crear ni modificar dueños/administradores.</span></div>
    <div className="role-permission-grid">{permissions.map(({ role: permissionRole, detail }) => <article className="role-permission-card" key={permissionRole}><span className={`role-badge role-${permissionRole}`}>{roleNames[permissionRole]}</span><p>{detail}</p></article>)}</div>
    {team.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Persona</th><th>Acceso actual</th><th>Modificar cargo</th><th>Alta</th></tr></thead><tbody>{team.map((member) => {
      const restrictedAdmin = currentRole === "admin" && ["owner", "admin"].includes(member.role);
      const options = availableRoles.includes(member.role) ? availableRoles : [member.role, ...availableRoles];
      const isSelf = member.id === currentUserId;
      return <tr key={member.id}><td><strong>{member.full_name || "Sin nombre"}</strong><small className="admin-contact-details">{member.email || member.id}</small></td><td><span className={`role-badge role-${member.role}`}>{roleNames[member.role]}</span></td><td><select className="status-select" aria-label={`Cargo de ${member.full_name || member.email || "usuario"}`} value={member.role} disabled={isSelf || restrictedAdmin} onChange={(event) => onRoleChange(member, event.target.value as Role)}>{options.map((roleOption) => <option key={roleOption} value={roleOption}>{roleNames[roleOption]}</option>)}</select>{isSelf && <small className="admin-subline">Tu cuenta: cambio bloqueado</small>}{restrictedAdmin && <small className="admin-subline">Sólo el dueño puede modificar este cargo</small>}</td><td>{dateLabel(member.created_at)}</td></tr>;
    })}</tbody></table></div> : <EmptyState title="Todavía no hay perfiles" detail="Creá las cuentas del equipo en Supabase Auth y volvé a cargar para asignarles un rol."/>}
  </section>;
}
