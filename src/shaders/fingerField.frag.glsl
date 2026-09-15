precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uTipCount;
uniform vec2 uTips[10];
uniform float uTipEnergy[10];
uniform vec3 uTint;
// 0=off, else 1-based variant
uniform float uMarch;
uniform float uSdf;
uniform float uCsg;
uniform float uNoise;
uniform float uLight;
uniform float uFog;
uniform float uFract;
uniform float uDeform;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * vn(p);
    p = p * 2.02 + vec2(100.0);
    a *= 0.5;
  }
  return f;
}

// —— IQ Noise / NZE helpers (Ch.8 p16–p22, Recipe B) ——
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}
float fbmG(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    f += a * gnoise(p);
    p = p * 2.02 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return f;
}
// voronoi: (F1, F2-F1 edge) — p20–p22 spirit
vec2 voronoi(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float md = 8.0;
  float md2 = 8.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(n + g) * 0.5 + 0.5;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md2 = md; md = d; }
    else if (d < md2) { md2 = d; }
  }
  return vec2(sqrt(md), sqrt(md2) - sqrt(md));
}
vec2 tipWarp2(vec2 p) {
  // Ch.15 Recipe B — domain warp from fingertips
  vec2 w = vec2(0.0);
  for (int i = 0; i < 10; i++) {
    if (float(i) >= uTipCount) break;
    vec2 ti = (uTips[i] - 0.5) * 2.4;
    float ei = uTipEnergy[i];
    vec2 d = p - ti;
    float r = length(d) + 1e-3;
    w += normalize(d) * ei * exp(-r * 2.2);
  }
  return w * 0.08;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// —— exact-ish SDFs (IQ distance functions spirit, p1/p10/p11) ——
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float sdOctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x + p.y + p.z - s) * 0.57735027;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 tipWorld(float elev) {
  // tip0 UV → world XZ; energy lifts Y slightly
  float e = uTipEnergy[0];
  vec2 t = uTips[0];
  float alive = step(0.5, uTipCount);
  vec2 xy = mix(vec2(0.0), (t - 0.5) * 2.4, alive);
  return vec3(xy.x, elev + e * 0.35 * alive, xy.y);
}

vec3 tipWorld1(float elev) {
  float e = uTipEnergy[1];
  vec2 t = uTips[1];
  float alive = step(1.5, uTipCount);
  vec2 xy = mix(vec2(0.0), (t - 0.5) * 2.4, alive);
  return vec3(xy.x, elev + e * 0.35 * alive, xy.y);
}

// IQ SDF — exact primitives on uSdf 1..5 (Ch.4 / p1 p10 p11 p54)
float primAt(vec3 p, float mode) {
  float e0 = uTipEnergy[0];
  float r = 0.30 + 0.20 * e0;
  if (mode < 1.5) return sdSphere(p, r);
  if (mode < 2.5) return sdBox(p, vec3(r * 0.88));
  if (mode < 3.5) return sdRoundBox(p, vec3(r * 0.78), 0.05 + 0.08 * e0);
  if (mode < 4.5) {
    // capsule: tip0→tip1 when two tips live, else vertical segment
    vec3 a = vec3(0.0, -0.22 - 0.12 * e0, 0.0);
    vec3 b = vec3(0.0,  0.32 + 0.14 * e0, 0.0);
    if (uTipCount > 1.5) {
      a = vec3(0.0);
      b = tipWorld1(0.15) - tipWorld(0.15);
    }
    return sdCapsule(p, a, b, 0.11 + 0.10 * e0);
  }
  return sdOctahedron(p, r * 1.15);
}

// IQ SDF — CSG ops on uCsg 1..5 (Ch.5 / p50 p51 p56)
float combine(float a, float b, float mode) {
  if (mode < 0.5) return a;
  if (mode < 1.5) return min(a, b); // 1 union
  if (mode < 2.5) {
    float k = 0.16 + 0.28 * uTipEnergy[0];
    return smin(a, b, k); // 2 smooth min (p50)
  }
  if (mode < 3.5) return max(a, -b); // 3 subtraction
  if (mode < 4.5) return max(min(a, b), -max(a, b)); // 4 xor (p56)
  return a; // 5 limited repeat handled in mapScene
}

