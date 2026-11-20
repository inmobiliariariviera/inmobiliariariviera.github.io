import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import AdminPinDialog from "@/components/real-estate/AdminPinDialog";
import { Calculator, Check, CircleDollarSign, Eye, LockKeyhole, Pencil, Plus, Save, Trash2, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { supabase, type PropertyRow } from "@/lib/supabase";

type FinanceType = "income" | "expense" | "owner_payment" | "agency_profit" | "commission";
type FinanceStatus = "pending" | "completed" | "voided";
type FinanceRow = { id: string; property_id: string | null; type: FinanceType; description: string; amount: number | string; currency: "USD" | "ARS"; status: FinanceStatus; occurred_at: string; notes: string };
type Props = { properties: PropertyRow[]; session: Session; canManageFinance: boolean };
const typeNames: Record<FinanceType, string> = { income: "Ingreso", expense: "Salida", owner_payment: "Pago a dueño", agency_profit: "Ganancia Riviera", commission: "Comisión" };
const statusNames: Record<FinanceStatus, string> = { pending: "Pendiente", completed: "Realizado", voided: "Anulado" };
const emptyFinance = { type: "income" as FinanceType, description: "", amount: "", currency: "USD" as "USD" | "ARS", property_id: "", notes: "" };
const money = (value: number, currency: "USD" | "ARS") => new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const daysSince = (value: string) => Math.floor((Date.now() - new Date(value).getTime()) / 86400000);

export default function OperationsPanel({ properties, session, canManageFinance }: Props) {
  const [finance, setFinance] = useState<FinanceRow[]>([]);
  const [currencyView, setCurrencyView] = useState<"ARS" | "USD">("ARS");
  const [draft, setDraft] = useState(emptyFinance);
  const [calc, setCalc] = useState({ operation: "sale" as "sale" | "rent", saleValue: "", monthlyRent: "", termMonths: "", rentCommission: "5", buyerPercent: "3", iva: "21", currency: "USD" as "USD" | "ARS" });
  const [operatingExpenses, setOperatingExpenses] = useState("");
  const [usdRate, setUsdRate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<FinanceRow | null>(null);
  const [editDraft, setEditDraft] = useState(emptyFinance);
  const [saving, setSaving] = useState(false);
  const [profitPin, setProfitPin] = useState("");
  const [profitUnlocked, setProfitUnlocked] = useState(false);
  const [checkingProfitPin, setCheckingProfitPin] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<null | { title: string; description: string; actionLabel: string; run: () => Promise<void> }>(null);
  const load = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("financial_transactions").select("id, property_id, type, description, amount, currency, status, occurred_at, notes").order("occurred_at", { ascending: false }).limit(100);
    if (error) toast.error(`No se pudieron cargar finanzas: ${error.message}`);
    setFinance((data ?? []) as FinanceRow[]);
    setSelected((current) => current.filter((id) => (data ?? []).some((row) => row.id === id)));
  };
  useEffect(() => {
    const initialize = async () => {
      if (supabase) await supabase.rpc("lock_profit_view");
      await load();
    };
    void initialize();
  }, []);
  const totals = useMemo(() => finance.reduce((acc, row) => {
    if (row.status === "completed") acc[row.currency][row.type] += Number(row.amount);
    return acc;
  }, { USD: { income: 0, expense: 0, owner_payment: 0, agency_profit: 0, commission: 0 }, ARS: { income: 0, expense: 0, owner_payment: 0, agency_profit: 0, commission: 0 } } as Record<"USD" | "ARS", Record<FinanceType, number>>), [finance]);
  const saleValue = Number(calc.saleValue) || 0;
  const monthlyRent = Number(calc.monthlyRent) || 0;
  const termMonths = Number(calc.termMonths) || 0;
  const contractRentTotal = monthlyRent * termMonths;
  const baseValue = calc.operation === "sale" ? saleValue : contractRentTotal;
  const buyerCommissionPercent = Math.min(6, Math.max(0, Number(calc.buyerPercent) || 0));
  const sellerCommissionPercent = 6 - buyerCommissionPercent;
  const buyerCommission = saleValue * buyerCommissionPercent / 100;
  const sellerCommission = saleValue * sellerCommissionPercent / 100;
  const commissionAmount = calc.operation === "sale" ? saleValue * 0.06 : contractRentTotal * ((Number(calc.rentCommission) || 0) / 100);
  const ivaRate = Number(calc.iva) || 0;
  const ivaAmount = commissionAmount * ivaRate / 100;
  const sellerIva = sellerCommission * ivaRate / 100;
  const buyerIva = buyerCommission * ivaRate / 100;
  const rivieraExpenses = Number(operatingExpenses) || 0;
  const agencyProfit = commissionAmount - rivieraExpenses;
  const sellerNet = saleValue - sellerCommission - sellerIva;
  const convertedBase = Number(usdRate) > 0 ? (calc.currency === "USD" ? baseValue * Number(usdRate) : baseValue / Number(usdRate)) : null;
  const verifyProfitPin = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !canManageFinance || !profitPin) return;
    setCheckingProfitPin(true);
    const { data, error } = await supabase.rpc("unlock_profit_view", { p_pin: profitPin });
    if (error) toast.error(`No se pudo validar la contraseña: ${error.message}`);
    else if (data === true) { setProfitUnlocked(true); setProfitPin(""); toast.success("Bloque de ganancias desbloqueado por 15 minutos"); await load(); }
    else toast.error("Contraseña incorrecta o acceso temporalmente bloqueado.");
    setCheckingProfitPin(false);
  };
  const lockProfit = async () => {
    if (supabase) {
      const { error } = await supabase.rpc("lock_profit_view");
      if (error) toast.error(`No se pudo bloquear el bloque de ganancias: ${error.message}`);
    }
    setProfitUnlocked(false);
    setFinance((current) => current.filter((row) => row.type !== "agency_profit" && row.type !== "commission"));
  };
  useEffect(() => {
    if (!profitUnlocked) return;
    const timeout = window.setTimeout(() => {
      if (supabase) void supabase.rpc("lock_profit_view");
      setProfitUnlocked(false);
      setFinance((current) => current.filter((row) => row.type !== "agency_profit" && row.type !== "commission"));
      toast.info("El bloque privado se volvió a bloquear automáticamente.");
    }, 15 * 60 * 1000);
    return () => {
      window.clearTimeout(timeout);
      if (supabase) void supabase.rpc("lock_profit_view");
    };
  }, [profitUnlocked]);
  const visibleFinance = finance.filter((row) => row.currency === currencyView);
  const visibleSelection = visibleFinance.filter((row) => selected.includes(row.id));
  const addFinance = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !canManageFinance || !draft.description.trim() || Number(draft.amount) < 0) return;
    setSaving(true);
    const { error } = await supabase.from("financial_transactions").insert({ ...draft, amount: Number(draft.amount), property_id: draft.property_id || null, created_by: session.user.id });
    if (error) toast.error(error.message); else { toast.success("Movimiento registrado"); setDraft(emptyFinance); await load(); }
    setSaving(false);
  };
  const startEdit = (row: FinanceRow) => {
    setEditing(row);
    setEditDraft({ type: row.type, description: row.description, amount: String(row.amount), currency: row.currency, property_id: row.property_id ?? "", notes: row.notes ?? "" });
  };
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !canManageFinance || !editing || !editDraft.description.trim() || !Number.isFinite(Number(editDraft.amount)) || Number(editDraft.amount) < 0) return;
    setSaving(true);
    const { error } = await supabase.from("financial_transactions").update({ ...editDraft, description: editDraft.description.trim(), amount: Number(editDraft.amount), property_id: editDraft.property_id || null }).eq("id", editing.id);
    if (error) toast.error(error.message); else { toast.success("Movimiento actualizado"); setEditing(null); await load(); }
    setSaving(false);
  };
  const updateStatus = async (row: FinanceRow) => {
    if (!supabase || !canManageFinance) return;
    const status: FinanceStatus = row.status === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("financial_transactions").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success(status === "completed" ? "Movimiento marcado como realizado" : "Movimiento reabierto"); await load(); }
  };
  const deleteOne = async (row: FinanceRow) => {
    if (!supabase || !canManageFinance || !window.confirm(`¿Eliminar el movimiento “${row.description}” por ${money(Number(row.amount), row.currency)}? Esta acción no se puede deshacer.`)) return;
    setPendingDelete({ title: "Confirmar eliminación", description: `Se borrará el movimiento “${row.description}”. Para continuar, confirmá con tu contraseña de administrador.`, actionLabel: "Eliminar movimiento", run: async () => {
      const { error } = await supabase!.from("financial_transactions").delete().eq("id", row.id);
      if (error) toast.error(error.message); else { toast.success("Movimiento eliminado"); await load(); }
    } });
  };
  const deleteSelected = async () => {
    if (!supabase || !canManageFinance || !visibleSelection.length || !window.confirm(`¿Eliminar los ${visibleSelection.length} movimientos seleccionados de ${currencyView}? Esta acción no se puede deshacer.`)) return;
    const ids = visibleSelection.map((row) => row.id);
    setPendingDelete({ title: "Confirmar eliminación múltiple", description: `Se eliminarán ${ids.length} movimientos de ${currencyView}. Confirmá con tu contraseña de administrador.`, actionLabel: "Eliminar seleccionados", run: async () => {
      const { error } = await supabase!.from("financial_transactions").delete().in("id", ids);
      if (error) toast.error(error.message); else { toast.success(`${ids.length} movimientos eliminados`); setSelected([]); await load(); }
    } });
  };
  const deleteAll = async () => {
    if (!supabase || !canManageFinance || !finance.length) return;
    const typed = window.prompt(`Se eliminarán TODOS los movimientos de caja, incluidos los que no están cargados en esta vista. Escribí ELIMINAR TODO para confirmar.`);
    if (typed !== "ELIMINAR TODO") { if (typed !== null) toast.error("Confirmación incorrecta; no se borró nada."); return; }
    setPendingDelete({ title: "Confirmar vaciado de caja", description: "Se eliminarán todos los movimientos operativos, también los más antiguos no cargados en la lista. Esta acción es irreversible. Confirmá con tu contraseña de administrador.", actionLabel: "Eliminar toda la caja", run: async () => {
      const { error } = await supabase!.from("financial_transactions").delete().not("id", "is", null);
      if (error) toast.error(error.message); else { toast.success("Se eliminaron todos los movimientos operativos de caja"); setSelected([]); await load(); }
    } });
  };
  const toggleSelected = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allVisibleSelected = visibleFinance.length > 0 && visibleFinance.every((row) => selected.includes(row.id));
  const toggleAllVisible = () => setSelected((current) => allVisibleSelected ? current.filter((id) => !visibleFinance.some((row) => row.id === id)) : [...new Set([...current, ...visibleFinance.map((row) => row.id)])]);

  return <section className="admin-operations-page">
    <div className="operations-alert-grid"><article className="operations-summary-card"><span><WalletCards size={18} /></span><small>Ingresos realizados</small><strong>{money(totals.ARS.income, "ARS")}</strong><strong>{money(totals.USD.income, "USD")}</strong><p>Acumulado separado por moneda</p></article><article className="operations-summary-card operations-private-profit"><span><LockKeyhole size={18} /></span><small>Ganancia Riviera · privada</small>{profitUnlocked ? <><strong>{money(totals.ARS.agency_profit + totals.ARS.commission, "ARS")}</strong><strong>{money(totals.USD.agency_profit + totals.USD.commission, "USD")}</strong><p>ARS y USD por separado</p><button type="button" className="profit-lock-button" onClick={() => void lockProfit()}>Bloquear</button></> : canManageFinance ? <form className="profit-unlock-form" onSubmit={(event) => void verifyProfitPin(event)}><label htmlFor="profit-pin">Contraseña para ver este bloque</label><div><input id="profit-pin" type="password" autoComplete="current-password" required value={profitPin} onChange={(event) => setProfitPin(event.target.value)} /><button type="submit" disabled={checkingProfitPin}>{checkingProfitPin ? "Verificando…" : <><Eye size={15}/> Desbloquear</>}</button></div><p>Los demás datos de caja siguen disponibles.</p></form> : <p>Visible sólo para dueño/administrador con contraseña.</p>}</article></div>
    <div className="operations-grid"><section className="admin-panel-card">
      <div className="admin-panel-heading"><div><h2><Calculator size={19} /> Calculadora interna</h2><p>Elegí una operación y moneda. Los importes y honorarios se calculan por separado.</p></div></div>
      <div className="calculator-mode-tabs" role="tablist" aria-label="Tipo de cálculo"><button type="button" role="tab" aria-selected={calc.operation === "sale"} className={calc.operation === "sale" ? "active" : ""} onClick={() => setCalc({ ...calc, operation: "sale" })}>Venta</button><button type="button" role="tab" aria-selected={calc.operation === "rent"} className={calc.operation === "rent" ? "active" : ""} onClick={() => setCalc({ ...calc, operation: "rent" })}>Alquiler</button></div>
      <div className="operations-calculator-grid">
        <label>Moneda de cálculo<select value={calc.currency} onChange={(e) => setCalc({ ...calc, currency: e.target.value as "USD" | "ARS" })}><option value="ARS">Pesos argentinos (ARS)</option><option value="USD">Dólares (USD)</option></select></label>
        <label>Cotización actual · ARS por 1 USD<input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Ingresá la cotización vigente" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} /></label>
        {calc.operation === "sale" ? <>
          <label>Precio de venta del inmueble<input type="number" min="0" step="0.01" inputMode="decimal" value={calc.saleValue} onChange={(e) => setCalc({ ...calc, saleValue: e.target.value })} /></label>
          <label>Comisión a cargo del comprador (%)<input type="number" min="0" max="6" step="0.1" inputMode="decimal" value={calc.buyerPercent} onChange={(e) => setCalc({ ...calc, buyerPercent: e.target.value })} /></label>
          <label>IVA estimado sobre honorarios (%)<input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={calc.iva} onChange={(e) => setCalc({ ...calc, iva: e.target.value })} /></label>
        </> : <>
          <label>Alquiler mensual inicial<input type="number" min="0" step="0.01" inputMode="decimal" value={calc.monthlyRent} onChange={(e) => setCalc({ ...calc, monthlyRent: e.target.value })} /></label>
          <label>Duración del contrato (meses)<input type="number" min="1" step="1" inputMode="numeric" value={calc.termMonths} onChange={(e) => setCalc({ ...calc, termMonths: e.target.value })} /></label>
          <label>Comisión de referencia sobre el contrato (%)<input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={calc.rentCommission} onChange={(e) => setCalc({ ...calc, rentCommission: e.target.value })} /></label>
          <label>IVA estimado sobre honorarios (%)<input type="number" min="0" max="100" step="0.1" inputMode="decimal" value={calc.iva} onChange={(e) => setCalc({ ...calc, iva: e.target.value })} /></label>
        </>}
        <label>Gastos operativos Riviera (para ganancia neta)<input type="number" min="0" step="0.01" inputMode="decimal" value={operatingExpenses} onChange={(e) => setOperatingExpenses(e.target.value)} /></label>
      </div>
      <div className="calculator-result-grid">
        {calc.operation === "sale" ? <>
          <span>Precio de venta<strong>{money(saleValue, calc.currency)}</strong></span>
          <span>Comisión total Riviera · 6%<strong>{money(commissionAmount, calc.currency)}</strong></span>
          <span>Parte vendedor · {sellerCommissionPercent.toLocaleString("es-AR")}%<strong>{money(sellerCommission, calc.currency)}</strong></span>
          <span>Parte comprador · {buyerCommissionPercent.toLocaleString("es-AR")}%<strong>{money(buyerCommission, calc.currency)}</strong></span>
          <span>IVA estimado · {ivaRate}%<strong>{money(ivaAmount, calc.currency)}</strong></span>
          <span>Neto estimado para vendedor<strong>{money(sellerNet, calc.currency)}</strong></span>
          <span>Total honorarios + IVA comprador<strong>{money(buyerCommission + buyerIva, calc.currency)}</strong></span>
          <span>Total honorarios + IVA vendedor<strong>{money(sellerCommission + sellerIva, calc.currency)}</strong></span>
        </> : <>
          <span>Total estimado de alquileres · canon inicial × meses<strong>{money(contractRentTotal, calc.currency)}</strong></span>
          <span>Honorarios de referencia · {calc.rentCommission || 0}% del contrato<strong>{money(commissionAmount, calc.currency)}</strong></span>
          <span>IVA estimado · {ivaRate}%<strong>{money(ivaAmount, calc.currency)}</strong></span>
          <span>Total honorarios + IVA · referencia locatario<strong>{money(commissionAmount + ivaAmount, calc.currency)}</strong></span>
          <span>Alquileres brutos del locador · sin actualizaciones<strong>{money(contractRentTotal, calc.currency)}</strong></span>
        </>}
        <span>Ganancia neta estimada Riviera · privada<strong>{profitUnlocked ? money(agencyProfit, calc.currency) : "••••••"}</strong></span>
      </div>
      {convertedBase !== null && <p className="finance-conversion">Equivalencia de la base: <strong>{money(baseValue, calc.currency)}</strong> ≈ <strong>{money(convertedBase, calc.currency === "USD" ? "ARS" : "USD")}</strong> · Cotización: 1 USD = {money(Number(usdRate), "ARS")}</p>}
      {calc.operation === "sale" ? <small className="admin-subline">Venta: comisión total Riviera fijada en 6% del precio. La distribución inicial es 3% por parte; el campo del comprador permite mover la distribución y el porcentaje del vendedor completa el 6%. La escala supletoria cordobesa indica 3% a cada parte cuando no hay acuerdo. IVA aparte y editable.</small> : <small className="admin-subline">Alquiler: referencia de Córdoba de 5% del monto total del contrato a cargo del locatario sólo a falta de acuerdo; los honorarios se pactan libremente. La comisión se calcula sobre canon inicial × meses, sin aumentos futuros. Podés ajustar el porcentaje al acuerdo real. IVA aparte y editable.</small>}
      <small className="admin-subline">La ganancia privada estima honorarios base menos gastos operativos Riviera; el IVA se muestra aparte. Verificá el acuerdo firmado y el tratamiento fiscal con el profesional correspondiente. <a href="https://cpicordoba.org.ar/wp-content/uploads/2025/04/Ley-9445-CPI.pdf" target="_blank" rel="noreferrer">Ley 9445 de Córdoba · arts. 24–25</a>.</small>
    </section>
    <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2><Plus size={19} /> Registrar movimiento</h2><p>Los cambios quedan auditados y se marcan por color.</p></div></div><form className="operations-finance-form" onSubmit={addFinance}><select aria-label="Tipo de movimiento" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as FinanceType })}>{Object.entries(typeNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input required placeholder="Descripción" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><input required type="number" min="0" step="0.01" placeholder="Importe" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /><select aria-label="Moneda" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value as "USD" | "ARS" })}><option>USD</option><option>ARS</option></select><select aria-label="Propiedad asociada" value={draft.property_id} onChange={(e) => setDraft({ ...draft, property_id: e.target.value })}><option value="">Sin propiedad</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select><button className="admin-primary-button" type="submit" disabled={!canManageFinance || saving}><Save size={15} /> Registrar</button></form></section></div>
    <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Movimientos y pagos</h2><p>Ingresos, salidas, pagos a dueños y ganancia de la inmobiliaria, separados por moneda.</p></div><span className="admin-count-pill">{finance.length} registros recientes</span></div><div className="finance-currency-tabs" role="tablist" aria-label="Moneda de movimientos"><button type="button" role="tab" aria-selected={currencyView === "ARS"} className={currencyView === "ARS" ? "active" : ""} onClick={() => setCurrencyView("ARS")}>Pesos argentinos · ARS <span>{finance.filter((row) => row.currency === "ARS").length}</span></button><button type="button" role="tab" aria-selected={currencyView === "USD"} className={currencyView === "USD" ? "active" : ""} onClick={() => setCurrencyView("USD")}>Dólares · USD <span>{finance.filter((row) => row.currency === "USD").length}</span></button></div>
      {editing && <form className="finance-edit-form" onSubmit={saveEdit}><div className="finance-edit-title"><strong>Editar movimiento</strong><button type="button" className="admin-icon-button" aria-label="Cerrar edición" onClick={() => setEditing(null)}><X size={17}/></button></div><div className="operations-finance-form"><select aria-label="Tipo" value={editDraft.type} onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value as FinanceType })}>{Object.entries(typeNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input required aria-label="Descripción" placeholder="Descripción" value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}/><input required aria-label="Importe" type="number" min="0" step="0.01" value={editDraft.amount} onChange={(e) => setEditDraft({ ...editDraft, amount: e.target.value })}/><select aria-label="Moneda" value={editDraft.currency} onChange={(e) => setEditDraft({ ...editDraft, currency: e.target.value as "USD" | "ARS" })}><option>USD</option><option>ARS</option></select><select aria-label="Propiedad" value={editDraft.property_id} onChange={(e) => setEditDraft({ ...editDraft, property_id: e.target.value })}><option value="">Sin propiedad</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select><button type="submit" className="admin-primary-button" disabled={saving}><Save size={15}/> Guardar cambios</button><input className="finance-notes-input" aria-label="Notas" placeholder="Notas (opcional)" value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}/></div></form>}
      {canManageFinance && visibleFinance.length > 0 && <div className="finance-bulk-toolbar"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible}/> Seleccionar los {visibleFinance.length} de esta moneda</label><span>{visibleSelection.length} seleccionados</span><button type="button" className="admin-secondary-button" onClick={() => void deleteSelected()} disabled={!visibleSelection.length}><Trash2 size={15}/> Eliminar seleccionados</button><button type="button" className="finance-delete-all" onClick={() => void deleteAll()}>Eliminar todos los movimientos</button></div>}
      {visibleFinance.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{canManageFinance && <th aria-label="Selección"></th>}<th>Concepto</th><th>Tipo</th><th>Importe</th><th>Estado</th><th>Fecha</th>{canManageFinance && <th>Acciones</th>}</tr></thead><tbody>{visibleFinance.map((row) => <tr key={row.id}>{canManageFinance && <td><input type="checkbox" aria-label={`Seleccionar ${row.description}`} checked={selected.includes(row.id)} onChange={() => toggleSelected(row.id)}/></td>}<td><strong>{row.description}</strong><small className="admin-subline">{properties.find((property) => property.id === row.property_id)?.title ?? "Sin propiedad"}</small></td><td>{typeNames[row.type]}</td><td>{(row.type === "agency_profit" || row.type === "commission") && !profitUnlocked ? "••••••" : money(Number(row.amount), row.currency)}</td><td><span className={`finance-status finance-${row.status}`}>{statusNames[row.status]}</span></td><td>{new Date(row.occurred_at).toLocaleDateString("es-AR")}</td>{canManageFinance && <td><div className="finance-row-buttons"><button type="button" className="finance-edit-button" onClick={() => startEdit(row)} aria-label={`Editar ${row.description}`}><Pencil size={15}/> Editar</button><button type="button" className="finance-edit-button" onClick={() => void updateStatus(row)}><Check size={15}/>{row.status === "completed" ? "Reabrir" : "Realizado"}</button><button type="button" className="admin-row-delete" aria-label={`Eliminar ${row.description}`} onClick={() => void deleteOne(row)}><Trash2 size={15}/></button></div></td>}</tr>)}</tbody></table></div> : <div className="admin-empty"><span><WalletCards size={21} /></span><strong>Sin movimientos en {currencyView}</strong><p>Registrá el primer ingreso, gasto o pago en esta moneda.</p></div>}
      {finance.length === 100 && <small className="finance-list-note">Se muestran los 100 movimientos más recientes. “Eliminar todos” incluye también los registros anteriores no cargados en esta lista.</small>}
    </section>
    {pendingDelete && <AdminPinDialog title={pendingDelete.title} description={pendingDelete.description} actionLabel={pendingDelete.actionLabel} onAuthorized={pendingDelete.run} onCancel={() => setPendingDelete(null)} />}
  </section>;
}
