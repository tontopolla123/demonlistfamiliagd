'use client';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const [password,setPassword] = useState('');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(e:FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    if (password.length < 10) { setMessage('Usá al menos 10 caracteres.'); setBusy(false); return; }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMessage('No se pudo guardar la contraseña. Abrí de nuevo el enlace de invitación o pedí al administrador que envíe otro.'); setBusy(false); return; }
    window.location.href = '/';
  }
  return <main className="login-wrap"><div className="brand"><div className="logo">F</div><div><div className="eyebrow">PRIVATE GD RANKING</div><h1>Friends Demon List</h1></div></div><section className="login-card" style={{marginTop:24}}><div className="eyebrow">ACCOUNT SETUP</div><h1>Creá tu contraseña.</h1><p>Usá esta pantalla después de abrir el enlace de invitación enviado por el administrador.</p><form onSubmit={submit}><div className="field"><label htmlFor="password">Nueva contraseña</label><input id="password" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} /></div>{message&&<div className="notice error">{message}</div>}<button className="btn primary" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button></form></section></main>;
}