float limitedRepeatPrim(vec3 p, vec3 tip, float sdfMode) {
  // p51 limited domain repetition around tip
  float s = 0.78;
  vec3 lim = vec3(2.0, 0.0, 2.0);
  vec3 id = clamp(round((p - tip) / s), -lim, lim);
  vec3 q = (p - tip) - id * s;
  return primAt(q, sdfMode);
}

float menger(vec3 p) {
  float d = sdBox(p, vec3(1.0));
  float s = 1.0;
  for (int i = 0; i < 3; i++) {
    vec3 a = mod(p * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float da = max(r.x, r.y);
    float db = max(r.y, r.z);
    float dc = max(r.z, r.x);
    float c = (min(da, min(db, dc)) - 1.0) / s;
    d = max(d, c);
  }
  return d;
}

float mandelbulbDE(vec3 pos) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 6; i++) {
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(clamp(z.z / r, -1.0, 1.0));
    float phi = atan(z.y, z.x);
    dr = pow(r, 7.0) * 8.0 * dr + 1.0;
    float zr = pow(r, 8.0);
    theta *= 8.0;
    phi *= 8.0;
    z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    z += pos;
  }
  return 0.5 * log(r) * r / dr;
}


float juliaDE(vec3 pos, vec3 c) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 6; i++) {
    r = length(z);
    if (r > 2.0) break;
    // quadratic julia-ish in 3D (IQ 3D Julia spirit, p131)
    float x = z.x, y = z.y, zz = z.z;
    float r2 = x*x + y*y;
    dr = 2.0 * length(z) * dr + 1.0;
    z = vec3(x*x - y*y - zz*zz, 2.0*x*y, 2.0*x*zz) + c;
  }
  return 0.5 * log(max(r, 1e-4)) * r / dr;
}

float orbitTrapShade(vec3 pos) {
  // geometric orbit trap distance accent (p132–p135)
  vec3 z = pos;
  float trap = 1e3;
  for (int i = 0; i < 8; i++) {
    float r = length(z);
    if (r > 2.0) break;
    trap = min(trap, length(z.xy));
    float x = z.x, y = z.y, zz = z.z;
    z = vec3(x*x - y*y - zz*zz, 2.0*x*y, 2.0*x*zz) + pos * 0.35;
  }
  return trap;
}


