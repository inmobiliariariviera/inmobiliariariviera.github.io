import { useState, type DragEvent } from "react";
import { Building2, Mail, Phone, UserRound } from "lucide-react";
import "./LeadPipeline.css";

export type PipelineLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  property_id: string | null;
  stage: string;
  source: string;
  created_at: string;
  priority: "high" | "normal" | "low";
  budget_max: number | string | null;
  budget_currency: "USD" | "ARS" | null;
};

type Props = {
  leads: PipelineLead[];
  stages: Record<string, string>;
  onStageChange: (id: string, stage: string) => void;
  propertyTitle: (propertyId: string) => string | null;
};

const stageOrder = ["new", "contacted", "visit", "negotiation", "won", "lost"];
const dateLabel = (value: string) => new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

export default function LeadPipeline({ leads, stages, onStageChange, propertyTitle }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const startDrag = (event: DragEvent<HTMLElement>, id: string) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };
  const dropOnStage = (event: DragEvent<HTMLElement>, stage: string) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    if (id) onStageChange(id, stage);
    setDraggingId(null);
    setOverStage(null);
  };

  return <div className="crm-pipeline-board" aria-label="Embudo comercial de prospectos">
    {stageOrder.map((stage) => {
      const items = leads.filter((lead) => lead.stage === stage);
      return <section key={stage} className={`crm-pipeline-column ${overStage === stage ? "is-drop-target" : ""}`} onDragOver={(event) => { event.preventDefault(); setOverStage(stage); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverStage(null); }} onDrop={(event) => dropOnStage(event, stage)} aria-label={`${stages[stage]}: ${items.length} prospectos`}>
        <header className="crm-pipeline-column-heading"><h3>{stages[stage]}</h3><span>{items.length}</span></header>
        <div className="crm-pipeline-cards">
          {items.map((lead) => <article key={lead.id} className={`crm-pipeline-card ${draggingId === lead.id ? "is-dragging" : ""}`} draggable onDragStart={(event) => startDrag(event, lead.id)} onDragEnd={() => { setDraggingId(null); setOverStage(null); }}>
            <div className="crm-pipeline-card-top"><span className={`lead-priority-pill priority-${lead.priority}`}>{lead.priority === "high" ? "Alta" : lead.priority === "low" ? "Baja" : "Normal"}</span><time dateTime={lead.created_at}>{dateLabel(lead.created_at)}</time></div>
            <strong className="crm-pipeline-name"><UserRound size={14}/>{lead.name}</strong>
            <p className="crm-pipeline-message">{lead.message}</p>
            {lead.property_id && propertyTitle(lead.property_id) && <span className="crm-pipeline-property"><Building2 size={13}/>{propertyTitle(lead.property_id)}</span>}
            <div className="crm-pipeline-contact">{lead.email && <span><Mail size={12}/>{lead.email}</span>}{lead.phone && <span><Phone size={12}/>{lead.phone}</span>}</div>
            {lead.budget_max != null && Number(lead.budget_max) > 0 && <small className="crm-pipeline-budget">Presupuesto declarado: {lead.budget_currency ?? "USD"} {Number(lead.budget_max).toLocaleString("es-AR")}</small>}
            <label className="crm-pipeline-move">Mover a<select value={lead.stage} onChange={(event) => onStageChange(lead.id, event.target.value)} aria-label={`Mover ${lead.name} de etapa`}>{stageOrder.map((option) => <option key={option} value={option}>{stages[option]}</option>)}</select></label>
          </article>)}
          {items.length === 0 && <p className="crm-pipeline-empty">Soltá un prospecto acá o movelo con el selector.</p>}
        </div>
      </section>;
    })}
  </div>;
}
