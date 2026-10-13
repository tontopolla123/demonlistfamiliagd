
'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const params = useSearchParams();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    const supabase = createClient();

    try {
      if (mode === 'register') {
        const cleanUsername = username.trim();

        if (cleanUsername.length < 3) {
          setError('El nombre de usuario debe tener al menos 3 caracteres.');
          return;
        }

        if (password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres.');
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (signUpError) {
          setError('No se pudo crear la cuenta: ' + signUpError.message);
          return;
        }

        if (data.session) {
          window.location.href = params.get('next') || '/';
          return;
        }

        setSuccess(
          'Cuenta creada. Revisá tu correo para confirmar el registro si te lo solicita Supabase. Después podrás iniciar sesión.'
        );
        setMode('login');
        return;
      }

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(
          'No se pudo iniciar sesión. Revisá el correo y la contraseña.'
        );
        return;
      }

      window.location.href = params.get('next') || '/';
    } catch {
      setError('Ocurrió un error inesperado. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <div className="brand">
        <div className="logo">F</div>
        <div>
          <div className="eyebrow">COMMUNITY GD RANKING</div>
          <h1>Familia GD Demon List</h1>
        </div>
      </div>

      <section className="login-card" style={{ marginTop: 24 }}>
        <div className="eyebrow">
          {mode === 'login' ? 'MEMBER ACCESS' : 'JOIN THE COMMUNITY'}
        </div>

        <h1>
          {mode === 'login' ? 'Iniciá sesión.' : 'Creá tu cuenta.'}
        </h1>

        <p>
          {mode === 'login'
            ? 'Entrá para enviar tus récords y participar en la comunidad.'
            : 'Registrate para participar en el ranking de la comunidad.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="username">Nombre de usuario</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                minLength={3}
                maxLength={24}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu nombre en GD"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          {error && <div className="notice error">{error}</div>}

          {success && <div className="notice">{success}</div>}

          <button className="btn primary" disabled={busy}>
            {busy
              ? 'Procesando...'
              : mode === 'login'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 18, fontSize: 12 }}>
          {mode === 'login'
            ? '¿Todavía no tenés cuenta?'
            : '¿Ya tenés una cuenta?'}
        </p>

        <button
          type="button"
          className="btn"
          style={{ width: '100%' }}
          disabled={busy}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
            setSuccess('');
          }}
        >
          {mode === 'login' ? 'Registrarme' : 'Volver a iniciar sesión'}
        </button>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="login-wrap">Cargando...</main>}>
      <LoginForm />
    </Suspense>
  );
}