float mapScene(vec3 p) {
  // deform
  if (uDeform > 0.5 && uDeform < 1.5) {
    p.xz *= rot(p.y * 0.9);
  } else if (uDeform > 1.5 && uDeform < 2.5) {
    float k = 0.45;
    float c = cos(k * p.x);
    float s = sin(k * p.x);
    p.xy = mat2(c, -s, s, c) * p.xy;
  } else if (uDeform > 4.5) {
    p.xy = abs(p.xy);
  }

  vec3 tip = tipWorld(0.15);
  vec3 tip1 = tipWorld1(0.15);
  float sdfMode = max(uSdf, 1.0);
  float dPrimary = primAt(p - tip, sdfMode);

  // second operand: tip1 prim when live, else offset cutter sphere
  float dSec = primAt(p - tip1, sdfMode);
  if (uTipCount < 1.5) {
    dSec = sdSphere(p - (tip + vec3(0.42, 0.06, 0.16)), 0.22 + 0.12 * uTipEnergy[0]);
  }

  float d = dPrimary;
  if (uMarch > 0.5 && uMarch < 1.5) {
    d = min(sdSphere(p - tip, 0.36), p.y + 0.75);
  } else if (uMarch > 1.5 && uMarch < 2.5) {
    vec3 c1 = tip + vec3(0.35, 0.05, 0.1);
    vec3 c2 = tip + vec3(-0.3, -0.05, 0.15);
    d = smin(sdSphere(p - tip, 0.32), sdSphere(p - c1, 0.24), 0.3);
    d = smin(d, sdSphere(p - c2, 0.22), 0.28);
    d = min(d, p.y + 0.75);
  } else if (uMarch > 2.5 && uMarch < 3.5) {
    vec3 q = p;
    q.xz = mod(q.xz + 0.5, 1.0) - 0.5;
    d = sdBox(q - vec3(0.0, 0.55, 0.0), vec3(0.18, 0.55, 0.18));
    d = min(d, p.y + 0.75);
  } else if (uMarch > 3.5 && uMarch < 4.5) {
    d = max(sdTorus(p - vec3(0.0, 0.2, 0.0), vec2(0.55, 0.12)), -sdBox(p - vec3(0.0, 0.2, 0.0), vec3(0.35, 0.2, 0.35)));
    d = min(d, p.y + 0.75);
    d = min(d, sdSphere(p - tip, 0.2));
  } else if (uMarch > 4.5 && uMarch < 5.5) {
    float h = fbm(p.xz * 0.9 + uTime * 0.03) * 0.45;
    d = p.y + 0.55 - h;
  } else {
    // march off: floor + primary (CSG applied below)
    d = min(dPrimary, p.y + 0.85);
  }

  // IQ SDF — apply uCsg 1…5 after march/sdf base (Ch.5)
  if (uCsg > 0.5 && uCsg < 4.5) {
    d = combine(d, dSec, uCsg);
  } else if (uCsg > 4.5) {
    d = min(d, limitedRepeatPrim(p, tip, sdfMode));
  }

  // IQ Noise — uNoise 1…5 (Ch.8). Leaves sdf/light/march/csg/fract alone.
  if (uNoise > 0.5 && uNoise < 1.5) {
    // 1 fBM displacement — p16
    d -= 0.08 * fbm(p * 2.0 + uTime * 0.05);
  } else if (uNoise > 1.5 && uNoise < 2.5) {
    // 2 Domain warp — p19
    vec3 q = p + 0.28 * vec3(
      fbm(p.yz * 1.4 + 0.1),
      fbm(p.zx * 1.4 + 2.3),
      fbm(p.xy * 1.4 + 4.7)
    );
    d = min(d, primAt(q - tip, max(uSdf, 1.0)));
  } else if (uNoise > 2.5 && uNoise < 3.5) {
    // 3 Voronoi cells — p20–p22
    vec2 cell = voronoi(p.xz * 3.5 + tip.xz * 0.5);
    float ridge = smoothstep(0.0, 0.12, cell.y);
    d = min(d, length(p - tip) - 0.18 - 0.12 * (1.0 - cell.x));
    d = mix(d, d - 0.04 * ridge, 0.85);
  } else if (uNoise > 3.5 && uNoise < 4.5) {
    // 4 Gradient noise — p17
    float n = gnoise(p.xz * 2.5 + uTime * 0.08);
    d -= 0.1 * n;
    d = min(d, length(p - tip) - (0.22 + 0.08 * n));
  } else if (uNoise > 4.5 && uNoise < 5.5) {
    // 5 Warped marble — Ch.15 Recipe B
    vec2 xz = p.xz + tipWarp2(p.xz);
    float m = fbmG(xz * 1.8);
    vec2 q2 = xz + 0.55 * vec2(m, fbmG(xz.yx + 3.1));
    float bands = sin(6.0 * q2.x + 4.0 * q2.y + uTime * 0.4);
    d -= 0.05 * bands;
    d = min(d, length(p - tip) - 0.2);
  }

  if (uFract > 0.5 && uFract < 1.5) {
    // 1 Mandelbulb DE (p130)
    d = min(d, mandelbulbDE(p * 1.6) * 0.55);
  } else if (uFract > 1.5 && uFract < 2.5) {
    // 2 3D Julia (p131) — tip biases c
    vec3 jc = vec3(-0.2, 0.45, 0.15) + tip * 0.15;
    d = min(d, juliaDE(p * 1.35, jc) * 0.55);
  } else if (uFract > 2.5 && uFract < 3.5) {
    // 3 orbit trap field (p132–p135)
    float ot = orbitTrapShade(p * 1.2);
    d = min(d, ot - 0.04);
  } else if (uFract > 3.5 && uFract < 4.5) {
    // 4 Menger (p62)
    d = min(d, menger(p * 0.7) * 0.7);
  } else if (uFract > 4.5) {
    // 5 hybrid bulb + tip sphere (Ch.11)
    d = smin(d, mandelbulbDE((p - tip) * 1.4) * 0.5, 0.2);
  } else if (uFract > 3.5 && uFract < 4.5) {
    d = min(d, menger(p * 0.7) * 0.7);
  } else if (uFract > 4.5) {
    d = smin(d, mandelbulbDE((p - tip) * 1.4) * 0.5, 0.2);
  }

  return d;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    mapScene(p + e.xyy) - mapScene(p - e.xyy),
    mapScene(p + e.yxy) - mapScene(p - e.yxy),
    mapScene(p + e.yyx) - mapScene(p - e.yyx)
  ));
}

