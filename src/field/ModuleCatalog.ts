/**
 * Portal worlds — immersive families (not a tutorial rail).
 * IQ-sourced terrain/fog/SDF + studio sims (pour / clay).
 */

export type PortalId = 'explore' | 'maze' | 'water' | 'pour' | 'clay';

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

export type PourTheme = 'drip' | 'sheet' | 'splatter' | 'marble' | 'thick';

export type ClayMode = 'front' | 'top' | 'open' | 'pull' | 'smooth';

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
  {
    id: 'pour',
    label: 'POUR',
    title: 'Paint pour',
    blurb: 'Paint falls on a canvas — hand tilts the board.',
    mode: 'pick',
    layers: [
      { id: 'drip', label: 'DRP', title: 'Drip', method: 'thin streams + gravity tilt' },
      { id: 'sheet', label: 'SHT', title: 'Sheet pour', method: 'wide curtain of paint' },
      { id: 'splatter', label: 'SPL', title: 'Splatter', method: 'impact droplets' },
      { id: 'marble', label: 'MRB', title: 'Marble', method: 'domain-warped color veins' },
      { id: 'thick', label: 'THK', title: 'Thick body', method: 'high viscosity slow flow' },
    ],
  },
  {
    id: 'clay',
    label: 'CLAY',
    title: 'Clay studio',
    blurb: 'Spinning wheel — finger molds clay. Front / top cams.',
    mode: 'pick',
    layers: [
      { id: 'front', label: 'FRT', title: 'Front view', method: 'side camera on the wheel' },
      { id: 'top', label: 'TOP', title: 'Top down', method: 'spread the inside' },
      { id: 'open', label: 'OPN', title: 'Open form', method: 'push walls outward' },
      { id: 'pull', label: 'PUL', title: 'Pull up', method: 'raise the cylinder' },
      { id: 'smooth', label: 'SMU', title: 'Smooth', method: 'soften profile ridges' },
    ],
  },
];

export function portalById(id: PortalId): PortalDef {
  const p = PORTAL_DEFS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown portal ${id}`);
  return p;
}

export type FamilyId = PortalId;
