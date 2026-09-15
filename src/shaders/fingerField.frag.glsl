precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uPortal; // 1 explore, 2 maze, 3 water
uniform float uExplore[7]; // jungle mtns valley river day night rain
uniform float uMaze; // 1..7
uniform float uWater; // 1..5
uniform vec3 uCamPos;
uniform vec3 uCamFwd;
uniform vec3 uCamRight;
uniform vec3 uCamUp;

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
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return f;
}
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
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

float terrainH(vec2 p) {
  float h = fbm(p * 0.15) * 2.2;
  if (uExplore[1] > 0.5) h += fbm(p * 0.05) * 4.5; // mountains
  if (uExplore[2] > 0.5) h *= 0.55; // valley softens
  if (uExplore[3] > 0.5) {
    float river = abs(p.x + sin(p.y * 0.15) * 3.0);
    h -= exp(-river * river * 0.08) * 1.1;
  }
  return h;
}

float treeField(vec3 p) {
  vec2 id = floor(p.xz / 3.0);
  vec2 o = id * 3.0 + 1.5;
  float rnd = hash21(id);
  if (rnd < 0.45) return 100.0;
  vec3 q = p - vec3(o.x, 0.0, o.y);
  float trunc = sdCapsule(q, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.4 + rnd, 0.0), 0.12);
  float crown = sdSphere(q - vec3(0.0, 1.6 + rnd, 0.0), 0.7 + 0.3 * rnd);
  return smin(trunc, crown, 0.2);
}

float mapExplore(vec3 p) {
  float d = p.y - terrainH(p.xz);
  if (uExplore[0] > 0.5) d = min(d, treeField(p));
  return d;
}

float mapMaze(vec3 p) {
  // domain walls
  vec3 q = p;
  vec2 c = floor(q.xz);
  vec2 f = fract(q.xz) - 0.5;
  float wall = 100.0;
  float hx = step(0.5, abs(mod(c.x, 2.0)));
  float hz = step(0.5, abs(mod(c.y, 2.0)));
  if (hx > 0.5) wall = min(wall, abs(f.x) - 0.18);
  if (hz > 0.5) wall = min(wall, abs(f.y) - 0.18);
  float d = max(wall, -p.y);
  d = min(d, p.y); // floor
  d = min(d, 2.2 - p.y); // ceiling soft

  float theme = uMaze;
  if (theme > 1.5 && theme < 2.5) {
    d = min(d, treeField(p * vec3(1.0, 1.0, 1.0)));
  } else if (theme > 2.5 && theme < 3.5) {
    float rock = sdBox(vec3(f.x, p.y - 0.6, f.y), vec3(0.35, 0.6, 0.35));
    rock += fbm(p.xz) * 0.08;
    d = min(d, rock);
  } else if (theme > 3.5 && theme < 4.5) {
    // steel — sharper walls
    d = max(wall * 0.9, -p.y);
    d = min(d, p.y);
  } else if (theme > 4.5 && theme < 5.5) {
    d = min(d, sdOctahedron(vec3(f.x, p.y - 0.8, f.y), 0.35));
  } else if (theme > 5.5 && theme < 6.5) {
    // cave carve
    float tunnel = length(vec2(length(p.xz * 0.15) - 2.0, p.y - 0.8)) - 0.9;
    d = max(d, -tunnel);
  } else if (theme > 6.5) {
    float path = abs(p.x + sin(p.z * 0.4) * 0.8) - 0.5;
    d = max(d, -max(path, -p.y));
    d = min(d, treeField(p));
  }
  return d;
}

float mapWater(vec3 p) {
  float d = -p.y - 0.2; // water surface from below: stay under y=0
  // floor
  float floorH = -2.6 + fbm(p.xz * 0.2) * 0.4;
  d = min(d, p.y - floorH);

  float theme = uWater;
  if (theme > 1.5 && theme < 2.5) {
    // coral
    vec2 id = floor(p.xz);
    vec2 f = fract(p.xz) - 0.5;
    vec3 q = vec3(f.x, p.y + 2.2, f.y);
    float coral = sdSphere(q - vec3(0.0, 0.3, 0.0), 0.25 + 0.1 * hash21(id));
    coral = smin(coral, sdCapsule(q, vec3(0.0), vec3(0.0, 0.7, 0.0), 0.08), 0.15);
    d = min(d, coral);
  } else if (theme > 2.5 && theme < 3.5) {
    // pacific — sparse
    d = min(d, sdSphere(p - vec3(3.0, -1.5, -4.0), 0.8));
  } else if (theme > 3.5 && theme < 4.5) {
    floorH = -1.2 + fbm(p.xz * 0.35) * 0.2;
    d = min(-p.y - 0.05, p.y - floorH);
  } else if (theme > 4.5) {
    floorH = -2.0 + fbm(p.xz * 0.2) * 0.3;
    d = min(-p.y - 0.1, p.y - floorH);
  }
  return d;
}

float mapScene(vec3 p) {
  if (uPortal < 1.5) return mapExplore(p);
  if (uPortal < 2.5) return mapMaze(p);
  return mapWater(p);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    mapScene(p + e.xyy) - mapScene(p - e.xyy),
    mapScene(p + e.yxy) - mapScene(p - e.yxy),
    mapScene(p + e.yyx) - mapScene(p - e.yyx)
  ));
}