float softShadow(vec3 ro, vec3 rd) {
  // Quilez soft shadows (p24 / p52) — k controls penumbra width
  float res = 1.0;
  float t = 0.02;
  float k = 18.0;
  for (int i = 0; i < 48; i++) {
    float h = mapScene(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.015, 0.25);
    if (res < 0.005 || t > 10.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n) {
  // Multires SDF AO spirit (p80–p83) — near + mid cavities
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.15 * float(i) / 4.0;
    float d = mapScene(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.85;
  }
  // second coarser shell
  float occ2 = 0.0;
  sca = 1.0;
  for (int i = 0; i < 3; i++) {
    float h = 0.08 + 0.35 * float(i) / 2.0;
    float d = mapScene(p + h * n);
    occ2 += (h - d) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - 2.2 * occ - 0.55 * occ2, 0.0, 1.0);
}

vec3 paletteIQ(float t) {
  return vec3(0.20, 0.18, 0.28) + vec3(0.55, 0.35, 0.70) * cos(6.28318 * (vec3(0.90, 0.55, 0.25) * t + vec3(0.15, 0.65, 0.85)));
}

vec3 shade(vec3 p, vec3 rd, float tHit) {
  // IQ Light — uLight 1…5 (Ch.7). Leaves uFog / uSdf / uNoise / uMarch alone.
  vec3 n = calcNormal(p);
  vec3 tip = tipWorld(1.2);
  vec3 l = normalize(tip - p);
  if (uTipCount < 0.5) l = normalize(vec3(0.4, 0.8, 0.3));

  float dif = clamp(dot(n, l), 0.0, 1.0);
  float sh = 1.0;
  float ao = 1.0;
  float mode = uLight;
  float fogAmt = 0.0;
  vec3 fogCol = mix(vec3(0.55, 0.65, 0.85), uTint, 0.25);

  // 1 outdoors / 3 soft-shadow focus / default-on: softShadow (p24, p52)
  if (mode > 0.5 && mode < 1.5) {
    sh = mix(1.0, softShadow(p + n * 0.02, l), 0.9);
    ao = mix(1.0, calcAO(p, n), 0.65);
  } else if (mode > 2.5 && mode < 3.5) {
    sh = softShadow(p + n * 0.02, l);
    ao = mix(1.0, calcAO(p, n), 0.35);
  } else if (mode > 3.5 && mode < 4.5) {
    // 4 multires AO focus (p80–p83)
    sh = mix(1.0, softShadow(p + n * 0.02, l), 0.45);
    ao = calcAO(p, n);
  } else if (mode > 1.5 && mode < 2.5) {
    // 2 colored-fog path still needs mild key occlusion
    sh = mix(1.0, softShadow(p + n * 0.02, l), 0.55);
    ao = mix(1.0, calcAO(p, n), 0.5);
  } else if (mode > 4.5 && mode < 5.5) {
    // 5 GI sketch — softer key, richer bounce
    sh = mix(1.0, softShadow(p + n * 0.02, l), 0.5);
    ao = mix(1.0, calcAO(p, n), 0.8);
  } else if (mode < 0.5) {
    sh = 1.0;
    ao = 1.0;
  }

  vec3 sunCol = vec3(1.0, 0.88, 0.68) * mix(vec3(1.0), uTint, 0.45);
  vec3 skyCol = vec3(0.32, 0.42, 0.78) * mix(vec3(1.0), uTint, 0.3);
  vec3 bounceCol = vec3(0.55, 0.42, 0.28) * mix(vec3(1.0), uTint, 0.5);

  // p78 outdoors three-light spirit — key / sky / bounce, none dominates
  vec3 key = sunCol * dif * sh;
  vec3 sky = skyCol * (0.40 + 0.60 * clamp(n.y * 0.5 + 0.5, 0.0, 1.0));
  vec3 ind = bounceCol * ao * (0.30 + 0.40 * clamp(-n.y, 0.0, 1.0));
  vec3 h = normalize(l - rd);
  float spe = pow(clamp(dot(n, h), 0.0, 1.0), 48.0) * sh;
  vec3 col = key + sky * ao + ind;
  if (mode > 0.5 && mode < 1.5) {
    col += sunCol * spe * 0.22;
  }

  if (mode > 4.5 && mode < 5.5) {
    // p81 / p84 GI sketch — directional bounce toward -l hemisphere
    vec3 bounceDir = normalize(vec3(-l.x, abs(l.y) * 0.35 + 0.2, -l.z));
    float gi = 0.5 + 0.5 * clamp(dot(n, bounceDir), 0.0, 1.0);
    col += bounceCol * ao * gi * 0.55;
    col += skyCol * pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.0) * 0.12;
  }

  if (mode > 3.5 && mode < 4.5) {
    // AO-led look: crush fill in cavities
    col *= 0.4 + 0.6 * ao;
  }

  if (mode > 2.5 && mode < 3.5) {
    // Soft-shadow showcase: deepen penumbra contrast
    col = mix(col * 0.28, col, mix(0.15, 1.0, sh));
    col += key * 0.15;
  }

  // material tint
  col *= mix(paletteIQ(0.35 + 0.4 * n.y), uTint, 0.35);
  // IQ Noise shade accents (NZE only)
  if (uNoise > 4.5 && uNoise < 5.5) {
    vec2 xz = p.xz + tipWarp2(p.xz);
    float m = fbmG(xz * 1.8);
    vec2 q2 = xz + 0.55 * vec2(m, fbmG(xz.yx + 3.1));
    float bands = 0.5 + 0.5 * sin(6.0 * q2.x + 4.0 * q2.y + uTime * 0.4);
    col = mix(col * 0.55, col * vec3(1.15, 1.05, 0.95), bands);
    col = mix(col, uTint, 0.12);
  } else if (uNoise > 2.5 && uNoise < 3.5) {
    float edge = voronoi(p.xz * 3.5).y;
    col *= 0.75 + 0.45 * smoothstep(0.0, 0.15, edge);
  } else if (uNoise > 3.5 && uNoise < 4.5) {
    float n2 = 0.5 + 0.5 * gnoise(p.xz * 2.5);
    col = mix(col, uTint * (0.4 + 0.6 * n2), 0.25);
  }

  // LIT[2] colored fog (p79) — owned fog accent; does not write FOG family
  if (mode > 1.5 && mode < 2.5) {
    fogCol = mix(vec3(0.52, 0.62, 0.88), uTint, 0.35);
    float sunDisc = pow(clamp(dot(rd, normalize(tip - vec3(0.0))), 0.0, 1.0), 14.0);
    fogCol += sunCol * sunDisc * 0.55;
    fogAmt = 1.0 - exp(-0.022 * tHit * tHit);
    fogAmt = max(fogAmt, smoothstep(-0.15, 1.1, -p.y) * 0.7);
    col = mix(col, fogCol, clamp(fogAmt, 0.0, 0.92));
  } else if (mode > 0.5 && mode < 1.5) {
    fogCol = mix(vec3(0.55, 0.65, 0.85), uTint, 0.2);
    col = mix(col, fogCol, (1.0 - exp(-0.01 * tHit * tHit)) * 0.35);
  }

  // IQ Light — uFog 1…5 (p79). Does not touch uLight / uSdf / uNoise / uCsg.
  fogAmt = 0.0;
  fogCol = mix(vec3(0.55, 0.65, 0.85), uTint, 0.28);
  if (uFog > 0.5 && uFog < 1.5) {
    // 1 distance fog
    fogAmt = 1.0 - exp(-0.018 * tHit * tHit);
  } else if (uFog > 1.5 && uFog < 2.5) {
    // 2 height fog
    fogAmt = smoothstep(1.1, -0.35, p.y) * 0.85;
    fogCol = mix(fogCol, vec3(0.45, 0.52, 0.62), 0.35);
  } else if (uFog > 2.5 && uFog < 3.5) {
    // 3 sun in fog (p79) — disc + soft halo
    vec3 sunDir = normalize(tip - vec3(0.0));
    float sun = pow(clamp(dot(rd, sunDir), 0.0, 1.0), 18.0);
    float halo = pow(clamp(dot(rd, sunDir), 0.0, 1.0), 4.0);
    fogCol += sunCol * (sun * 1.1 + halo * 0.35);
    fogAmt = 1.0 - exp(-0.024 * tHit * tHit);
  } else if (uFog > 3.5 && uFog < 4.5) {
    // 4 Beer-Lambert density
    float sigma = 0.22 + 0.15 * (1.0 - ao);
    fogAmt = 1.0 - exp(-sigma * tHit);
    fogCol = mix(fogCol, skyCol, 0.25);
  } else if (uFog > 4.5 && uFog < 5.5) {
    // 5 ground haze
    float distF = 1.0 - exp(-0.02 * tHit * tHit);
    float hF = smoothstep(1.0, -0.25, p.y);
    fogAmt = distF * hF;
    fogCol = mix(vec3(0.5, 0.48, 0.42), uTint, 0.4);
  }
  if (uFog > 0.5) {
    col = mix(col, fogCol, clamp(fogAmt, 0.0, 0.95));
  }

  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (2.0 * gl_FragCoord.xy - uResolution.xy) / uResolution.y;

  // polar tunnel deform as 2D background option
  if (uDeform > 2.5 && uDeform < 3.5 && uMarch < 0.5) {
    float r = length(p);
    float a = atan(p.y, p.x);
    vec2 tuv = vec2(a / 3.14159, 0.4 / max(r, 0.05) + uTime * 0.15);
    float bands = sin(tuv.y * 40.0) * sin(tuv.x * 10.0);
    vec3 col = mix(vec3(0.05), uTint, 0.35 + 0.35 * bands);
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // Camera — tip nudges look target (Ch.6 raymarch)
  vec3 ro = vec3(0.0, 0.55, 2.6);
  vec3 ta = tipWorld(0.1) * 0.35;
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(p.x * uu + p.y * vv + 1.6 * ww);

  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 pos = ro + rd * t;
    float h = mapScene(pos);
    if (h < 0.0015) { hit = 1.0; break; }
    t += h;
    if (t > 16.0) break;
  }

  vec3 col = mix(vec3(0.04, 0.05, 0.08), uTint * 0.15, 0.5);
  // gradient sky
  col = mix(vec3(0.02, 0.03, 0.06), mix(vec3(0.35, 0.45, 0.7), uTint, 0.3), 0.55 + 0.45 * rd.y);

  if (hit > 0.5) {
    col = shade(ro + rd * t, rd, t);
  }

  if (uFog > 3.5 && uFog < 4.5) {
    col *= 0.35 + 0.65 * smoothstep(1.2, 0.25, length(uv - 0.5));
  } else if (uFog > 4.5) {
    float m = smoothstep(0.0, 0.1, uv.y) * smoothstep(0.0, 0.1, 1.0 - uv.y);
    col = mix(mix(vec3(0.05), uTint, 0.2), col, 0.25 + 0.75 * m);
  }

  // mild grade
  col = pow(max(col, 0.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
