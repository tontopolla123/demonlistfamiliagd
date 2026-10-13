
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
'https://raw.githubusercontent.com/potatdesigns/demonlist/cache/data/aredl-cache.json',


      { next: { revalidate: 3600 } }
    );

    
if (!response.ok) {
  const details = await response.text();

  return NextResponse.json(
    {
      error: `La API de AREDL respondió con error ${response.status}`,
      details: details.slice(0, 1000),
    },
    { status: 502 }
  );
}


    const payload: unknown = await response.json();

    const raw = Array.isArray(payload)
      ? payload
      : typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray(payload.data)
        ? payload.data
        : typeof payload === 'object' && payload !== null && 'levels' in payload && Array.isArray(payload.levels)
          ? payload.levels
          : null;

    if (!raw) {
      return NextResponse.json(
        { error: 'La API devolvió un formato inesperado.' },
        { status: 502 }
      );
    }

    const levels = raw
      .filter((item) => {
        if (typeof item !== 'object' || item === null) return false;

        const level = item as Record<string, unknown>;

        return (
          level.id !== undefined &&
          typeof level.name === 'string' &&
          Number.isFinite(Number(level.position)) &&
          Number(level.position) > 0
        );
      })
      .sort(
        (a, b) =>
          Number((a as Record<string, unknown>).position) -
          Number((b as Record<string, unknown>).position)
      )
      .slice(0, 150)
      .map((item) => {
        const level = item as Record<string, unknown>;

        return {
          id: String(level.id),
          name: String(level.name),
          position: Number(level.position),
          level_id:
            level.level_id != null ? String(level.level_id) : null,
          points:
            level.points != null && Number.isFinite(Number(level.points))
              ? Number(level.points)
              : null,
        };
      });

    return NextResponse.json({ levels });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con la API de AREDL.' },
      { status: 502 }
    );
  }
}
