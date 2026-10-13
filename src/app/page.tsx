
'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Level = {
  id: string;
  name: string;
  creator: string | null;
  difficulty: string;
  position: number;
  gd_url: string | null;
  image_url: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  role: string;
};

type Completion = {
  id: string;
  user_id: string;
  level_id: string;
  status: string;
  proof_url: string | null;
  attempts: number | null;
  notes: string | null;
  created_at: string;
  profiles?: { username: string | null } | null;
  levels?: { name: string } | null;
};

type LevelSuggestion = {
  id: string;
  submitted_by: string;
  name: string;
  creator: string | null;
  difficulty: string;
  gd_url: string | null;
  image_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
type AredlLevel = {
  aredl_id: string;
  name: string;
  position: number;
  gd_level_id: string | null;
  points: number | null;
};
const DIFFICULTIES = [
  'Easy Demon',
  'Medium Demon',
  'Hard Demon',
  'Insane Demon',
  'Extreme Demon',
];

const tagClass = (d: string) => d.toLowerCase().split(' ')[0];

export default function Home() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [levels, setLevels] = useState<Level[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [suggestions, setSuggestions] = useState<LevelSuggestion[]>([]);

  const [tab, setTab] = useState<
    'ranking' | 'players' | 'records' | 'admin'
  >('ranking');

  const [search, setSearch] = useState('');
  const [levelSearch, setLevelSearch] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  const [proposalCreator, setProposalCreator] = useState('');
  const [proposalDifficulty, setProposalDifficulty] = useState('Extreme Demon');
  const [proposalUrl, setProposalUrl] = useState('');
  const [proposalImage, setProposalImage] = useState('');

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [levelName, setLevelName] = useState('');
  const [creator, setCreator] = useState('');
  const [difficulty, setDifficulty] = useState('Extreme Demon');
  const [gdUrl, setGdUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [selectedLevel, setSelectedLevel] = useState('');
  const [proof, setProof] = useState('');
  const [attempts, setAttempts] = useState('');
  const [notes, setNotes] = useState('');

  const [importingAredl, setImportingAredl] = useState(false);
  const [aredlMessage, setAredlMessage] = useState('');
  const [aredlSearch, setAredlSearch] = useState('');
  const [aredlResults, setAredlResults] = useState<AredlLevel[]>([]);
  const [searchingAredl, setSearchingAredl] = useState(false);
  const [selectedAredl, setSelectedAredl] = useState<AredlLevel | null>(null);
  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUserId(user?.id || '');
    setEmail(user?.email || '');

    const [profileRes, levelRes, peopleRes, completionRes, suggestionRes] =
      await Promise.all([
        user
          ? supabase
              .from('profiles')
              .select('id,username,role')
              .eq('id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),

        supabase
          .from('levels')
          .select('*')
          .order('position', { ascending: true }),

        supabase
          .from('profiles')
          .select('id,username,role')
          .order('username'),

        supabase
          .from('completions')
          .select(
            'id,user_id,level_id,status,proof_url,attempts,notes,created_at,profiles(username),levels(name)'
          )
          .order('created_at', { ascending: false }),

        user
          ? supabase
              .from('level_suggestions')
              .select('*')
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

    setIsAdmin(profileRes.data?.role === 'admin');

    if (levelRes.error) {
      setMessage('Error al cargar niveles: ' + levelRes.error.message);
    } else if (levelRes.data) {
      setLevels(levelRes.data as Level[]);
    }

    if (peopleRes.data) {
      setProfiles(peopleRes.data as Profile[]);
    }

    if (completionRes.data) {
      setCompletions(completionRes.data as unknown as Completion[]);
    }

    if (suggestionRes.data) {
      setSuggestions(suggestionRes.data as LevelSuggestion[]);
    } else if (suggestionRes.error) {
      console.error(
        'Error al cargar propuestas:',
        suggestionRes.error.message
      );
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  async function importAredl() {
    if (!isAdmin || importingAredl) return;

    setImportingAredl(true);
    setAredlMessage('');

    try {
      const response = await fetch('/api/aredl');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || 'No se pudieron obtener los niveles.'
        );
      }

      if (!Array.isArray(result.levels) || result.levels.length !== 150) {
        throw new Error(
          `Se esperaban 150 niveles y llegaron ${result.levels?.length ?? 0}.`
        );
      }

      const rows = result.levels.map(
        (level: {
          id: string;
          name: string;
          position: number;
          level_id: string | null;
          points: number | null;
        }) => ({
          aredl_id: String(level.id),
          name: level.name.trim(),
          position: Number(level.position),
          gd_level_id: level.level_id,
          points: level.points,
          imported_at: new Date().toISOString(),
        })
      );

      const { error } = await supabase
        .from('aredl_catalog')
        .upsert(rows, { onConflict: 'aredl_id' });

      if (error) throw error;

      setAredlMessage('Importación completada: 150 niveles guardados.');
    } catch (error) {
      setAredlMessage(
        error instanceof Error
          ? error.message
          : 'Error al importar AREDL.'
      );
    } finally {
      setImportingAredl(false);
    }
  }
  
  async function searchAredl() {
    const query = aredlSearch.trim();

    if (!query) {
      setAredlResults([]);
      setSelectedAredl(null);
      return;
    }

    setSearchingAredl(true);
    setSelectedAredl(null);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('aredl_catalog')
        .select('aredl_id, name, position, gd_level_id, points')
        .ilike('name', `%${query}%`)
        .order('position', { ascending: true })
        .limit(10);

      if (error) throw error;

      setAredlResults((data ?? []) as AredlLevel[]);
    } catch (error) {
      setMessage(
        'Error al buscar en AREDL: ' +
          (error instanceof Error ? error.message : 'Error desconocido.')
      );
    } finally {
      setSearchingAredl(false);
    }
  }


  async function addLevel(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { error } = await supabase.from('levels').insert({
      name: levelName.trim(),
      creator: creator.trim() || null,
      difficulty,
      gd_url: gdUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      position: Math.max(0, ...levels.map((l) => l.position)) + 1,
    });

    setBusy(false);

    if (error) {
      setMessage('No se pudo agregar el nivel: ' + error.message);
      return;
    }

    setLevelName('');
    setCreator('');
    setGdUrl('');
    setImageUrl('');
    setMessage('Nivel agregado correctamente.');
    await load();
  }

  async function submitSuggestion(e: FormEvent) {
    e.preventDefault();

    if (!userId) {
      window.location.href = '/login?next=/';
      return;
    }

    const name = levelSearch.trim();

    if (!name) {
      setMessage('Escribí el nombre del nivel que querés proponer.');
      return;
    }

    const existingLevel = levels.find(
      (level) => level.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (existingLevel) {
      setSelectedLevel(existingLevel.id);
      setLevelSearch(existingLevel.name);
      setShowProposal(false);
      setMessage('Ese nivel ya existe. Lo seleccionamos para tu récord.');
      return;
    }

    const existingSuggestion = suggestions.find(
      (suggestion) =>
        suggestion.name.trim().toLowerCase() === name.toLowerCase() &&
        suggestion.status === 'pending'
    );

    if (existingSuggestion) {
      setMessage('Ya hay una propuesta pendiente con ese nombre.');
      return;
    }

    setBusy(true);
    setMessage('');

    const { error } = await supabase.from('level_suggestions').insert({
      submitted_by: userId,
      name,
      creator: proposalCreator.trim() || null,
      difficulty: proposalDifficulty,
      gd_url: proposalUrl.trim() || null,
      image_url: proposalImage.trim() || null,
      status: 'pending',
    });

    setBusy(false);

    if (error) {
      setMessage('No se pudo enviar la propuesta: ' + error.message);
      return;
    }

    setLevelSearch('');
    setProposalCreator('');
    setProposalDifficulty('Extreme Demon');
    setProposalUrl('');
    setProposalImage('');
    setShowProposal(false);
    setMessage('Propuesta enviada. Un administrador debe aprobarla.');
    await load();
  }

  async function reviewSuggestion(
    suggestion: LevelSuggestion,
    status: 'approved' | 'rejected'
  ) {
    if (!isAdmin) {
      setMessage('No tenés permisos para aprobar niveles.');
      return;
    }

    setBusy(true);
    setMessage('');

    if (status === 'approved') {
      const duplicate = levels.find(
        (level) =>
          level.name.trim().toLowerCase() ===
          suggestion.name.trim().toLowerCase()
      );

      if (!duplicate) {
        const { error: insertError } = await supabase.from('levels').insert({
          name: suggestion.name.trim(),
          creator: suggestion.creator,
          difficulty: suggestion.difficulty,
          gd_url: suggestion.gd_url,
          image_url: suggestion.image_url,
          position: Math.max(0, ...levels.map((l) => l.position)) + 1,
        });

        if (insertError) {
          setBusy(false);
          setMessage('No se pudo publicar el nivel: ' + insertError.message);
          return;
        }
      }

      const { error } = await supabase
        .from('level_suggestions')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id);

      setBusy(false);

      if (error) {
        setMessage(
          'El nivel se agregó, pero no se pudo actualizar la propuesta: ' +
            error.message
        );
        await load();
        return;
      }

      setMessage(
        duplicate
          ? 'La propuesta fue aprobada. El nivel ya existía en el ranking.'
          : 'Nivel aprobado y agregado al ranking.'
      );
    } else {
      const { error } = await supabase
        .from('level_suggestions')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', suggestion.id);

      setBusy(false);

      if (error) {
        setMessage('No se pudo rechazar la propuesta: ' + error.message);
        return;
      }

      setMessage('Propuesta rechazada.');
    }

    await load();
  }

  async function submitRecord(e: FormEvent) {
    e.preventDefault();

    if (!userId) {
      window.location.href = '/login?next=/';
      return;
    }

    if (!selectedLevel) {
      setMessage('Buscá y seleccioná un nivel antes de enviar el récord.');
      return;
    }

    setBusy(true);
    setMessage('');

    const { error } = await supabase.from('completions').insert({
      user_id: userId,
      level_id: selectedLevel,
      proof_url: proof.trim() || null,
      attempts: attempts ? Number(attempts) : null,
      notes: notes.trim() || null,
      status: 'pending',
    });

    setBusy(false);

    if (error) {
      setMessage('No se pudo enviar el récord: ' + error.message);
      return;
    }

    setSelectedLevel('');
    setLevelSearch('');
    setProof('');
    setAttempts('');
    setNotes('');
    setMessage('Récord enviado. Quedará pendiente de revisión.');
    await load();
  }

  async function moderate(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('completions')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    setMessage(
      error
        ? 'No se pudo actualizar el récord: ' + error.message
        : status === 'approved'
          ? 'Récord aprobado.'
          : 'Récord rechazado.'
    );

    await load();
  }

  async function moveLevel(level: Level, delta: number) {
    const ordered = [...levels].sort((a, b) => a.position - b.position);
    const i = ordered.findIndex((item) => item.id === level.id);
    const j = i + delta;

    if (j < 0 || j >= ordered.length) return;

    const other = ordered[j];
    const temporary =
      Math.max(...ordered.map((item) => item.position), 0) + 1000;

    const a = await supabase
      .from('levels')
      .update({ position: temporary })
      .eq('id', level.id);

    const b = a.error
      ? null
      : await supabase
          .from('levels')
          .update({ position: level.position })
          .eq('id', other.id);

    const c =
      !b || b.error
        ? null
        : await supabase
            .from('levels')
            .update({ position: other.position })
            .eq('id', level.id);

    setMessage(
      a.error?.message ||
        b?.error?.message ||
        c?.error?.message ||
        'Ranking actualizado.'
    );

    await load();
  }

  const approved = useMemo(
    () => completions.filter((c) => c.status === 'approved'),
    [completions]
  );

  const playerRanking = useMemo(() => {
    return profiles
      .map((profile) => {
        const completedLevels = new Set(
          approved
            .filter((record) => record.user_id === profile.id)
            .map((record) => record.level_id)
        );

        const points = [...completedLevels].reduce((total, levelId) => {
          const level = levels.find((item) => item.id === levelId);

          if (!level || level.position < 1) return total;

          return total + Math.round(1000 / Math.sqrt(level.position));
        }, 0);

        return {
          id: profile.id,
          username: profile.username || 'Jugador',
          completed: completedLevels.size,
          points,
        };
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.completed - a.completed ||
          a.username.localeCompare(b.username)
      );
  }, [profiles, approved, levels]);

  const visibleLevels = levels.filter((l) =>
    (l.name + ' ' + (l.creator || '') + ' ' + l.difficulty)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const matchingLevels = levels.filter((level) =>
    level.name.toLowerCase().includes(levelSearch.trim().toLowerCase())
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();

    approved.forEach((c) => {
      m.set(c.user_id, (m.get(c.user_id) || 0) + 1);
    });

    return m;
  }, [approved]);

  const pending = completions.filter((c) => c.status === 'pending');
  const pendingSuggestions = suggestions.filter(
    (s) => s.status === 'pending'
  );

  const nameFor = (id: string) =>
    profiles.find((p) => p.id === id)?.username || 'Jugador';

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">F</div>
          <div>
            <div className="eyebrow">COMMUNITY EXTREME DEMON LIST</div>
            <h1>Familia GD Demon List</h1>
          </div>
        </div>

        <div className="top-actions">
          {userId ? (
            <>
              <span className="user-pill">
                {email}
                {isAdmin ? ' · ADMIN' : ''}
              </span>
              <button className="btn" onClick={signOut}>
                Salir
              </button>
            </>
          ) : (
            <button
              className="btn primary"
              onClick={() => (window.location.href = '/login?next=/')}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <h2>Familia GD Demon List</h2>
      </section>

      {message && (
        <div
          className={
            'notice ' +
            (/error|no se pudo|no tenés/i.test(message) ? 'error' : '')
          }
        >
          {message}
          <button
            className="small-btn"
            style={{ float: 'right' }}
            onClick={() => setMessage('')}
          >
            Cerrar
          </button>
        </div>
      )}

      <section className="toolbar">
        <div className="tabs">
          <button
            className={'tab ' + (tab === 'ranking' ? 'active' : '')}
            onClick={() => setTab('ranking')}
          >
            Ranking
          </button>
          <button
            className={'tab ' + (tab === 'players' ? 'active' : '')}
            onClick={() => setTab('players')}
          >
            Jugadores
          </button>
          <button
            className={'tab ' + (tab === 'records' ? 'active' : '')}
            onClick={() => setTab('records')}
          >
            Récords
          </button>
          {isAdmin && (
            <button
              className={'tab ' + (tab === 'admin' ? 'active' : '')}
              onClick={() => setTab('admin')}
            >
              Administración
            </button>
          )}
        </div>

        {tab === 'ranking' && (
          <input
            className="search"
            placeholder="Buscar nivel o creador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </section>

      {tab === 'ranking' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Nivel</th>
                <th>Dificultad</th>
                <th>Récords</th>
                <th>Enlace</th>
                {isAdmin && <th>Orden</th>}
              </tr>
            </thead>
            <tbody>
              {visibleLevels.map((level) => {
                const records = approved.filter(
                  (c) => c.level_id === level.id
                );
                const uniquePlayers = records
                  .map((c) => nameFor(c.user_id))
                  .filter((name, i, arr) => arr.indexOf(name) === i);

                return (
                  <tr key={level.id}>
                    <td className="rank">
                      #{String(level.position).padStart(2, '0')}
                    </td>
                    <td>
                      <div className="level-row">
                        {level.image_url ? (
                          <img
                            className="level-thumb"
                            src={level.image_url}
                            alt={`Miniatura de ${level.name}`}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="level-thumb"
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              color: '#1759c7',
                              fontWeight: 700,
                            }}
                          >
                            GD
                          </div>
                        )}
                        <div>
                          <span className="level-name">{level.name}</span>
                          <span className="sub">
                            {level.creator || 'Creador no indicado'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={'tag ' + tagClass(level.difficulty)}>
                        {level.difficulty}
                      </span>
                    </td>
                    <td>
                      {uniquePlayers.length ? (
                        uniquePlayers.join(', ')
                      ) : (
                        <span className="mono">Sin récords</span>
                      )}
                      <span className="sub">
                        {records.length}{' '}
                        {records.length === 1 ? 'récord' : 'récords'}
                      </span>
                    </td>
                    <td>
                      {level.gd_url ? (
                        <a
                          className="mono"
                          href={level.gd_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          VER NIVEL ↗
                        </a>
                      ) : (
                        <span className="mono">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="actions">
                          <button
                            className="small-btn"
                            title="Subir"
                            onClick={() => moveLevel(level, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="small-btn"
                            title="Bajar"
                            onClick={() => moveLevel(level, 1)}
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!visibleLevels.length && (
            <div className="empty">
              No hay niveles que coincidan con la búsqueda.
            </div>
          )}
        </div>
      )}

      {tab === 'players' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Jugador</th>
                <th>Niveles completados</th>
                <th>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {playerRanking.map((player, index) => (
                <tr key={player.id}>
                  <td className="rank">
                    #{String(index + 1).padStart(2, '0')}
                  </td>
                  <td>
                    <span className="level-name">{player.username}</span>
                    {player.id === userId && (
                      <span className="sub">Tu perfil</span>
                    )}
                  </td>
                  <td>{player.completed}</td>
                  <td>
                    <strong>{player.points.toLocaleString('es-AR')}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!playerRanking.length && (
            <div className="empty">
              Todavía no hay jugadores registrados.
            </div>
          )}
          <div className="notice">
            Los puntos se calculan con los récords aprobados. Cada nivel suma
            puntos una sola vez por jugador. Fórmula: redondeo de 1000 ÷ raíz
            cuadrada de la posición.
          </div>
        </div>
      )}

      {tab === 'records' && (
        <div className="content-grid">
          <section className="card">
            <h3>Enviar un récord</h3>

            {!userId ? (
              <>
                <p>
                  Iniciá sesión con tu cuenta para enviar un récord. La prueba
                  en video es opcional.
                </p>
                <button
                  className="btn primary"
                  onClick={() => (window.location.href = '/login?next=/')}
                >
                  Iniciar sesión
                </button>
              </>
            ) : (
              <>
                <p>
                  Buscá el nivel por nombre. Si todavía no existe, podés
                  proponerlo para que un administrador lo revise.
                </p>

                <form onSubmit={submitRecord}>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="levelSearch">Buscar nivel</label>
                      <input
                        id="levelSearch"
                        type="text"
                        autoComplete="off"
                        value={levelSearch}
                        placeholder="Escribí el nombre del nivel..."
                        onChange={(e) => {
                          setLevelSearch(e.target.value);
                          setSelectedLevel('');
                          setShowProposal(false);
                        }}
                      />

                      {selectedLevel && (
                        <div className="notice">
                          Nivel seleccionado:{' '}
                          <strong>
                            {levels.find((l) => l.id === selectedLevel)?.name}
                          </strong>
                          <button
                            type="button"
                            className="small-btn"
                            onClick={() => {
                              setSelectedLevel('');
                              setLevelSearch('');
                            }}
                          >
                            Cambiar
                          </button>
                        </div>
                      )}

                      {levelSearch.trim() && !selectedLevel && (
                        <div
                          className="level-search-results"
                          style={{
                            marginTop: 8,
                            display: 'grid',
                            gap: 6,
                          }}
                        >
                          {matchingLevels.slice(0, 8).map((level) => (
                            <button
                              type="button"
                              className="btn"
                              key={level.id}
                              style={{ textAlign: 'left' }}
                              onClick={() => {
                                setSelectedLevel(level.id);
                                setLevelSearch(level.name);
                                setShowProposal(false);
                              }}
                            >
                              {level.name} · {level.difficulty}
                            </button>
                          ))}

                          {!matchingLevels.length && (
                            <p className="sub">No encontramos coincidencias.</p>
                          )}

                          {!matchingLevels.some(
                            (l) =>
                              l.name.trim().toLowerCase() ===
                              levelSearch.trim().toLowerCase()
                          ) && (
                            <button
                              type="button"
                              className="btn primary"
                              onClick={() => setShowProposal(true)}
                            >
                              + Proponer «{levelSearch.trim()}»
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label htmlFor="attempts">Intentos (opcional)</label>
                      <input
                        id="attempts"
                        type="number"
                        min="1"
                        value={attempts}
                        onChange={(e) => setAttempts(e.target.value)}
                        placeholder="Ej. 842"
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="proof">Prueba (opcional)</label>
                      <input
                        id="proof"
                        type="url"
                        value={proof}
                        onChange={(e) => setProof(e.target.value)}
                        placeholder="https://youtu.be/..."
                      />
                    </div>

                    <div className="field full">
                      <label htmlFor="notes">Notas (opcional)</label>
                      <input
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={300}
                        placeholder="Porcentaje, fecha, contexto..."
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      className="btn primary"
                      disabled={busy || !selectedLevel}
                    >
                      {busy ? 'Enviando...' : 'Enviar récord'}
                    </button>
                    <span className="mono">REVISIÓN MANUAL</span>
                  </div>
                </form>

                {showProposal && (
                  <section className="card" style={{ marginTop: 20 }}>
                    <h3>Proponer un nivel</h3>
                    <p>
                      La propuesta no aparecerá en el ranking hasta que la
                      apruebe un administrador.
                    </p>

                    <form onSubmit={submitSuggestion}>
                      <div className="form-grid">
                        <div className="field full">
                          <label htmlFor="proposalName">Nombre</label>
                          <input
                            id="proposalName"
                            required
                            maxLength={100}
                            value={levelSearch}
                            onChange={(e) => setLevelSearch(e.target.value)}
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="proposalCreator">Creador</label>
                          <input
                            id="proposalCreator"
                            maxLength={100}
                            value={proposalCreator}
                            onChange={(e) => setProposalCreator(e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="proposalDifficulty">Dificultad</label>
                          <select
                            id="proposalDifficulty"
                            value={proposalDifficulty}
                            onChange={(e) =>
                              setProposalDifficulty(e.target.value)
                            }
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        <div className="field full">
                          <label htmlFor="proposalUrl">
                            Link del nivel (opcional)
                          </label>
                          <input
                            id="proposalUrl"
                            type="url"
                            value={proposalUrl}
                            onChange={(e) => setProposalUrl(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="field full">
                          <label htmlFor="proposalImage">
                            URL de miniatura (opcional)
                          </label>
                          <input
                            id="proposalImage"
                            type="url"
                            value={proposalImage}
                            onChange={(e) => setProposalImage(e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div className="form-actions">
                        <button className="btn primary" disabled={busy}>
                          {busy ? 'Enviando...' : 'Enviar propuesta'}
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setShowProposal(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                )}
              </>
            )}
          </section>

          <section className="card">
            <h3>Récords aprobados</h3>
            <p>
              Solo aparecen aquí los récords aprobados por la administración.
            </p>

            {approved.slice(0, 12).map((c) => (
              <div className="pending" key={c.id}>
                <strong>
                  {c.profiles?.username || nameFor(c.user_id)} ·{' '}
                  {c.levels?.name ||
                    levels.find((l) => l.id === c.level_id)?.name}
                </strong>
                <p>
                  {c.attempts
                    ? `${c.attempts.toLocaleString()} intentos · `
                    : ''}
                  {c.proof_url ? 'Prueba adjunta' : 'Sin prueba adjunta'}
                </p>
                {c.proof_url && (
                  <a
                    className="mono"
                    href={c.proof_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    VER PRUEBA ↗
                  </a>
                )}
              </div>
            ))}

            {!approved.length && (
              <div className="empty">Todavía no hay récords aprobados.</div>
            )}
          </section>
        </div>
      )}

      {tab === 'admin' && isAdmin && (
        <div className="content-grid">
          <section className="card">
            <h3>Catálogo AREDL</h3>
            <p>
              Importa o actualiza los primeros 150 niveles del catálogo AREDL.
              Esto no modifica el ranking de Familia GD.
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="btn primary"
                onClick={importAredl}
                disabled={!isAdmin || importingAredl}
              >
                {importingAredl
                  ? 'Importando...'
                  : 'Importar / actualizar AREDL (top 150)'}
              </button>
            </div>

            {aredlMessage && (
              <div
                className={
                  'notice ' +
                  (/error|no se pudo|esperaban/i.test(aredlMessage)
                    ? 'error'
                    : '')
                }
                role="status"
              >
                {aredlMessage}
              </div>
            )}

            <hr />

            <h3>Propuestas de niveles</h3>
            <p>
              Revisá los niveles sugeridos por los miembros. Aprobar uno lo
              incorpora al final del ranking.
            </p>

            {pendingSuggestions.map((suggestion) => (
              <div className="pending" key={suggestion.id}>
                <strong>{suggestion.name}</strong>
                <p>
                  {suggestion.creator || 'Creador no indicado'} ·{' '}
                  {suggestion.difficulty}
                </p>

                {suggestion.gd_url && (
                  <p>
                    <a
                      className="mono"
                      href={suggestion.gd_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      VER NIVEL ↗
                    </a>
                  </p>
                )}

                {suggestion.image_url && (
                  <img
                    className="level-detail-image"
                    src={suggestion.image_url}
                    alt={`Miniatura de ${suggestion.name}`}
                    style={{ maxHeight: 180, marginTop: 8 }}
                  />
                )}

                <p className="sub">
                  Propuesto por: {nameFor(suggestion.submitted_by)}
                </p>

                <div className="pending-actions">
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => reviewSuggestion(suggestion, 'approved')}
                  >
                    Aprobar nivel
                  </button>
                  <button
                    className="btn danger"
                    disabled={busy}
                    onClick={() => reviewSuggestion(suggestion, 'rejected')}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}

            {!pendingSuggestions.length && (
              <div className="empty">No hay propuestas pendientes.</div>
            )}

            <div className="notice">
              Los miembros pueden proponer niveles, pero solo un administrador
              puede aprobarlos. La base de datos también debe validar estos
              permisos.
            </div>

            <hr />

            
            <h3>Agregar nivel manualmente</h3>
            <form onSubmit={addLevel}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="aredlSearch">
                    Buscar en el catálogo AREDL
                  </label>

                  <div className="form-actions">
                    <input
                      id="aredlSearch"
                      value={aredlSearch}
                      onChange={(e) => {
                        setAredlSearch(e.target.value);
                        setAredlResults([]);
                        setSelectedAredl(null);
                      }}
                      placeholder="Ej. Tidal Wave, GRIEF..."
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      className="btn"
                      onClick={searchAredl}
                      disabled={searchingAredl}
                    >
                      {searchingAredl ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>

                  {aredlResults.map((level) => (
                    <button
                      type="button"
                      className="btn"
                      key={level.aredl_id}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        marginTop: 6,
                      }}
                      onClick={() => {
                        setSelectedAredl(level);
                        setLevelName(level.name);
                        setDifficulty('Extreme Demon');
                      }}
                    >
                      #{level.position} · {level.name} ·{' '}
                      {level.points ?? 'Sin puntos'} puntos
                    </button>
                  ))}

                  {selectedAredl && (
                    <p className="notice">
                      Seleccionado: <strong>{selectedAredl.name}</strong>
                      {' · '}ARED​L #{selectedAredl.position}
                      {' · '}ID: {selectedAredl.gd_level_id || 'No disponible'}
                    </p>
                  )}
                </div>

                <div className="field full">
                  <label htmlFor="name">Nombre del nivel</label>
                  <input
                    id="name"
                    required
                    maxLength={100}
                    value={levelName}
                    onChange={(e) => setLevelName(e.target.value)}
                    placeholder="Ej. Grief"
                  />
                </div>

                <div className="field">
                  <label htmlFor="creator">Creador</label>
                  <input
                    id="creator"
                    maxLength={100}
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Nombre del creador"
                  />
                </div>

                <div className="field">
                  <label htmlFor="difficulty">Dificultad</label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="field full">
                  <label htmlFor="gdurl">Link del nivel (opcional)</label>
                  <input
                    id="gdurl"
                    type="url"
                    value={gdUrl}
                    onChange={(e) => setGdUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="field full">
                  <label htmlFor="imageurl">
                    URL de la miniatura (opcional)
                  </label>
                  <input
                    id="imageurl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://.../miniatura.jpg"
                  />
                  {imageUrl && (
                    <img
                      className="level-detail-image"
                      src={imageUrl}
                      alt="Vista previa de la miniatura"
                      style={{ maxHeight: 180, marginTop: 8 }}
                    />
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button className="btn primary" disabled={busy}>
                  {busy ? 'Guardando...' : 'Agregar nivel'}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <div className="section-head">
              <h3>Récords pendientes</h3>
              <span className="tag">{pending.length} pendientes</span>
            </div>

            <p>Revisá cada envío antes de aprobarlo.</p>

            {pending.map((c) => (
              <div className="pending" key={c.id}>
                <strong>
                  {nameFor(c.user_id)} ·{' '}
                  {c.levels?.name ||
                    levels.find((l) => l.id === c.level_id)?.name ||
                    'Nivel'}
                </strong>
                <p>
                  {c.attempts
                    ? `${c.attempts.toLocaleString()} intentos · `
                    : ''}
                  {c.notes || 'Sin notas'} ·{' '}
                  {c.proof_url ? 'Con prueba' : 'Sin prueba'}
                </p>

                {c.proof_url && (
                  <p>
                    <a
                      className="mono"
                      href={c.proof_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ABRIR PRUEBA ↗
                    </a>
                  </p>
                )}

                <div className="pending-actions">
                  <button
                    className="btn primary"
                    onClick={() => moderate(c.id, 'approved')}
                  >
                    Aprobar
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => moderate(c.id, 'rejected')}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}

            {!pending.length && (
              <div className="empty">No hay récords pendientes.</div>
            )}

            <div style={{ marginTop: 22 }}>
              <h3>Miembros</h3>
              {profiles.map((p) => (
                <div key={p.id} className="pending">
                  <strong>{p.username || 'Sin nombre'}</strong>
                  <p>
                    {p.role === 'admin' ? 'Administrador' : 'Miembro'} ·{' '}
                    {counts.get(p.id) || 0} récords aprobados
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <footer className="footer">
        <span>FAMILIA GD DEMON LIST / COMMUNITY RANKING</span>
        <span>UNOFFICIAL COMMUNITY PROJECT · NOT AFFILIATED WITH ROBTOP</span>
      </footer>
    </main>
  );
}
