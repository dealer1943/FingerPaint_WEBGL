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
  // map tip UV → world XZ; energy lifts Y slightly
  float e = uTipEnergy[0];
  vec2 t = uTips[0];
  float alive = step(0.5, uTipCount);
  vec2 xy = mix(vec2(0.0), (t - 0.5) * 2.4, alive);
  return vec3(xy.x, elev + e * 0.35 * alive, xy.y);
}

float primAt(vec3 p, float mode) {
  if (mode < 1.5) return sdSphere(p, 0.38);
  if (mode < 2.5) return sdBox(p, vec3(0.32));
  if (mode < 3.5) return sdRoundBox(p, vec3(0.28), 0.08);
  if (mode < 4.5) return sdCapsule(p, vec3(0.0, -0.25, 0.0), vec3(0.0, 0.35, 0.0), 0.16);
  return sdOctahedron(p, 0.42);
}

float combine(float a, float b, float mode) {
  if (mode < 0.5) return a;
  if (mode < 1.5) return min(a, b);
  if (mode < 2.5) return smin(a, b, 0.28);
  if (mode < 3.5) return max(a, -b);
  if (mode < 4.5) return max(min(a, b), -max(a, b));
  // limited repeat helper applied elsewhere
  return min(a, b);
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
  float sdfMode = max(uSdf, 1.0);
  float dPrimary = primAt(p - tip, sdfMode);

  // second shape for CSG
  float dSec = sdSphere(p - vec3(0.55, 0.1, 0.2), 0.28);
  if (uCsg > 4.5) {
    vec3 q = p;
    q.xz = mod(q.xz + 0.5, 1.0) - 0.5;
    dSec = sdBox(q - vec3(0.0, 0.4, 0.0), vec3(0.18, 0.5, 0.18));
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
    // fallback compose SDF + CSG when march off but sdf on
    d = combine(dPrimary, dSec, uCsg);
    d = min(d, p.y + 0.85);
  }

  if (uCsg > 0.5 && uMarch > 0.5 && uMarch < 5.5) {
    // optional second combine with tip primitive
    d = combine(d, dPrimary * 0.999, min(uCsg, 4.0));
  }

  if (uNoise > 0.5 && uNoise < 1.5) {
    d -= 0.06 * fbm(p * 2.2);
  } else if (uNoise > 1.5 && uNoise < 2.5) {
    vec3 q = p + 0.25 * vec3(fbm(p.yz), fbm(p.zx + 2.0), fbm(p.xy + 4.0));
    d = min(d, primAt(q - tip, max(uSdf, 1.0)));
  } else if (uNoise > 2.5 && uNoise < 3.5) {
    float cells = fbm(p.xz * 4.0);
    d = min(d, length(p - tip) - 0.2 - 0.1 * cells);
  }

  if (uFract > 0.5 && uFract < 1.5) {
    d = min(d, mandelbulbDE(p * 1.6) * 0.55);
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
  float res = 1.0;
  float t = 0.02;
  for (int i = 0; i < 24; i++) {
    float h = mapScene(ro + rd * t);
    res = min(res, 16.0 * h / t);
    t += clamp(h, 0.02, 0.2);
    if (res < 0.05 || t > 8.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = mapScene(p + h * n);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 1.5 * occ, 0.0, 1.0);
}

vec3 paletteIQ(float t) {
  return vec3(0.20, 0.18, 0.28) + vec3(0.55, 0.35, 0.70) * cos(6.28318 * (vec3(0.90, 0.55, 0.25) * t + vec3(0.15, 0.65, 0.85)));
}

vec3 shade(vec3 p, vec3 rd, float tHit) {
  vec3 n = calcNormal(p);
  vec3 tip = tipWorld(1.2);
  vec3 l = normalize(tip - p);
  if (uTipCount < 0.5) l = normalize(vec3(0.4, 0.8, 0.3));

  float dif = clamp(dot(n, l), 0.0, 1.0);
  float sh = 1.0;
  float ao = 1.0;
  if (uLight < 0.5 || (uLight > 0.5 && uLight < 2.5) || uLight > 1.5) {
    if (uLight < 0.5 || uLight > 1.5 && uLight < 2.5 || uLight < 1.5) {
      // soft shadow when light mode 1 or 2 or default-ish
    }
  }
  if (uLight < 0.5 || uLight > 0.5) {
    if (uLight < 1.5 || uLight > 1.5 && uLight < 2.5 || uLight < 0.5) {
      sh = (uLight < 0.5 || uLight > 1.5 && uLight < 2.5 || (uLight > 0.5 && uLight < 1.5))
        ? ((uLight > 1.5 && uLight < 2.5) || uLight < 0.5 || (uLight > 0.5 && uLight < 2.5) ? softShadow(p + n * 0.01, l) : 1.0)
        : 1.0;
    }
  }
  // clearer light branching
  sh = 1.0;
  ao = 1.0;
  if (uLight < 0.5 || (uLight > 0.5 && uLight < 1.5) || (uLight > 1.5 && uLight < 2.5)) {
    if (uLight > 1.5 && uLight < 2.5) sh = softShadow(p + n * 0.01, l);
    else if (uLight < 0.5 || (uLight > 0.5 && uLight < 1.5)) sh = mix(1.0, softShadow(p + n * 0.01, l), 0.85);
  }
  if (uLight > 2.5 && uLight < 3.5) ao = calcAO(p, n);
  else if (uLight < 0.5 || (uLight > 0.5 && uLight < 1.5)) ao = mix(1.0, calcAO(p, n), 0.7);

  vec3 sunCol = vec3(1.0, 0.85, 0.65) * uTint;
  vec3 skyCol = vec3(0.35, 0.45, 0.75) * mix(vec3(1.0), uTint, 0.35);
  vec3 fill = skyCol * (0.45 + 0.55 * n.y) * ao;
  vec3 key = sunCol * dif * sh;
  vec3 col = key + fill;

  if (uLight > 3.5 && uLight < 4.5) {
    float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
    col += uTint * rim * 0.35;
  }
  if (uLight > 4.5) {
    vec3 h = normalize(l - rd);
    col += uTint * pow(clamp(dot(n, h), 0.0, 1.0), 64.0) * 0.55;
  }

  // material tint from height / normal
  col *= mix(paletteIQ(0.35 + 0.4 * n.y), uTint, 0.35);

  // fog
  float fogAmt = 0.0;
  vec3 fogCol = mix(vec3(0.55, 0.65, 0.85), uTint, 0.25);
  if (uFog < 0.5 || (uFog > 0.5 && uFog < 1.5)) {
    fogAmt = 1.0 - exp(-0.015 * tHit * tHit);
  }
  if (uFog > 1.5 && uFog < 2.5) {
    fogAmt = max(fogAmt, smoothstep(-0.2, 1.0, -p.y) * 0.65);
  }
  if (uFog > 2.5 && uFog < 3.5) {
    float sun = pow(clamp(dot(rd, normalize(tip - vec3(0.0))), 0.0, 1.0), 16.0);
    fogCol += uTint * sun * 0.6;
    fogAmt = max(fogAmt, 1.0 - exp(-0.02 * tHit * tHit));
  }
  if (uFog > 0.5 || uFog < 0.5) {
    col = mix(col, fogCol, clamp(fogAmt, 0.0, 1.0) * step(0.5, max(uFog, 0.6)));
  }
  // if fog explicitly off
  if (uFog < 0.5) {
    // keep slight depth cue
    col = mix(col, fogCol, (1.0 - exp(-0.008 * tHit * tHit)) * 0.35);
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
