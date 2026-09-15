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
        method: 'p1/p10 sphere — exact |p|-r',
        source: `sdSphere(p,r) = length(p)-r;`,
      },
      {
        n: 2,
        name: 'Box',
        method: 'p1/p11 box',
        source: `sdBox(p,b) = length(max(abs(p)-b,0))+min(max(abs(p)),0);`,
      },
      {
        n: 3,
        name: 'Rounded box',
        method: 'p54 rounded boxes',
        source: `sdRoundBox(p,b,r)`,
      },
      {
        n: 4,
        name: 'Capsule',
        method: 'p1 capsule / segment',
        source: `sdCapsule(p,a,b,r)`,
      },
      {
        n: 5,
        name: 'Octahedron',
        method: 'p1 octahedron SDF',
        source: `sdOctahedron(p,s)`,
      },
    ],
  },
  {
    id: 'csg',
    label: 'CSG',
    title: 'Combine',
    blurb: 'Ch.5 — bool / smin / repeat.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Union min',
        method: 'Ch.5 boolean union',
        source: `d = min(dA,dB);`,
      },
      {
        n: 2,
        name: 'Smooth min',
        method: 'p50 smooth minimum',
        source: `d = smin(dA,dB,k);`,
      },
      {
        n: 3,
        name: 'Subtraction',
        method: 'Ch.5 max(a,-b)',
        source: `d = max(dA,-dB);`,
      },
      {
        n: 4,
        name: 'Xor carve',
        method: 'p56 xor SDFs spirit',
        source: `d = max(min(dA,dB), -max(dA,dB));`,
      },
      {
        n: 5,
        name: 'Limited repeat',
        method: 'p51 domain repetition limited',
        source: `q = p - clamp(round(p/s),-lim,lim)*s;`,
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
    title: 'Lighting',
    blurb: 'Ch.7 — outdoors, soft shadow, AO (p52, p78, p80).',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Key + sky fill',
        method: 'p78 outdoors 3-light spirit (key+sky)',
        source: `sun*shadow + sky*(0.5+0.5*n.y)`,
      },
      {
        n: 2,
        name: 'Soft shadow',
        method: 'p52 soft shadows in raymarched SDFs',
        source: `shadow = softShadow(p,lDir);`,
      },
      {
        n: 3,
        name: 'SDF AO',
        method: 'p80 multires AO spirit',
        source: `ao = calcAO(p,n);`,
      },
      {
        n: 4,
        name: 'Rim + key',
        method: 'Ch.7 rim accent',
        source: `col += rim*pow(1.-dot(n,v),3.);`,
      },
      {
        n: 5,
        name: 'Specular Blinn',
        method: 'Ch.7 specular lobe',
        source: `spec = pow(sat(dot(n,h)),64.);`,
      },
    ],
  },
  {
    id: 'fog',
    label: 'FOG',
    title: 'Atmosphere',
    blurb: 'Ch.7 better fog (p79) + vignette.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Distance fog',
        method: 'p79 colored distance fog',
        source: `col = mix(col,fogCol,1.-exp(-d*d*k));`,
      },
      {
        n: 2,
        name: 'Height fog',
        method: 'p79 height fog',
        source: `fog *= exp(-h*k);`,
      },
      {
        n: 3,
        name: 'Sun in fog',
        method: 'p79 sun disc through fog',
        source: `fogCol += sunGlow;`,
      },
      {
        n: 4,
        name: 'Vignette',
        method: 'presentation vignette',
        source: `col *= smoothstep(1.2,0.3,len(uv-0.5));`,
      },
      {
        n: 5,
        name: 'Letterbox fog',
        method: 'Ch.2 mask + fog',
        source: `col = mix(fogCol,col,letterbox);`,
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
