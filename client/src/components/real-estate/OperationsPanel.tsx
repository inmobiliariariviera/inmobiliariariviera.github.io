import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { AlertCircle, Calculator, Check, CircleDollarSign, Plus, Save, WalletCards } from "lucide-react";
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
  const [draft, setDraft] = useState(emptyFinance);
  const [calc, setCalc] = useState({ sale: "", owner: "", expenses: "", commission: "5", currency: "USD" as "USD" | "ARS" });
  const load = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("financial_transactions").select("id, property_id, type, description, amount, currency, status, occurred_at, notes").order("occurred_at", { ascending: false }).limit(100);
    if (error) toast.error(`No se pudieron cargar finanzas: ${error.message}`);
    setFinance((data ?? []) as FinanceRow[]);
  };
  useEffect(() => { void load(); }, []);
  const alerts = useMemo(() => properties.filter((property) => property.status === "published" && property.created_at && daysSince(property.created_at) >= 90), [properties]);
  const totals = useMemo(() => finance.reduce((acc, row) => { if (row.status === "completed") acc[row.type] += Number(row.amount); return acc; }, { income: 0, expense: 0, owner_payment: 0, agency_profit: 0, commission: 0 } as Record<FinanceType, number>), [finance]);
  const sale = Number(calc.sale) || 0;
  const owner = Number(calc.owner) || 0;
  const expenses = Number(calc.expenses) || 0;
  const commissionAmount = sale * ((Number(calc.commission) || 0) / 100);
  const agencyProfit = commissionAmount - expenses;
  const addFinance = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !canManageFinance || !draft.description.trim() || Number(draft.amount) < 0) return;
    const { error } = await supabase.from("financial_transactions").insert({ ...draft, amount: Number(draft.amount), property_id: draft.property_id || null, created_by: session.user.id });
    if (error) toast.error(error.message); else { toast.success("Movimiento registrado"); setDraft(emptyFinance); await load(); }
  };
  const updateStatus = async (row: FinanceRow) => {
    if (!supabase || !canManageFinance) return;
    const status: FinanceStatus = row.status === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("financial_transactions").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", row.id);
    if (error) toast.error(error.message); else { toast.success(status === "completed" ? "Movimiento marcado como realizado" : "Movimiento reabierto"); await load(); }
  };
  return <section className="admin-operations-page">
    <div className="operations-alert-grid"><article className="operations-summary-card"><span><WalletCards size={18} /></span><small>Ingresos realizados</small><strong>{money(totals.income, "USD")}</strong><p>Acumulado registrado</p></article><article className="operations-summary-card"><span><CircleDollarSign size={18} /></span><small>Ganancia Riviera</small><strong>{money(totals.agency_profit + totals.commission, "USD")}</strong><p>Comisiones y margen</p></article><article className={`operations-summary-card ${alerts.length ? "is-warning" : ""}`}><span><AlertCircle size={18} /></span><small>Alertas de 90 días</small><strong>{alerts.length}</strong><p>Sin eliminar propiedades</p></article></div>
    {alerts.length > 0 && <div className="operations-alert-box"><AlertCircle size={18} /><div><strong>Propiedades que requieren revisión comercial</strong><p>{alerts.map((property) => <span key={property.id}>{property.title} · {daysSince(property.created_at)} días</span>)}</p></div></div>}
    <div className="operations-grid"><section className="admin-panel-card"><div className="admin-panel-heading"><div><h2><Calculator size={19} /> Calculadora interna</h2><p>Estimá comisión, pago al dueño y margen de Riviera.</p></div></div><div className="operations-calculator-grid"><label>Precio de operación<input type="number" min="0" value={calc.sale} onChange={(e) => setCalc({ ...calc, sale: e.target.value })} /></label><label>Pago al dueño<input type="number" min="0" value={calc.owner} onChange={(e) => setCalc({ ...calc, owner: e.target.value })} /></label><label>Gastos<input type="number" min="0" value={calc.expenses} onChange={(e) => setCalc({ ...calc, expenses: e.target.value })} /></label><label>Comisión %<input type="number" min="0" max="100" step="0.1" value={calc.commission} onChange={(e) => setCalc({ ...calc, commission: e.target.value })} /></label></div><div className="calculator-result-grid"><span>Comisión estimada<strong>{money(commissionAmount, calc.currency)}</strong></span><span>Ganancia Riviera<strong>{money(agencyProfit, calc.currency)}</strong></span><span>Resultado dueño<strong>{money(Math.max(0, owner || sale - commissionAmount), calc.currency)}</strong></span></div><small className="admin-subline">La calculadora es interna y no modifica los movimientos hasta registrarlos abajo.</small></section>
    <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2><Plus size={19} /> Registrar movimiento</h2><p>Los cambios quedan auditados y se marcan por color.</p></div></div><form className="operations-finance-form" onSubmit={addFinance}><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as FinanceType })}>{Object.entries(typeNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input required placeholder="Descripción" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><input required type="number" min="0" step="0.01" placeholder="Importe" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /><select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value as "USD" | "ARS" })}><option>USD</option><option>ARS</option></select><select value={draft.property_id} onChange={(e) => setDraft({ ...draft, property_id: e.target.value })}><option value="">Sin propiedad</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select><button className="admin-primary-button" type="submit" disabled={!canManageFinance}><Save size={15} /> Registrar</button></form></section></div>
    <section className="admin-panel-card"><div className="admin-panel-heading"><div><h2>Movimientos y pagos</h2><p>Ingresos, salidas, pagos a dueños y ganancia de la inmobiliaria.</p></div><span className="admin-count-pill">{finance.length} registros</span></div>{finance.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Concepto</th><th>Tipo</th><th>Importe</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{finance.map((row) => <tr key={row.id}><td><strong>{row.description}</strong><small className="admin-subline">{properties.find((property) => property.id === row.property_id)?.title ?? "Sin propiedad"}</small></td><td>{typeNames[row.type]}</td><td>{money(Number(row.amount), row.currency)}</td><td><span className={`finance-status finance-${row.status}`}>{statusNames[row.status]}</span></td><td>{new Date(row.occurred_at).toLocaleDateString("es-AR")}</td><td><button type="button" className="admin-row-actions" onClick={() => void updateStatus(row)}><Check size={15} /> {row.status === "completed" ? "Reabrir" : "Marcar realizado"}</button></td></tr>)}</tbody></table></div> : <div className="admin-empty"><span><WalletCards size={21} /></span><strong>Sin movimientos registrados</strong><p>Registrá el primer ingreso, gasto o pago.</p></div>}</section>
  </section>;
}
