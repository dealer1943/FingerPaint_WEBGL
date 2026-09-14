precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uTipCount;
uniform vec2 uTips[10];
uniform float uTipEnergy[10];

vec3 palette(float t) {
  vec3 a = vec3(0.20, 0.18, 0.28);
  vec3 b = vec3(0.55, 0.35, 0.70);
  vec3 c = vec3(0.90, 0.55, 0.25);
  vec3 d = vec3(0.15, 0.65, 0.85);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv;

  float field = 0.0;
  float nearest = 1e9;
  float count = uTipCount;

  for (int i = 0; i < 10; i++) {
    float active = step(float(i) + 0.5, count);
    vec2 tip = uTips[i];
    float e = uTipEnergy[i];
    vec2 d = p - tip;
    float r = length(d) + 1e-4;
    float rip = sin(14.0 * r - uTime * 1.6 - e * 4.0) * exp(-5.5 * r);
    float pot = (0.018 + 0.022 * e) / (r * r + 0.018);
    field += active * (pot + 0.12 * rip * (0.35 + e));
    nearest = mix(nearest, min(nearest, r), active);
  }

  vec2 q = p;
  q.x += 0.025 * sin(7.0 * p.y + uTime * 0.7 + field * 1.4);
  q.y += 0.025 * cos(7.0 * p.x - uTime * 0.5);

  float warped = 0.0;
  for (int i = 0; i < 10; i++) {
    float active = step(float(i) + 0.5, count);
    float r = length(q - uTips[i]) + 1e-4;
    warped += active * ((0.012 + 0.018 * uTipEnergy[i]) / (r + 0.05));
  }

  float t = field * 0.45 + warped * 0.7 + 0.1 * sin(uTime * 0.25);
  vec3 col = palette(t);

  float core = exp(-55.0 * nearest);
  col += vec3(1.0, 0.85, 0.55) * core * 0.45 * step(0.5, count);

  float vig = smoothstep(1.2, 0.25, length(uv - 0.5));
  col *= 0.35 + 0.65 * vig;

  // Soft idle when no energy left (count may still be >0 during decay)
  float energySum = 0.0;
  for (int i = 0; i < 10; i++) {
    energySum += step(float(i) + 0.5, count) * uTipEnergy[i];
  }
  float idle = 1.0 - smoothstep(0.02, 0.12, energySum);
  float n = sin(uv.x * 12.0 + uTime * 0.3) * sin(uv.y * 10.0 - uTime * 0.25);
  vec3 idleCol = mix(vec3(0.07, 0.07, 0.10), vec3(0.12, 0.10, 0.18), 0.5 + 0.5 * n);
  col = mix(col, idleCol, idle);

  gl_FragColor = vec4(col, 1.0);
}
