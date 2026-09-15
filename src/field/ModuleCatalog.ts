/**
 * Portal worlds — three immersive families (not a tutorial rail).
 * Sourced from IqEzles method (terrain fBM, domain repeat, fog, SDFs).
 * https://iquilezles.org/articles/ + RESEARCH/IqEzles_method_for_shader_art.md
 */

export type PortalId = 'explore' | 'maze' | 'water';

export type ExploreLayer =
  | 'jungle'
  | 'mountains'
  | 'valley'
  | 'river'
  | 'day'
  | 'night'
  | 'rain';

export type MazeTheme =
  | 'maze'
  | 'trees'
  | 'rock'
  | 'steel'
  | 'diamond'
  | 'cave'
  | 'trail';

export type WaterTheme =
  | 'underwater'
  | 'coral'
  | 'pacific'
  | 'pond'
  | 'lake';

export interface LayerDef {
  id: string;
  label: string;
  title: string;
  method: string;
}

export interface PortalDef {
  id: PortalId;
  label: string;
  title: string;
  blurb: string;
  /** explore = multi-select layers (day XOR night); maze/water = pick one theme */
  mode: 'layers' | 'pick';
  layers: LayerDef[];
}

export const PORTAL_DEFS: PortalDef[] = [
  {
    id: 'explore',
    label: 'WILD',
    title: 'Explore',
    blurb: 'Generative jungle — free camera, all axes. Day XOR night.',
    mode: 'layers',
    layers: [
      { id: 'jungle', label: 'JNG', title: 'Jungle', method: 'Ch.8 fBM canopy + capsule trunks' },
      { id: 'mountains', label: 'MTN', title: 'Mountains', method: 'Ch.6/p63 terrain fBM' },
      { id: 'valley', label: 'VAL', title: 'Valley', method: 'terrain bowl carve' },
      { id: 'river', label: 'RIV', title: 'River', method: 'depressed path + wet shade' },
      { id: 'day', label: 'DAY', title: 'Day', method: 'p78 outdoors key+sky' },
      { id: 'night', label: 'NGT', title: 'Night', method: 'moon fill — exclusive vs day' },
      { id: 'rain', label: 'RAIN', title: 'Rain', method: 'screen-space streaks' },
    ],
  },
  {
    id: 'maze',
    label: 'MAZE',
    title: 'Maze',
    blurb: 'X strafe · Y forward/back · collisions.',
    mode: 'pick',
    layers: [
      { id: 'maze', label: 'MZE', title: 'Maze', method: 'p51 domain-repeated walls' },
      { id: 'trees', label: 'TRE', title: 'Trees', method: 'capsule grove corridors' },
      { id: 'rock', label: 'RCK', title: 'Rock', method: 'noisy box stone' },
      { id: 'steel', label: 'STL', title: 'Steel', method: 'hard edges + specular' },
      { id: 'diamond', label: 'DMD', title: 'Diamond', method: 'octahedron crystal cells' },
      { id: 'cave', label: 'CAV', title: 'Cave', method: 'subtracted tunnels' },
      { id: 'trail', label: 'TRL', title: 'Forest trail', method: 'path through trunks' },
    ],
  },
  {
    id: 'water',
    label: 'SEA',
    title: 'Water',
    blurb: 'X strafe · Y forward/back · underwater portal.',
    mode: 'pick',
    layers: [
      { id: 'underwater', label: 'SUB', title: 'Under water', method: 'p79 beer fog + caustics' },
      { id: 'coral', label: 'CRL', title: 'Coral reef', method: 'smin blobs + voronoi' },
      { id: 'pacific', label: 'PAC', title: 'Pacific ocean', method: 'deep blue + long fog' },
      { id: 'pond', label: 'PND', title: 'Pond', method: 'shallow green water' },
      { id: 'lake', label: 'LAK', title: 'Lake', method: 'mid depth + godrays' },
    ],
  },
];

export function portalById(id: PortalId): PortalDef {
  const p = PORTAL_DEFS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown portal ${id}`);
  return p;
}

/** @deprecated old family API removed — portals only */
export type FamilyId = PortalId;
