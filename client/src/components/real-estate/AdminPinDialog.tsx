import { useState, type FormEvent } from "react";
import { LockKeyhole, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Props = {
  title: string;
  description: string;
  actionLabel: string;
  onCancel: () => void;
  onAuthorized: (pin: string) => Promise<void>;
};

export default function AdminPinDialog({ title, description, actionLabel, onCancel, onAuthorized }: Props) {
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !pin || checking) return;
    setChecking(true);
    const { data, error } = await supabase.rpc("verify_profit_pin", { p_pin: pin });
    if (error) toast.error(`No se pudo validar el PIN administrativo: ${error.message}`);
    else if (data === true) {
      try { await onAuthorized(pin); onCancel(); }
      catch (actionError) { toast.error(actionError instanceof Error ? actionError.message : "No se pudo completar la operación."); }
    } else toast.error("PIN administrativo incorrecto o acceso temporalmente bloqueado.");
    setPin("");
    setChecking(false);
  };

  return <div className="admin-pin-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !checking) onCancel(); }}>
    <section className="admin-pin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-pin-title" aria-describedby="admin-pin-description">
      <button className="admin-pin-close" type="button" aria-label="Cancelar" onClick={onCancel} disabled={checking}><X size={18}/></button>
      <span className="admin-pin-icon"><LockKeyhole size={20}/></span>
      <h2 id="admin-pin-title">{title}</h2>
      <p id="admin-pin-description">{description}</p>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="admin-security-pin">PIN administrativo</label>
        <input id="admin-security-pin" name="admin-security-pin" type="password" autoComplete="off" autoFocus required value={pin} onChange={(event) => setPin(event.target.value)} />
        <div className="admin-pin-actions"><button type="button" className="admin-secondary-button" onClick={onCancel} disabled={checking}>Cancelar</button><button type="submit" className="finance-delete-all" disabled={checking || !pin}>{checking ? "Verificando…" : actionLabel}</button></div>
      </form>
      <small>Ingresá el PIN administrativo configurado en Supabase. No es tu contraseña de inicio de sesión; el PIN no queda guardado en el navegador.</small>
    </section>
  </div>;
}
