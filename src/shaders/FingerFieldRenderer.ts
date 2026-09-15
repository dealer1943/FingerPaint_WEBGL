import vertSrc from './fullscreen.vert.glsl?raw';
import fragSrc from './fingerField.frag.glsl?raw';
import type { FamilyId } from '../field/ModuleCatalog';

export interface TipUniform {
  x: number;
  y: number;
  energy: number;
}

export type FamilyModes = Record<FamilyId, number>;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || 'compile error';
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

const MODE_UNIFORMS: { id: FamilyId; name: string }[] = [
  { id: 'dst', name: 'uDst' },
  { id: 'wav', name: 'uWav' },
  { id: 'wrp', name: 'uWrp' },
  { id: 'nze', name: 'uNze' },
  { id: 'grd', name: 'uGrd' },
  { id: 'lit', name: 'uLit' },
  { id: 'vig', name: 'uVig' },
  { id: 'idl', name: 'uIdl' },
];

export class FingerFieldRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buf: WebGLBuffer;
  private uResolution: WebGLUniformLocation;
  private uTime: WebGLUniformLocation;
  private uTipCount: WebGLUniformLocation;
  private uTips: WebGLUniformLocation[] = [];
  private uTipEnergy: WebGLUniformLocation[] = [];
  private uModes = new Map<FamilyId, WebGLUniformLocation>();
  private modes: FamilyModes = {
    dst: 1, wav: 1, wrp: 1, nze: 1, grd: 1, lit: 1, vig: 1, idl: 1,
  };
  private start = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    if (!prog) throw new Error('createProgram failed');
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'link error');
    }
    this.program = prog;

    const buf = gl.createBuffer();
    if (!buf) throw new Error('createBuffer failed');
    this.buf = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const loc = gl.getUniformLocation(prog, 'uResolution');
    const ut = gl.getUniformLocation(prog, 'uTime');
    const uc = gl.getUniformLocation(prog, 'uTipCount');
    if (!loc || !ut || !uc) throw new Error('missing uniforms');
    this.uResolution = loc;
    this.uTime = ut;
    this.uTipCount = uc;

    for (const m of MODE_UNIFORMS) {
      const u = gl.getUniformLocation(prog, m.name);
      if (!u) throw new Error(`missing ${m.name}`);
      this.uModes.set(m.id, u);
    }

    for (let i = 0; i < 10; i++) {
      const tip = gl.getUniformLocation(prog, `uTips[${i}]`);
      const en = gl.getUniformLocation(prog, `uTipEnergy[${i}]`);
      if (!tip || !en) throw new Error(`missing tip uniform ${i}`);
      this.uTips.push(tip);
      this.uTipEnergy.push(en);
    }

    this.resize();
  }

  setModes(modes: FamilyModes): void {
    this.modes = { ...modes };
  }

  /** @deprecated use setModes */
  setModules(enables: Record<string, boolean>): void {
    const next = { ...this.modes };
    (Object.keys(enables) as string[]).forEach((k) => {
      const id = k as FamilyId;
      if (id in next) next[id] = enables[k] ? Math.max(1, next[id] || 1) : 0;
    });
    this.modes = next;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = `${window.innerWidth}px`;
      this.canvas.style.height = `${window.innerHeight}px`;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(tips: TipUniform[]): void {
    const gl = this.gl;
    this.resize();
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uTime, (performance.now() - this.start) / 1000);

    for (const m of MODE_UNIFORMS) {
      const loc = this.uModes.get(m.id);
      if (loc) gl.uniform1f(loc, this.modes[m.id] ?? 0);
    }

    const n = Math.min(10, tips.length);
    gl.uniform1f(this.uTipCount, n);
    for (let i = 0; i < 10; i++) {
      if (i < n) {
        gl.uniform2f(this.uTips[i], tips[i].x, tips[i].y);
        gl.uniform1f(this.uTipEnergy[i], tips[i].energy);
      } else {
        gl.uniform2f(this.uTips[i], -1, -1);
        gl.uniform1f(this.uTipEnergy[i], 0);
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