vec3 shadeExplore(vec3 p, vec3 rd, float tHit, vec3 n) {
  float day = uExplore[4];
  float night = uExplore[5];
  vec3 sunDir = normalize(vec3(0.4, 0.8, 0.2));
  if (night > 0.5) sunDir = normalize(vec3(-0.2, 0.55, 0.4));
  float dif = clamp(dot(n, sunDir), 0.0, 1.0);
  vec3 sunCol = day > 0.5 ? vec3(1.0, 0.9, 0.7) : vec3(0.35, 0.45, 0.75);
  vec3 skyCol = day > 0.5 ? vec3(0.4, 0.55, 0.85) : vec3(0.05, 0.07, 0.14);
  vec3 albedo = vec3(0.2, 0.35, 0.15);
  if (p.y - terrainH(p.xz) < 0.08) albedo = vec3(0.25, 0.4, 0.18);
  if (uExplore[3] > 0.5) {
    float river = abs(p.x + sin(p.z * 0.15) * 3.0);
    if (river < 2.2) albedo = mix(albedo, vec3(0.15, 0.25, 0.35), 0.7);
  }
  vec3 col = albedo * (sunCol * dif + skyCol * (0.35 + 0.4 * n.y));
  float fog = 1.0 - exp(-0.012 * tHit * tHit);
  col = mix(col, skyCol, fog * 0.75);
  return col;
}

vec3 shadeMaze(vec3 p, vec3 rd, float tHit, vec3 n) {
  vec3 l = normalize(vec3(0.3, 0.9, 0.2));
  float dif = clamp(dot(n, l), 0.0, 1.0);
  vec3 albedo = vec3(0.35, 0.32, 0.28);
  if (uMaze > 3.5 && uMaze < 4.5) albedo = vec3(0.55, 0.58, 0.62);
  if (uMaze > 4.5 && uMaze < 5.5) albedo = vec3(0.55, 0.75, 0.9);
  if (uMaze > 5.5 && uMaze < 6.5) albedo = vec3(0.2, 0.18, 0.16);
  vec3 col = albedo * (dif * 0.9 + 0.2);
  if (uMaze > 3.5 && uMaze < 4.5) {
    vec3 h = normalize(l - rd);
    col += pow(clamp(dot(n, h), 0.0, 1.0), 48.0) * 0.4;
  }
  col = mix(col, vec3(0.05), 1.0 - exp(-0.03 * tHit * tHit));
  return col;
}

vec3 shadeWater(vec3 p, vec3 rd, float tHit, vec3 n) {
  vec3 deep = vec3(0.02, 0.08, 0.16);
  vec3 mid = vec3(0.05, 0.25, 0.35);
  if (uWater > 3.5 && uWater < 4.5) { deep = vec3(0.05, 0.15, 0.08); mid = vec3(0.1, 0.35, 0.2); }
  if (uWater > 2.5 && uWater < 3.5) { deep = vec3(0.01, 0.04, 0.12); mid = vec3(0.03, 0.12, 0.28); }
  float caust = 0.55 + 0.45 * sin(p.x * 3.0 + uTime) * sin(p.z * 2.5 - uTime * 0.7);
  float dif = clamp(dot(n, normalize(vec3(0.2, 1.0, 0.3))), 0.0, 1.0);
  vec3 col = mix(deep, mid, caust) * (0.4 + 0.6 * dif);
  if (uWater > 1.5 && uWater < 2.5) col += vec3(0.4, 0.2, 0.15) * exp(-3.0 * abs(mapWater(p)));
  float beer = 1.0 - exp(-0.25 * tHit);
  col = mix(col, deep, beer);
  // godrays
  float rays = pow(clamp(dot(rd, vec3(0.0, 1.0, 0.0)), 0.0, 1.0), 4.0);
  col += mid * rays * 0.15;
  return col;
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution.xy) / uResolution.y;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uv.x * uCamRight + uv.y * uCamUp + 1.5 * uCamFwd);

  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 72; i++) {
    float h = mapScene(ro + rd * t);
    if (h < 0.002) { hit = 1.0; break; }
    t += h;
    if (t > 60.0) break;
  }

  vec3 sky = vec3(0.4, 0.55, 0.85);
  if (uPortal < 1.5 && uExplore[5] > 0.5) sky = vec3(0.02, 0.03, 0.08);
  if (uPortal > 2.5) sky = vec3(0.02, 0.1, 0.16);
  if (uPortal > 1.5 && uPortal < 2.5) sky = vec3(0.04, 0.04, 0.05);

  vec3 col = sky;
  if (uPortal < 1.5) {
    col = mix(sky, sky * 1.1, 0.5 + 0.5 * rd.y);
  }

  if (hit > 0.5) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    if (uPortal < 1.5) col = shadeExplore(p, rd, t, n);
    else if (uPortal < 2.5) col = shadeMaze(p, rd, t, n);
    else col = shadeWater(p, rd, t, n);
  }

  // rain streaks (explore)
  if (uPortal < 1.5 && uExplore[6] > 0.5) {
    vec2 suv = gl_FragCoord.xy / uResolution.xy;
    float streaks = step(0.97, fract(suv.x * 80.0 + suv.y * 20.0 - uTime * 3.0));
    col = mix(col, col * 0.7 + vec3(0.15), streaks * 0.35);
  }

  col = pow(max(col, 0.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
