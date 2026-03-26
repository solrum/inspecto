import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Map .pen iconFontFamily values to @iconify/json set names
const FAMILY_MAP: Record<string, string> = {
  lucide: 'lucide',
  feather: 'feather',
  'Material Symbols Outlined': 'material-symbols',
  'Material Symbols Rounded': 'material-symbols',
  'Material Symbols Sharp': 'material-symbols',
  phosphor: 'ph',
};

// In-memory cache: family → { name → svg }
const cache = new Map<string, Map<string, string>>();

function loadIconSet(setName: string): Map<string, string> {
  if (cache.has(setName)) return cache.get(setName)!;

  try {
    const jsonPath = join(process.cwd(), 'node_modules', '@iconify', 'json', 'json', `${setName}.json`);
    const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const icons = new Map<string, string>();

    const defaultBody = data.width ?? 24;
    const defaultHeight = data.height ?? defaultBody;

    for (const [name, icon] of Object.entries(data.icons) as [string, any][]) {
      const w = icon.width ?? defaultBody;
      const h = icon.height ?? defaultHeight;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${icon.body}</svg>`;
      icons.set(name, svg);
    }

    cache.set(setName, icons);
    return icons;
  } catch {
    const empty = new Map<string, string>();
    cache.set(setName, empty);
    return empty;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ family: string; name: string }> },
) {
  const { family, name } = await params;

  const setName = FAMILY_MAP[family] ?? family;
  const icons = loadIconSet(setName);

  // Strip .svg extension if present
  const iconName = name.replace(/\.svg$/, '');
  const svg = icons.get(iconName);

  if (!svg) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
