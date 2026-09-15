/**
 * IqEzles-method sample catalog — heavily sourced from
 * RESEARCH/IqEzles_method_for_shader_art.md and https://iquilezles.org/articles/
 * Local PDFs: RESEARCH/pN.pdf
 *
 * Families compose: MARCH[i] + LIGHT[j] + FOG[k] + color tint, etc.
 */

export type FamilyId =
  | 'march'
  | 'sdf'
  | 'csg'
  | 'noise'
  | 'light'
  | 'fog'
  | 'fract'
  | 'deform';

export interface SampleVariant {
  n: number;
  name: string;
  method: string;
  source: string;
}

export interface FamilyDef {
  id: FamilyId;
  label: string;
  title: string;
  blurb: string;
  defaultVariant: number;
  defaultEnabled: boolean;
  variants: SampleVariant[];
}

export const FAMILY_DEFS: FamilyDef[] = [
  {
    id: 'march',
    label: 'MRCH',
    title: 'Raymarch',
    blurb: 'Ch.6 / p49 / p65 — worlds with two triangles.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Sphere + floor',
        method: 'Ch.6 sphere tracing; p49 raymarching DF; tip = light',
        source: `map = min(sdSphere(p-tip3,0.35), p.y+0.75); shade Lambert+key`,
      },
      {
        n: 2,
        name: 'Soft-min metaballs',
        method: 'Ch.5 smin (p50) — organic union of tip + satellites',
        source: `d = smin(sdSphere(p-c0,r0), sdSphere(p-c1,r1), 0.25);`,
      },
      {
        n: 3,
        name: 'Pillar city',
        method: 'Ch.5 domain repetition (p51)',
        source: `q=p; q.xz=mod(q.xz+0.5,1.0)-0.5; map=sdBox(q,vec3(0.2,1.0,0.2));`,
      },
      {
        n: 4,
        name: 'Torus temple',
        method: 'Ch.4 torus SDF + box subtract CSG',
        source: `map = max(sdTorus(p,vec2(0.55,0.12)), -sdBox(p,vec3(0.35)));`,
      },
      {
        n: 5,
        name: 'FBM terrain',
        method: 'Ch.6/8 terrains (p63) + fBM height (p16)',
        source: `map = p.y - fbm(p.xz)*0.35; tip moves sun`,
      },
    ],
  },
  {
    id: 'sdf',
    label: 'SDF',
    title: 'Distance shapes',
    blurb: 'Ch.4 — exact SDFs (p1–p5, p10–p11). Used inside map().',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Sphere',
        method: 'Ch.4 / p1 p10 — exact sdSphere; tip energy scales r',
        source: `sdSphere(p,r)=length(p)-r; r=0.30+0.20*e0`,
      },
      {
        n: 2,
        name: 'Box',
        method: 'Ch.4 / p1 p11 — exact sdBox at tip',
        source: `sdBox(p,vec3(r*0.88))`,
      },
      {
        n: 3,
        name: 'Rounded box',
        method: 'Ch.4 / p54 — sdRoundBox soft corners',
        source: `sdRoundBox(p,vec3(r*0.78),0.05+0.08*e0)`,
      },
      {
        n: 4,
        name: 'Capsule',
        method: 'Ch.4 / p1 — sdCapsule tip0↔tip1 (or vertical)',
        source: `sdCapsule(p,a,b,0.11+0.10*e0)`,
      },
      {
        n: 5,
        name: 'Octahedron',
        method: 'Ch.4 / p1 — sdOctahedron L1 diamond',
        source: `sdOctahedron(p,r*1.15)`,
      },
    ],
  },
  {
    id: 'csg',
    label: 'CSG',
    title: 'Combine',
    blurb: 'Ch.5 — owned by IQ SDF: bool / smin / xor / limited repeat.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Union min',
        method: 'Ch.5 boolean union — tip prim ∪ tip1/cutter',
        source: `d = min(dA, dB);`,
      },
      {
        n: 2,
        name: 'Smooth min',
        method: 'Ch.5 / p50 smin — organic blend, k from tip energy',
        source: `d = smin(dA, dB, 0.16+0.28*e0);`,
      },
      {
        n: 3,
        name: 'Subtraction',
        method: 'Ch.5 boolean subtract — carve dB from dA',
        source: `d = max(dA, -dB);`,
      },
      {
        n: 4,
        name: 'Xor carve',
        method: 'Ch.5 / p56 xor SDFs — interlocking cavities',
        source: `d = max(min(dA,dB), -max(dA,dB));`,
      },
      {
        n: 5,
        name: 'Limited repeat',
        method: 'Ch.5 / p51 limited domain repetition around tip',
        source: `q=(p-tip)-clamp(round((p-tip)/s),-lim,lim)*s; d=primAt(q);`,
      },
    ],
  },
  {
    id: 'noise',
    label: 'NZE',
    title: 'Noise / warp',
    blurb: 'Ch.8 — fBM, warp, voronoi (p16–p22).',
    defaultVariant: 1,
    defaultEnabled: false,
    variants: [
      {
        n: 1,
        name: 'fBM displacement',
        method: 'p16 fBM on surface',
        source: `d -= 0.08*fbm(p*2.0);`,
      },
      {
        n: 2,
        name: 'Domain warp',
        method: 'p19 domain warping',
        source: `p += 0.25*fbm3(p);`,
      },
      {
        n: 3,
        name: 'Voronoi cells',
        method: 'p20–p22 voronoise / edges',
        source: `d = min(d, voronoi(p.xz)-0.02);`,
      },
      {
        n: 4,
        name: 'Gradient noise',
        method: 'p17 gradient noise',
        source: `n = gnoise(p);`,
      },
      {
        n: 5,
        name: 'Warped marble',
        method: 'Ch.8 / Ch.15 Recipe B',
        source: `q=p+fbm(p); col*=marble(q);`,
      },
    ],
  },
  {
    id: 'light',
    label: 'LIT',
    title: 'Light / atmosphere',
    blurb: 'Ch.7 — owned by IQ Light: outdoors, fog, soft shadow, AO, GI.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Outdoors rig',
        method: 'p78 outdoors three-light (key/sun + sky fill + bounce)',
        source: `col = sunCol*lambert*shadow + skyCol*(0.5+0.5*n.y) + bounceCol*ao;`,
      },
      {
        n: 2,
        name: 'Colored fog',
        method: 'p79 better fog — distance + height + sun tint',
        source: `col = mix(col, fogCol + sunGlow, 1.0 - exp(-d*d*k));`,
      },
      {
        n: 3,
        name: 'Soft shadow',
        method: 'p24 / p52 soft shadows — penumbra from min openness',
        source: `shadow = softShadow(ro, rd, mint, maxt); col *= mix(0.25, 1.0, shadow);`,
      },
      {
        n: 4,
        name: 'Multires AO',
        method: 'p80–p83 / p106–p107 SDF AO near+far cavities',
        source: `ao = calcAO(p, n); col *= 0.45 + 0.55*ao;`,
      },
      {
        n: 5,
        name: 'GI sketch',
        method: 'p81 / p84 directional derivatives + cheap bounce',
        source: `col += bounceCol * ind * (0.5 + 0.5*dot(n, bounceDir));`,
      },
    ],
  },
  {
    id: 'fog',
    label: 'FOG',
    title: 'Atmosphere',
    blurb: 'Ch.7 p79 — owned by IQ Light (after LIT).',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Distance fog',
        method: 'p79 colored distance fog — exp(-d²k)',
        source: `col = mix(col, fogCol, 1.0 - exp(-tHit*tHit*k));`,
      },
      {
        n: 2,
        name: 'Height fog',
        method: 'p79 height fog — denser in valleys',
        source: `fogAmt = smoothstep(hMax, hMin, p.y);`,
      },
      {
        n: 3,
        name: 'Sun in fog',
        method: 'p79 sun disc / glow through fog',
        source: `fogCol += sunCol * pow(dot(rd,sunDir),n);`,
      },
      {
        n: 4,
        name: 'Beer density',
        method: 'p79 volumetric spirit — Beer-Lambert along ray',
        source: `fogAmt = 1.0 - exp(-sigma * tHit);`,
      },
      {
        n: 5,
        name: 'Ground haze',
        method: 'p79 height × distance haze near floor',
        source: `fogAmt = (1.-exp(-d*d*k)) * smoothstep(1.0,-0.2,-p.y);`,
      },
    ],
  },
  {
    id: 'fract',
    label: 'FRCT',
    title: 'Fractals',
    blurb: 'Ch.11 — mandelbulb / julia / traps (p129–p135).',
    defaultVariant: 1,
    defaultEnabled: false,
    variants: [
      {
        n: 1,
        name: 'Mandelbulb DE',
        method: 'p130 mandelbulb',
        source: `d = mandelbulbDE(p);`,
      },
      {
        n: 2,
        name: '3D Julia',
        method: 'p131 3D Julia sets',
        source: `d = juliaDE(p,c);`,
      },
      {
        n: 3,
        name: 'Orbit trap color',
        method: 'p132–p135 orbit traps',
        source: `trap = min(trap, length(z.xy));`,
      },
      {
        n: 4,
        name: 'Menger sponge',
        method: 'p62 menger fractal',
        source: `d = menger(p);`,
      },
      {
        n: 5,
        name: 'Hybrid bulb+sphere',
        method: 'Ch.11 hybrid with base SDF',
        source: `d = smin(sdSphere(p,1.), bulb, 0.2);`,
      },
    ],
  },
  {
    id: 'deform',
    label: 'DFRM',
    title: 'Deformations',
    blurb: 'Ch.10 plane deform / twist (p100).',
    defaultVariant: 1,
    defaultEnabled: false,
    variants: [
      {
        n: 1,
        name: 'Twist Y',
        method: 'Ch.5 domain deformation twist',
        source: `p.xz *= rot(p.y*k);`,
      },
      {
        n: 2,
        name: 'Bend',
        method: 'domain bend',
        source: `p = bend(p,k);`,
      },
      {
        n: 3,
        name: 'Polar tunnel',
        method: 'p100 plane deformations tunnel',
        source: `uv = vec2(a/pi, 1./r)+t;`,
      },
      {
        n: 4,
        name: 'Feedback trails',
        method: 'p101 feedback effect spirit',
        source: `col = mix(col, prev, 0.85);`,
      },
      {
        n: 5,
        name: 'Kaleido',
        method: 'Ch.10 symmetry fold',
        source: `p.xy = abs(p.xy);`,
      },
    ],
  },
];

export function familyById(id: FamilyId): FamilyDef {
  const f = FAMILY_DEFS.find((x) => x.id === id);
  if (!f) throw new Error(`unknown family ${id}`);
  return f;
}

export const ROYGBIV = [
  { id: 'R', hex: '#ff2d2d', name: 'Red' },
  { id: 'O', hex: '#ff8a1a', name: 'Orange' },
  { id: 'Y', hex: '#ffd400', name: 'Yellow' },
  { id: 'G', hex: '#2ee66b', name: 'Green' },
  { id: 'B', hex: '#2f7bff', name: 'Blue' },
  { id: 'I', hex: '#5b4dff', name: 'Indigo' },
  { id: 'V', hex: '#c43dff', name: 'Violet' },
] as const;
