precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uTipCount;
uniform vec2 uTips[10];
uniform float uTipEnergy[10];
// 0 = off, else 1-based variant index per family
uniform float uDst;
uniform float uWav;
uniform float uWrp;
uniform float uNze;
uniform float uGrd;
uniform float uLit;
uniform float uVig;
uniform float uIdl;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  return hash21(floor(p) + fract(p) * 0.01 + floor(p));
}

// cheap value-ish
float vn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm3(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  for (int o = 0; o < 3; o++) {
    f += a * vn(p);
    p *= 2.03;
    a *= 0.5;
  }
  return f;
}

float voronoiEdge(vec2 q) {
  vec2 g = floor(q);
  vec2 f = fract(q);
  float md = 1.0;
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++) {
    vec2 b = vec2(float(i), float(j));
    vec2 o = vec2(hash21(g + b), hash21((g + b) * 1.37));
    md = min(md, length(b + o - f));
  }
  return 1.0 - smoothstep(0.0, 0.25, md);
}

vec3 gradeCosine(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv;

  float field = 0.0;
  float nearest = 1e9;
  float count = uTipCount;
  vec2 tip0 = uTips[0];
  float e0 = uTipEnergy[0];

  // —— DST + WAV accumulate around tips ——
  for (int i = 0; i < 10; i++) {
    float active = step(float(i) + 0.5, count);
    vec2 tip = uTips[i];
    float e = uTipEnergy[i];
    vec2 d = p - tip;
    float r = length(d) + 1e-4;
    nearest = mix(nearest, min(nearest, r), active);

    float dst = 0.0;
    if (uDst > 0.5 && uDst < 1.5) {
      dst = (0.018 + 0.022 * e) / (r * r + 0.018);
    } else if (uDst > 1.5 && uDst < 2.5) {
      float sd = r - (0.04 + 0.03 * e);
      dst = 1.0 - smoothstep(0.0, 0.08, sd);
      dst *= 0.08;
    } else if (uDst > 2.5 && uDst < 3.5) {
      float bx = max(abs(d.x), abs(d.y));
      dst = 0.04 / (bx * bx + 0.02);
    } else if (uDst > 3.5 && uDst < 4.5) {
      dst = e * exp(-18.0 * r * r);
    } else if (uDst > 4.5 && uDst < 5.5) {
      float shell = abs(r - 0.07);
      dst = e * (1.0 - smoothstep(0.0, 0.04, shell)) * 0.12;
    }

    float wav = 0.0;
    if (uWav > 0.5 && uWav < 1.5) {
      wav = 0.12 * sin(14.0 * r - uTime * 1.6 - e * 4.0) * exp(-5.5 * r) * (0.35 + e);
    } else if (uWav > 1.5 && uWav < 2.5) {
      wav = 0.1 * sin(7.0 * r - uTime * 0.7) * exp(-3.5 * r) * e;
    } else if (uWav > 2.5 && uWav < 3.5) {
      float m = sin(uTime * 0.8 + e * 3.0);
      wav = 0.1 * sin(12.0 * r - uTime * 2.0 + 2.0 * m) * exp(-5.0 * r);
    } else if (uWav > 3.5 && uWav < 4.5) {
      wav = 0.08 * sin(16.0 * r) * cos(uTime * 1.2) * exp(-4.0 * r) * e;
    }

    field += active * (dst + wav);
  }

  // —— WRP domain ——
  vec2 q = p;
  vec2 d0 = p - tip0;
  float r0 = length(d0) + 1e-4;
  if (uWrp > 0.5 && uWrp < 1.5) {
    q.x += 0.025 * sin(7.0 * p.y + uTime * 0.7 + field * 1.4);
    q.y += 0.025 * cos(7.0 * p.x - uTime * 0.5);
  } else if (uWrp > 1.5 && uWrp < 2.5) {
    q += step(0.5, count) * 0.06 * e0 * (d0 / r0) * exp(-4.0 * r0);
  } else if (uWrp > 2.5 && uWrp < 3.5) {
    float a = atan(d0.y, d0.x) + step(0.5, count) * 0.8 * e0 * exp(-3.0 * r0);
    q = tip0 + r0 * vec2(cos(a), sin(a));
  } else if (uWrp > 3.5 && uWrp < 4.5) {
    float h = hash21(p * 10.0);
    q += (h - 0.5) * 0.04 * (0.3 + field);
  }

  // —— NZE secondary ——
  float warped = 0.0;
  if (uNze > 0.5) {
    for (int i = 0; i < 10; i++) {
      float active = step(float(i) + 0.5, count);
      vec2 tip = uTips[i];
      float e = uTipEnergy[i];
      float rr = length(q - tip) + 1e-4;
      if (uNze < 1.5) {
        warped += active * ((0.012 + 0.018 * e) / (rr + 0.05));
      } else if (uNze < 2.5) {
        warped += active * 0.08 * hash21(q * 6.0) * e;
      }
    }
    if (uNze > 2.5 && uNze < 3.5) {
      warped += 0.1 * fbm3(q * 3.0);
    } else if (uNze > 3.5 && uNze < 4.5) {
      warped += 0.12 * voronoiEdge(q * 5.0);
    } else if (uNze > 4.5 && uNze < 5.5) {
      vec2 c = fract(q * 8.0) - 0.5;
      warped += 0.06 * exp(-30.0 * dot(c, c));
    }
  }

  float t = field * 0.45 + warped * 0.7 + 0.1 * sin(uTime * 0.25);

  // —— GRD ——
  vec3 col = vec3(t * 0.55 + 0.08);
  if (uGrd > 0.5 && uGrd < 1.5) {
    col = gradeCosine(
      t,
      vec3(0.20, 0.18, 0.28),
      vec3(0.55, 0.35, 0.70),
      vec3(0.90, 0.55, 0.25),
      vec3(0.15, 0.65, 0.85)
    );
  } else if (uGrd > 1.5 && uGrd < 2.5) {
    col = gradeCosine(
      t,
      vec3(0.50, 0.20, 0.05),
      vec3(0.50, 0.35, 0.15),
      vec3(1.00, 0.80, 0.40),
      vec3(0.00, 0.20, 0.50)
    );
  } else if (uGrd > 2.5 && uGrd < 3.5) {
    col = gradeCosine(
      t,
      vec3(0.10, 0.15, 0.25),
      vec3(0.30, 0.45, 0.55),
      vec3(0.60, 0.80, 1.00),
      vec3(0.30, 0.50, 0.70)
    );
  } else if (uGrd > 3.5 && uGrd < 4.5) {
    col = vec3(t * 0.55 + 0.08);
  } else if (uGrd > 4.5 && uGrd < 5.5) {
    float z = step(0.5, fract(t * 4.0));
    col = mix(vec3(0.08), vec3(0.85, 0.80, 0.70), z);
  }

  // —— LIT ——
  if (uLit > 0.5 && uLit < 1.5) {
    col += vec3(1.0, 0.85, 0.55) * exp(-55.0 * nearest) * 0.45 * step(0.5, count);
  } else if (uLit > 1.5 && uLit < 2.5) {
    col += vec3(0.9, 0.75, 1.0) * exp(-18.0 * nearest) * 0.35 * step(0.5, count);
  } else if (uLit > 2.5 && uLit < 3.5) {
    col *= 0.55 + 0.45 * smoothstep(0.0, 0.35, nearest);
  } else if (uLit > 3.5 && uLit < 4.5) {
    col += vec3(0.6, 0.8, 1.0) * pow(1.0 - exp(-8.0 * nearest), 3.0) * 0.25 * step(0.5, count);
  }

  // —— VIG ——
  if (uVig > 0.5 && uVig < 1.5) {
    col *= 0.35 + 0.65 * smoothstep(1.2, 0.25, length(uv - 0.5));
  } else if (uVig > 1.5 && uVig < 2.5) {
    col = mix(col, vec3(0.12, 0.12, 0.16), smoothstep(0.2, 1.0, uv.y) * 0.55);
  } else if (uVig > 2.5 && uVig < 3.5) {
    float m = smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.08, 1.0 - uv.y);
    col *= 0.25 + 0.75 * m;
  } else if (uVig > 3.5 && uVig < 4.5) {
    col *= 0.7 + 0.5 * (1.0 - smoothstep(0.1, 0.7, length(uv - 0.5)));
  }

  // —— IDL ——
  float energySum = 0.0;
  for (int i = 0; i < 10; i++) {
    energySum += step(float(i) + 0.5, count) * uTipEnergy[i];
  }
  float idleAmt = 1.0 - smoothstep(0.02, 0.12, energySum);
  float n = sin(uv.x * 12.0 + uTime * 0.3) * sin(uv.y * 10.0 - uTime * 0.25);
  vec3 idleCol = mix(vec3(0.07, 0.07, 0.10), vec3(0.12, 0.10, 0.18), 0.5 + 0.5 * n);
  if (uIdl > 1.5 && uIdl < 2.5) {
    idleCol = vec3(0.05);
  } else if (uIdl > 2.5 && uIdl < 3.5) {
    idleCol = vec3(0.06) + 0.03 * step(0.5, fract(uv.y * 90.0 + uTime));
  } else if (uIdl > 3.5 && uIdl < 4.5) {
    float f = hash21(uv * 4.0 + uTime * 0.05);
    idleCol = mix(vec3(0.05), vec3(0.14, 0.12, 0.20), f);
  }
  float idleMix = idleAmt * step(0.5, uIdl);
  col = mix(col, idleCol, idleMix);

  gl_FragColor = vec4(col, 1.0);
}
