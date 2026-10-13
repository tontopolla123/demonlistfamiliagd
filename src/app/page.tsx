
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

type Profile = { id: string; username: string | null; role: string };

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

type Suggestion = {
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

const tagClass = (difficulty: string) =>
  difficulty.toLowerCase().split(' ')[0];

export default function Home() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [levels, setLevels] = useState<Level[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [tab, setTab] = useState<'ranking' | 'players' | 'records' | 'admin'>('ranking');
  const [search, setSearch] = useState('');
  const [levelSearch, setLevelSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [proof, setProof] = useState('');
  const [attempts, setAttempts] = useState('');
  const [notes, setNotes] = useState('');

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

  const [editingLevelId, setEditingLevelId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('Easy Demon');
  const [editGdUrl, setEditGdUrl] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const [manualPlayerId, setManualPlayerId] = useState('');
  const [manualLevelId, setManualLevelId] = useState('');

  const [importingAredl, setImportingAredl] = useState(false);
  const [aredlMessage, setAredlMessage] = useState('');
  const [aredlSearch, setAredlSearch] = useState('');
  const [aredlResults, setAredlResults] = useState<AredlLevel[]>([]);
  const [searchingAredl, setSearchingAredl] = useState(false);
  const [selectedAredl, setSelectedAredl] = useState<AredlLevel | null>(null);

  // Carga los datos de Supabase.
  // Los récords se consultan sin relaciones anidadas para evitar
  // que un problema de relaciones impida cargar el ranking.
  const load = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Error de autenticación:', authError.message);
    }

    setUserId(user?.id || '');
    setEmail(user?.email || '');

    const [
      profileRes,
      levelRes,
      peopleRes,
      completionRes,
      suggestionRes,
    ] = await Promise.all([
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
          'id,user_id,level_id,status,proof_url,attempts,notes,created_at'
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
      console.error('Error al cargar niveles:', levelRes.error);
      setMessage('Error al cargar niveles: ' + levelRes.error.message);
    } else {
      setLevels((levelRes.data ?? []) as Level[]);
    }

    if (peopleRes.error) {
      console.error('Error al cargar jugadores:', peopleRes.error);
      setMessage('Error al cargar jugadores: ' + peopleRes.error.message);
    } else {
      setProfiles((peopleRes.data ?? []) as Profile[]);
    }

    if (completionRes.error) {
      console.error('Error al cargar récords:', completionRes.error);
      setCompletions([]);
      setMessage('Error al cargar récords: ' + completionRes.error.message);
    } else {
      const rows = (completionRes.data ?? []) as Completion[];

      console.log('URL de Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Error de récords:', completionRes.error);
      console.log('Total de récords:', rows.length);
      console.log(
        'Récords aprobados:',
        rows.filter((record) => record.status === 'approved').length
      );
      console.log('Primer récord:', rows[0]);
      console.log(
        'Primeros user_id:',
        rows.slice(0, 5).map((record) => record.user_id)
      );
      console.log(
        'IDs de perfiles:',
        (peopleRes.data ?? []).slice(0, 5).map((profile) => profile.id)
      );

      setCompletions(rows);
    }

    if (suggestionRes.error) {
      console.error('Error al cargar propuestas:', suggestionRes.error);
    } else {
      setSuggestions((suggestionRes.data ?? []) as Suggestion[]);
    }
  }, [supabase]);

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
        throw new Error(result.error || 'No se pudieron obtener los niveles.');
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
        error instanceof Error ? error.message : 'Error al importar AREDL.'
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
        .select('aredl_id,name,position,gd_level_id,points')
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

    if (!isAdmin) return;

    setBusy(true);
    setMessage('');

    const { error } = await supabase.from('levels').insert({
      name: levelName.trim(),
      creator: creator.trim() || null,
      difficulty,
      gd_url: gdUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      position: Math.max(0, ...levels.map((level) => level.position)) + 1,
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

  function startEditingLevel(level: Level) {
    setEditingLevelId(level.id);
    setEditName(level.name);
    setEditCreator(level.creator || '');
    setEditDifficulty(level.difficulty);
    setEditGdUrl(level.gd_url || '');
    setEditImageUrl(level.image_url || '');
    setEditPosition(String(level.position));
    setTab('admin');
    setMessage(`Editando: ${level.name}`);
  }

  async function saveLevelEdit(e: FormEvent) {
    e.preventDefault();

    if (!isAdmin || !editingLevelId) {
      setMessage('No tenés permisos para editar niveles.');
      return;
    }

    if (!editName.trim()) {
      setMessage('El nombre del nivel es obligatorio.');
      return;
    }

    const targetPosition = Number(editPosition);

    if (
      !Number.isInteger(targetPosition) ||
      targetPosition < 1 ||
      targetPosition > levels.length
    ) {
      setMessage(`La posición debe ser un número entre 1 y ${levels.length}.`);
      return;
    }

    const current = levels.find((level) => level.id === editingLevelId);

    if (!current) {
      setMessage('No se encontró el nivel que querés editar.');
      return;
    }

    setBusy(true);
    setMessage('');

    const temporary =
      Math.max(0, ...levels.map((level) => level.position)) + 10000;

    const first = await supabase
      .from('levels')
      .update({ position: temporary })
      .eq('id', editingLevelId);

    if (first.error) {
      setBusy(false);
      setMessage('No se pudo preparar la edición: ' + first.error.message);
      return;
    }

    const ordered = [...levels].sort((a, b) => a.position - b.position);
    const oldIndex = ordered.findIndex((level) => level.id === editingLevelId);
    const targetIndex = targetPosition - 1;

    ordered.splice(oldIndex, 1);
    ordered.splice(targetIndex, 0, current);

    for (let index = 0; index < ordered.length; index++) {
      const level = ordered[index];

      const { error } = await supabase
        .from('levels')
        .update({ position: 100000 + index + 1 })
        .eq('id', level.id);

      if (error) {
        setBusy(false);
        setMessage('No se pudo reordenar el catálogo: ' + error.message);
        await load();
        return;
      }
    }

    for (let index = 0; index < ordered.length; index++) {
      const level = ordered[index];
      const update: Record<string, unknown> = { position: index + 1 };

      if (level.id === editingLevelId) {
        Object.assign(update, {
          name: editName.trim(),
          creator: editCreator.trim() || null,
          difficulty: editDifficulty,
          gd_url: editGdUrl.trim() || null,
          image_url: editImageUrl.trim() || null,
        });
      }

      const { error } = await supabase
        .from('levels')
        .update(update)
        .eq('id', level.id);

      if (error) {
        setBusy(false);
        setMessage('No se pudo guardar el cambio: ' + error.message);
        await load();
        return;
      }
    }

    setBusy(false);
    setEditingLevelId('');
    setMessage('Tarjeta y posición actualizadas.');
    await load();
  }

  async function moveLevel(level: Level, delta: number) {
    if (!isAdmin) return;

    const ordered = [...levels].sort((a, b) => a.position - b.position);
    const i = ordered.findIndex((item) => item.id === level.id);
    const j = i + delta;

    if (j < 0 || j >= ordered.length) return;

    const other = ordered[j];
    const temporary =
      Math.max(...ordered.map((item) => item.position), 0) + 10000;

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

    const duplicate = suggestions.find(
      (suggestion) =>
        suggestion.name.trim().toLowerCase() === name.toLowerCase() &&
        suggestion.status === 'pending'
    );

    if (duplicate) {
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
    suggestion: Suggestion,
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
        const { error } = await supabase.from('levels').insert({
          name: suggestion.name.trim(),
          creator: suggestion.creator,
          difficulty: suggestion.difficulty,
          gd_url: suggestion.gd_url,
          image_url: suggestion.image_url,
          position: Math.max(0, ...levels.map((level) => level.position)) + 1,
        });

        if (error) {
          setBusy(false);
          setMessage('No se pudo publicar el nivel: ' + error.message);
          return;
        }
      }
    }

    const { error } = await supabase
      .from('level_suggestions')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id);

    setBusy(false);

    if (error) {
      setMessage('No se pudo actualizar la propuesta: ' + error.message);
      await load();
      return;
    }

    setMessage(status === 'approved' ? 'Propuesta aprobada.' : 'Propuesta rechazada.');
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

    const { data: existing, error: findError } = await supabase
      .from('completions')
      .select('id,status')
      .eq('user_id', userId)
      .eq('level_id', selectedLevel)
      .maybeSingle();

    if (findError) {
      setBusy(false);
      setMessage('No se pudo comprobar el récord: ' + findError.message);
      return;
    }

    if (existing?.status === 'approved') {
      setBusy(false);
      setMessage('Ya tenés este nivel registrado como completado.');
      return;
    }

    if (existing?.status === 'pending') {
      setBusy(false);
      setMessage('Ya tenés un récord pendiente de revisión para este nivel.');
      return;
    }

    let error;

    if (existing) {
      // Reenvía un récord rechazado sin crear una fila duplicada.
      ({ error } = await supabase
        .from('completions')
        .update({
          proof_url: proof.trim() || null,
          attempts: attempts ? Number(attempts) : null,
          notes: notes.trim() || null,
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
        })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('completions').insert({
        user_id: userId,
        level_id: selectedLevel,
        proof_url: proof.trim() || null,
        attempts: attempts ? Number(attempts) : null,
        notes: notes.trim() || null,
        status: 'pending',
      }));
    }

    setBusy(false);

    if (error) {
      if (error.code === '23505') {
        setMessage(
          'Ya existe un récord para ese nivel. Actualizá la página y comprobá su estado.'
        );
      } else {
        setMessage('No se pudo enviar el récord: ' + error.message);
      }
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
    if (!isAdmin) return;

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

  async function setManualCompletion() {
    if (!isAdmin || !manualPlayerId || !manualLevelId) {
      setMessage('Elegí un jugador y un nivel.');
      return;
    }

    setBusy(true);
    setMessage('');

    const { data: existing, error: findError } = await supabase
      .from('completions')
      .select('id')
      .eq('user_id', manualPlayerId)
      .eq('level_id', manualLevelId)
      .maybeSingle();

    if (findError) {
      setBusy(false);
      setMessage('No se pudo comprobar el récord: ' + findError.message);
      return;
    }

    let error;

    if (existing) {
      ({ error } = await supabase
        .from('completions')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('completions').insert({
        user_id: manualPlayerId,
        level_id: manualLevelId,
        status: 'approved',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }));
    }

    setBusy(false);

    if (error) {
      setMessage('No se pudo registrar el completado: ' + error.message);
      return;
    }

    setMessage('Completado aprobado y asociado al jugador.');
    await load();
  }

  async function removeManualCompletion(completion: Completion) {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('completions')
      .update({
        status: 'rejected',
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', completion.id);

    setMessage(
      error
        ? 'No se pudo quitar el récord: ' + error.message
        : 'Récord quitado del ranking. El registro queda conservado como rechazado.'
    );

    await load();
  }

  const approved = useMemo(
    () => completions.filter((completion) => completion.status === 'approved'),
    [completions]
  );

  const pending = useMemo(
    () => completions.filter((completion) => completion.status === 'pending'),
    [completions]
  );

  const pendingSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === 'pending'),
    [suggestions]
  );

  const nameFor = (id: string) =>
    profiles.find((profile) => profile.id === id)?.username || 'Jugador';

  const visibleLevels = levels.filter((level) =>
    (level.name + ' ' + (level.creator || '') + ' ' + level.difficulty)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const matchingLevels = levels.filter((level) =>
    level.name.toLowerCase().includes(levelSearch.trim().toLowerCase())
  );

  // Ranking: cuenta niveles únicos aprobados y suma puntos según la posición.
  const playerRanking = useMemo(() => {
    const levelPositions = new Map(
      levels.map((level) => [level.id, level.position])
    );

    return profiles
      .map((profile) => {
        const completedIds = new Set(
          approved
            .filter((record) => record.user_id === profile.id)
            .map((record) => record.level_id)
        );

        const points = [...completedIds].reduce((total, levelId) => {
          const position = levelPositions.get(levelId);

          if (position === undefined || position < 1) return total;

          return total + Math.round(1000 / Math.sqrt(position));
        }, 0);

        return {
          id: profile.id,
          username: profile.username || 'Jugador',
          completed: completedIds.size,
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

  const counts = useMemo(() => {
    const result = new Map<string, number>();

    approved.forEach((completion) => {
      result.set(
        completion.user_id,
        (result.get(completion.user_id) || 0) + 1
      );
    });

    return result;
  }, [approved]);

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
                {email}{isAdmin ? ' · ADMIN' : ''}
              </span>
              <button className="btn" onClick={signOut}>Salir</button>
            </>
          ) : (
            <button
              className="btn primary"
              onClick={() => {
                window.location.href = '/login?next=/';
              }}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <h2>Familia GD Demon List</h2>
        <p>Ranking comunitario. La posición 1 representa el nivel más difícil.</p>
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
                {isAdmin && <th>Administrar</th>}
              </tr>
            </thead>
            <tbody>
              {visibleLevels.map((level) => {
                const records = approved.filter(
                  (completion) => completion.level_id === level.id
                );

                const uniquePlayers = [
                  ...new Set(records.map((record) => nameFor(record.user_id))),
                ];

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
                            title="Editar tarjeta"
                            onClick={() => startEditingLevel(level)}
                          >
                            Editar
                          </button>
                          <button
                            className="small-btn"
                            title="Subir, hacia niveles más difíciles"
                            onClick={() => moveLevel(level, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className="small-btn"
                            title="Bajar, hacia niveles más fáciles"
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
            <div className="empty">Todavía no hay jugadores registrados.</div>
          )}

          <div className="notice">
            Los puntos se calculan con los récords aprobados. Cada nivel suma
            puntos una sola vez por jugador. Fórmula: redondeo de 1000 ÷ raíz
            cuadrada de la posición. La posición 1 da más puntos.
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
                  onClick={() => {
                    window.location.href = '/login?next=/';
                  }}
                >
                  Iniciar sesión
                </button>
              </>
            ) : (
              <>
                <p>
                  Buscá el nivel. Si no existe, podés proponerlo para que un
                  administrador lo revise.
                </p>

                <form onSubmit={submitRecord}>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="levelSearch">Buscar nivel</label>
                      <input
                        id="levelSearch"
                        value={levelSearch}
                        onChange={(event) => {
                          setLevelSearch(event.target.value);
                          setSelectedLevel('');
                          setShowProposal(false);
                        }}
                        placeholder="Escribí el nombre del nivel..."
                        autoComplete="off"
                      />

                      {selectedLevel && (
                        <div className="notice">
                          Nivel seleccionado:{' '}
                          <strong>
                            {levels.find(
                              (level) => level.id === selectedLevel
                            )?.name}
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
                          style={{ marginTop: 8, display: 'grid', gap: 6 }}
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
                            (level) =>
                              level.name.trim().toLowerCase() ===
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
                        onChange={(event) => setAttempts(event.target.value)}
                        placeholder="Ej. 842"
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="proof">Prueba (opcional)</label>
                      <input
                        id="proof"
                        type="url"
                        value={proof}
                        onChange={(event) => setProof(event.target.value)}
                        placeholder="https://youtu.be/..."
                      />
                    </div>

                    <div className="field full">
                      <label htmlFor="notes">Notas (opcional)</label>
                      <input
                        id="notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
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
                    <form onSubmit={submitSuggestion}>
                      <div className="form-grid">
                        <div className="field full">
                          <label htmlFor="proposalName">Nombre</label>
                          <input
                            id="proposalName"
                            required
                            maxLength={100}
                            value={levelSearch}
                            onChange={(event) =>
                              setLevelSearch(event.target.value)
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="proposalCreator">Creador</label>
                          <input
                            id="proposalCreator"
                            maxLength={100}
                            value={proposalCreator}
                            onChange={(event) =>
                              setProposalCreator(event.target.value)
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="proposalDifficulty">Dificultad</label>
                          <select
                            id="proposalDifficulty"
                            value={proposalDifficulty}
                            onChange={(event) =>
                              setProposalDifficulty(event.target.value)
                            }
                          >
                            {DIFFICULTIES.map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>
                        </div>

                        <div className="field full">
                          <label htmlFor="proposalUrl">Link del nivel</label>
                          <input
                            id="proposalUrl"
                            type="url"
                            value={proposalUrl}
                            onChange={(event) =>
                              setProposalUrl(event.target.value)
                            }
                            placeholder="https://..."
                          />
                        </div>

                        <div className="field full">
                          <label htmlFor="proposalImage">
                            URL de miniatura
                          </label>
                          <input
                            id="proposalImage"
                            type="url"
                            value={proposalImage}
                            onChange={(event) =>
                              setProposalImage(event.target.value)
                            }
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
            <p>Solo aparecen aquí los récords aprobados por la administración.</p>

            {approved.slice(0, 12).map((completion) => (
              <div className="pending" key={completion.id}>
                <strong>
                  {nameFor(completion.user_id)} ·{' '}
                  {levels.find((level) => level.id === completion.level_id)
                    ?.name || 'Nivel'}
                </strong>
                <p>
                  {completion.attempts
                    ? `${completion.attempts.toLocaleString()} intentos · `
                    : ''}
                  {completion.proof_url
                    ? 'Prueba adjunta'
                    : 'Sin prueba adjunta'}
                </p>
                {completion.proof_url && (
                  <a
                    className="mono"
                    href={completion.proof_url}
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
          {editingLevelId && (
            <section className="card">
              <h3>Editar tarjeta</h3>
              <p>
                Podés cambiar los datos, la thumbnail y la posición. Posición 1
                es el nivel más difícil.
              </p>

              <form onSubmit={saveLevelEdit}>
                <div className="form-grid">
                  <div className="field full">
                    <label htmlFor="editName">Nombre</label>
                    <input
                      id="editName"
                      required
                      maxLength={100}
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="editCreator">Creador</label>
                    <input
                      id="editCreator"
                      maxLength={100}
                      value={editCreator}
                      onChange={(event) => setEditCreator(event.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="editDifficulty">Dificultad</label>
                    <select
                      id="editDifficulty"
                      value={editDifficulty}
                      onChange={(event) => setEditDifficulty(event.target.value)}
                    >
                      {DIFFICULTIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="editPosition">Posición</label>
                    <input
                      id="editPosition"
                      type="number"
                      min="1"
                      max={levels.length}
                      required
                      value={editPosition}
                      onChange={(event) => setEditPosition(event.target.value)}
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="editGdUrl">Enlace del nivel</label>
                    <input
                      id="editGdUrl"
                      type="url"
                      value={editGdUrl}
                      onChange={(event) => setEditGdUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="field full">
                    <label htmlFor="editImageUrl">URL de thumbnail</label>
                    <input
                      id="editImageUrl"
                      type="url"
                      value={editImageUrl}
                      onChange={(event) => setEditImageUrl(event.target.value)}
                      placeholder="https://.../imagen.jpg"
                    />
                    {editImageUrl && (
                      <img
                        className="level-detail-image"
                        src={editImageUrl}
                        alt={`Vista previa de ${editName}`}
                        style={{ maxHeight: 220, marginTop: 8 }}
                      />
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn primary" disabled={busy}>
                    {busy ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => setEditingLevelId('')}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="card">
            <h3>Administrar completados</h3>
            <p>
              Agregá o quitá un completado aprobado de un jugador. Quitar no
              borra el historial: cambia el récord a rechazado.
            </p>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="manualPlayer">Jugador</label>
                <select
                  id="manualPlayer"
                  value={manualPlayerId}
                  onChange={(event) => setManualPlayerId(event.target.value)}
                >
                  <option value="">Elegir jugador...</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.username || 'Jugador'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="manualLevel">Nivel</label>
                <select
                  id="manualLevel"
                  value={manualLevelId}
                  onChange={(event) => setManualLevelId(event.target.value)}
                >
                  <option value="">Elegir nivel...</option>
                  {[...levels]
                    .sort((a, b) => a.position - b.position)
                    .map((level) => (
                      <option key={level.id} value={level.id}>
                        #{level.position} · {level.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                className="btn primary"
                disabled={busy || !manualPlayerId || !manualLevelId}
                onClick={setManualCompletion}
              >
                {busy ? 'Guardando...' : 'Marcar como completado'}
              </button>
            </div>

            <hr />

            <h3>Récords aprobados por nivel</h3>

            {levels.map((level) => {
              const levelRecords = approved.filter(
                (completion) => completion.level_id === level.id
              );

              if (!levelRecords.length) return null;

              return (
                <div className="pending" key={level.id}>
                  <strong>
                    #{level.position} · {level.name}
                  </strong>
                  {levelRecords.map((completion) => (
                    <div key={completion.id} className="pending-actions">
                      <span>{nameFor(completion.user_id)}</span>
                      <button
                        className="btn danger"
                        disabled={busy}
                        onClick={() => removeManualCompletion(completion)}
                      >
                        Quitar récord
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>

          <section className="card">
            <h3>Catálogo AREDL</h3>
            <p>
              Importa o actualiza los primeros 150 niveles del catálogo AREDL.
              No modifica el ranking propio.
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="btn primary"
                onClick={importAredl}
                disabled={importingAredl}
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
              >
                {aredlMessage}
              </div>
            )}

            <hr />

            <h3>Agregar nivel manualmente</h3>

            <div className="field">
              <label htmlFor="aredlSearch">Buscar en catálogo AREDL</label>
              <div className="form-actions">
                <input
                  id="aredlSearch"
                  value={aredlSearch}
                  onChange={(event) => {
                    setAredlSearch(event.target.value);
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

              {aredlResults.map((item) => (
                <button
                  type="button"
                  className="btn"
                  key={item.aredl_id}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginTop: 6,
                  }}
                  onClick={() => {
                    setSelectedAredl(item);
                    setLevelName(item.name);
                    setDifficulty('Extreme Demon');
                    setGdUrl(
                      item.gd_level_id
                        ? `https://gdbrowser.com/${item.gd_level_id}`
                        : ''
                    );
                  }}
                >
                  #{item.position} · {item.name} · {item.points ?? 'Sin puntos'} puntos
                </button>
              ))}

              {selectedAredl && (
                <p className="notice">
                  Seleccionado: <strong>{selectedAredl.name}</strong> · AREDL #
                  {selectedAredl.position} · ID:{' '}
                  {selectedAredl.gd_level_id || 'No disponible'}
                </p>
              )}
            </div>

            <form onSubmit={addLevel}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="levelName">Nombre</label>
                  <input
                    id="levelName"
                    required
                    maxLength={100}
                    value={levelName}
                    onChange={(event) => setLevelName(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="creator">Creador</label>
                  <input
                    id="creator"
                    maxLength={100}
                    value={creator}
                    onChange={(event) => setCreator(event.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="difficulty">Dificultad</label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value)}
                  >
                    {DIFFICULTIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className="field full">
                  <label htmlFor="gdUrl">Link del nivel</label>
                  <input
                    id="gdUrl"
                    type="url"
                    value={gdUrl}
                    onChange={(event) => setGdUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="field full">
                  <label htmlFor="imageUrl">URL de thumbnail</label>
                  <input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://.../imagen.jpg"
                  />
                  {imageUrl && (
                    <img
                      className="level-detail-image"
                      src={imageUrl}
                      alt="Vista previa"
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

            <hr />

            <h3>Propuestas pendientes</h3>

            {pendingSuggestions.map((suggestion) => (
              <div className="pending" key={suggestion.id}>
                <strong>{suggestion.name}</strong>
                <p>
                  {suggestion.creator || 'Creador no indicado'} ·{' '}
                  {suggestion.difficulty}
                </p>

                {suggestion.image_url && (
                  <img
                    className="level-detail-image"
                    src={suggestion.image_url}
                    alt={`Miniatura de ${suggestion.name}`}
                    style={{ maxHeight: 160 }}
                  />
                )}

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

                <p className="sub">
                  Propuesto por: {nameFor(suggestion.submitted_by)}
                </p>

                <div className="pending-actions">
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => reviewSuggestion(suggestion, 'approved')}
                  >
                    Aprobar
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
          </section>

          <section className="card">
            <div className="section-head">
              <h3>Récords pendientes</h3>
              <span className="tag">{pending.length} pendientes</span>
            </div>

            <p>Revisá cada envío antes de aprobarlo.</p>

            {pending.map((completion) => (
              <div className="pending" key={completion.id}>
                <strong>
                  {nameFor(completion.user_id)} ·{' '}
                  {levels.find((level) => level.id === completion.level_id)
                    ?.name || 'Nivel'}
                </strong>
                <p>
                  {completion.attempts
                    ? `${completion.attempts.toLocaleString()} intentos · `
                    : ''}
                  {completion.notes || 'Sin notas'} ·{' '}
                  {completion.proof_url ? 'Con prueba' : 'Sin prueba'}
                </p>

                {completion.proof_url && (
                  <p>
                    <a
                      className="mono"
                      href={completion.proof_url}
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
                    onClick={() => moderate(completion.id, 'approved')}
                  >
                    Aprobar
                  </button>
                  <button
                    className="btn danger"
                    onClick={() => moderate(completion.id, 'rejected')}
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
              {profiles.map((profile) => (
                <div key={profile.id} className="pending">
                  <strong>{profile.username || 'Sin nombre'}</strong>
                  <p>
                    {profile.role === 'admin' ? 'Administrador' : 'Miembro'} ·{' '}
                    {counts.get(profile.id) || 0} récords aprobados
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
