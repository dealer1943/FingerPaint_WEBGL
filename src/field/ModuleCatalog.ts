/**
 * IqEzles-method sample catalog.
 * Families = pipeline stages; variants = numbered examples from the method manual.
 * Selecting DST[2] + GRD[4] composes those samples in the shader.
 * Cite: RESEARCH/IqEzles_method_for_shader_art.md + https://iquilezles.org/articles/
 */

export type FamilyId =
  | 'dst'
  | 'wav'
  | 'wrp'
  | 'nze'
  | 'grd'
  | 'lit'
  | 'vig'
  | 'idl';

export interface SampleVariant {
  /** 1-based index shown on the rail */
  n: number;
  name: string;
  /** Method chapter / idea */
  method: string;
  /** Short GLSL teaching sketch (documentation + future editor) */
  source: string;
}

export interface FamilyDef {
  id: FamilyId;
  label: string;
  title: string;
  blurb: string;
  /** Default variant n (factory look uses these) */
  defaultVariant: number;
  defaultEnabled: boolean;
  variants: SampleVariant[];
}

export const FAMILY_DEFS: FamilyDef[] = [
  {
    id: 'dst',
    label: 'DST',
    title: 'Distance / shape',
    blurb: 'Ch.4 — scalar mass from tip distance.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Potential 1/r²',
        method: 'Ch.4 / Ch.15 Recipe A — tip potential',
        source: `float pot = (0.018 + 0.022*e) / (r*r + 0.018); field += pot;`,
      },
      {
        n: 2,
        name: 'Soft circle SDF',
        method: 'Ch.4 2D circle — soft edge via smoothstep',
        source: `float sd = r - (0.04 + 0.03*e); field += 1.0 - smoothstep(0.0, 0.08, sd);`,
      },
      {
        n: 3,
        name: 'Box L∞',
        method: 'Ch.4 L∞ / box metric (p6)',
        source: `float bx = max(abs(d.x), abs(d.y)); field += 0.04 / (bx*bx + 0.02);`,
      },
      {
        n: 4,
        name: 'Exp falloff',
        method: 'Ch.2 remap — gaussian blob',
        source: `field += e * exp(-18.0 * r*r);`,
      },
      {
        n: 5,
        name: 'Ring shell',
        method: 'Ch.2 smoothstep ring',
        source: `float shell = abs(r - 0.07); field += e * (1.0 - smoothstep(0.0, 0.04, shell));`,
      },
    ],
  },
  {
    id: 'wav',
    label: 'WAV',
    title: 'Waves',
    blurb: 'Ch.2/14 trig — ripples & modulation.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Decaying ripples',
        method: 'Ch.15 Recipe A ripples (factory)',
        source: `field += 0.12 * sin(14.0*r - uTime*1.6 - e*4.0) * exp(-5.5*r) * (0.35+e);`,
      },
      {
        n: 2,
        name: 'Slow rings',
        method: 'Ch.2 — lower frequency travel',
        source: `field += 0.1 * sin(7.0*r - uTime*0.7) * exp(-3.5*r) * e;`,
      },
      {
        n: 3,
        name: 'FM-ish',
        method: 'Ch.14 FM synthesis as wave inspiration (p124)',
        source: `float m = sin(uTime*0.8 + e*3.0); field += 0.1 * sin(12.0*r - uTime*2.0 + 2.0*m) * exp(-5.0*r);`,
      },
      {
        n: 4,
        name: 'Standing',
        method: 'Ch.2 sin×sin standing pattern',
        source: `field += 0.08 * sin(16.0*r) * cos(uTime*1.2) * exp(-4.0*r) * e;`,
      },
    ],
  },
  {
    id: 'wrp',
    label: 'WRP',
    title: 'Domain warp',
    blurb: 'Ch.8 domain warping (p19).',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Sin/cos weave',
        method: 'Ch.8 / factory warp',
        source: `q.x += 0.025*sin(7.0*p.y + uTime*0.7 + field*1.4); q.y += 0.025*cos(7.0*p.x - uTime*0.5);`,
      },
      {
        n: 2,
        name: 'Tip pull',
        method: 'Ch.15 Recipe B — warp toward tip',
        source: `q += 0.06 * e * normalize(d + 1e-4) * exp(-4.0*r);`,
      },
      {
        n: 3,
        name: 'Polar swirl',
        method: 'Ch.10 plane deformations — swirl',
        source: `float a = atan(d.y, d.x) + 0.8*e*exp(-3.0*r); q = tip + r*vec2(cos(a),sin(a));`,
      },
      {
        n: 4,
        name: 'Hash jitter',
        method: 'Ch.8 cheap pseudo-warp',
        source: `float h = fract(sin(dot(p, vec2(41.2,19.7)))*7842.1); q += (h-0.5)*0.04*(0.3+field);`,
      },
    ],
  },
  {
    id: 'nze',
    label: 'NZE',
    title: 'Noise / flow',
    blurb: 'Ch.8 fBM / Voronoi / secondary sample.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Warped falloff',
        method: 'Ch.15 factory flow in q',
        source: `warped += (0.012 + 0.018*e) / (length(q-tip)+0.05);`,
      },
      {
        n: 2,
        name: 'Value noise',
        method: 'Ch.8 value noise (teaching hash)',
        source: `float n = fract(sin(dot(q*6.0, vec2(12.9,78.2)))*43758.5); warped += 0.08 * n * e;`,
      },
      {
        n: 3,
        name: 'fBM-ish',
        method: 'Ch.8 fBM octaves (p16) — 3 taps',
        source: `vec2 pq=q*3.0; float f=0.0; float a=0.5; for(int o=0;o<3;o++){ f+=a*fract(sin(dot(pq,vec2(27.1,91.7)))*43758.5); pq*=2.03; a*=0.5;} warped+=0.1*f;`,
      },
      {
        n: 4,
        name: 'Voronoi edge',
        method: 'Ch.8 voronoi edges (p22)',
        source: `vec2 g=floor(q*5.0); vec2 f=fract(q*5.0); float md=1.0; for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 b=vec2(float(i),float(j)); vec2 o=fract(sin(vec2(dot(g+b,vec2(127.1,311.7)),dot(g+b,vec2(269.5,183.3))))*43758.5); md=min(md,length(b+o-f)); } warped+=0.12*(1.0-smoothstep(0.0,0.25,md));`,
      },
      {
        n: 5,
        name: 'Domain dots',
        method: 'Ch.5 domain repetition (p51)',
        source: `vec2 c=fract(q*8.0)-0.5; warped += 0.06 * exp(-30.0*dot(c,c));`,
      },
    ],
  },
  {
    id: 'grd',
    label: 'GRD',
    title: 'Grade / palette',
    blurb: 'Ch.3 cosine palettes (p39).',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Factory cosine',
        method: 'Ch.3 classic a+b*cos',
        source: `col = a0 + b0 * cos(6.28318*(c0*t + d0));`,
      },
      {
        n: 2,
        name: 'Fire',
        method: 'Ch.3 palette vectors — warm',
        source: `col = vec3(0.5,0.2,0.05) + vec3(0.5,0.35,0.15)*cos(6.28318*(vec3(1.0,0.8,0.4)*t + vec3(0.0,0.2,0.5)));`,
      },
      {
        n: 3,
        name: 'Ice',
        method: 'Ch.3 palette — cool',
        source: `col = vec3(0.1,0.15,0.25) + vec3(0.3,0.45,0.55)*cos(6.28318*(vec3(0.6,0.8,1.0)*t + vec3(0.3,0.5,0.7)));`,
      },
      {
        n: 4,
        name: 'Mono',
        method: 'Ch.2 remap — luminance only',
        source: `col = vec3(t*0.55 + 0.08);`,
      },
      {
        n: 5,
        name: 'Band zebra',
        method: 'Ch.9 filterable checkers spirit — bands',
        source: `float z = step(0.5, fract(t*4.0)); col = mix(vec3(0.08), vec3(0.85,0.8,0.7), z);`,
      },
    ],
  },
  {
    id: 'lit',
    label: 'LIT',
    title: 'Light accent',
    blurb: 'Ch.7 lighting accents / core.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Tip core',
        method: 'Ch.15 / factory core glow',
        source: `col += vec3(1.0,0.85,0.55) * exp(-55.0*nearest) * 0.45;`,
      },
      {
        n: 2,
        name: 'Soft bloom',
        method: 'Ch.7 softer key',
        source: `col += vec3(0.9,0.75,1.0) * exp(-18.0*nearest) * 0.35;`,
      },
      {
        n: 3,
        name: 'AO-ish',
        method: 'Ch.7 cavity darken from field',
        source: `col *= 0.55 + 0.45 * smoothstep(0.0, 0.35, nearest);`,
      },
      {
        n: 4,
        name: 'Rim',
        method: 'Ch.7 rim from tip angle proxy',
        source: `col += vec3(0.6,0.8,1.0) * pow(1.0 - exp(-8.0*nearest), 3.0) * 0.25;`,
      },
    ],
  },
  {
    id: 'vig',
    label: 'VIG',
    title: 'Atmosphere',
    blurb: 'Ch.7 fog / vignette / remap.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Vignette',
        method: 'Factory vig',
        source: `col *= 0.35 + 0.65 * smoothstep(1.2, 0.25, length(uv-0.5));`,
      },
      {
        n: 2,
        name: 'Height fog',
        method: 'Ch.7 better fog spirit (p79)',
        source: `col = mix(col, vec3(0.12,0.12,0.16), smoothstep(0.2, 1.0, uv.y)*0.55);`,
      },
      {
        n: 3,
        name: 'Letterbox',
        method: 'Ch.2 smoothstep mask',
        source: `float m = smoothstep(0.0,0.08,uv.y)*smoothstep(0.0,0.08,1.0-uv.y); col *= 0.25 + 0.75*m;`,
      },
      {
        n: 4,
        name: 'Center punch',
        method: 'Ch.2 inverse vig',
        source: `col *= 0.7 + 0.5 * (1.0 - smoothstep(0.1, 0.7, length(uv-0.5)));`,
      },
    ],
  },
  {
    id: 'idl',
    label: 'IDL',
    title: 'Idle field',
    blurb: 'Quiet backdrop when tip energy fades.',
    defaultVariant: 1,
    defaultEnabled: true,
    variants: [
      {
        n: 1,
        name: 'Soft noise idle',
        method: 'Factory idle',
        source: `idleCol = mix(vec3(0.07), vec3(0.12,0.10,0.18), 0.5+0.5*n);`,
      },
      {
        n: 2,
        name: 'Flat void',
        method: 'Minimal idle',
        source: `idleCol = vec3(0.05);`,
      },
      {
        n: 3,
        name: 'Scanlines',
        method: 'Ch.10 oldschool',
        source: `idleCol = vec3(0.06) + 0.03*step(0.5, fract(uv.y*90.0 + uTime));`,
      },
      {
        n: 4,
        name: 'Drifting fBM',
        method: 'Ch.8 idle fBM',
        source: `float f = fract(sin(dot(uv*4.0+uTime*0.05, vec2(12.1,47.3)))*45321.1); idleCol = mix(vec3(0.05), vec3(0.14,0.12,0.2), f);`,
      },
    ],
  },
];

export function familyById(id: FamilyId): FamilyDef {
  const f = FAMILY_DEFS.find((x) => x.id === id);
  if (!f) throw new Error(`unknown family ${id}`);
  return f;
}
