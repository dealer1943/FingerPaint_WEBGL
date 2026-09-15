import vertSrc from './fullscreen.vert.glsl?raw';
import fragSrc from './fingerField.frag.glsl?raw';

export interface CamUniforms {
  pos: [number, number, number];
  fwd: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
}

export interface PortalUniforms {
  portal: number;
  explore: number[];
  maze: number;
  water: number;
}

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

export class FingerFieldRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buf: WebGLBuffer;
  private uResolution: WebGLUniformLocation;
  private uTime: WebGLUniformLocation;
  private uPortal: WebGLUniformLocation;
  private uExplore: WebGLUniformLocation;
  private uMaze: WebGLUniformLocation;
  private uWater: WebGLUniformLocation;
  private uCamPos: WebGLUniformLocation;
  private uCamFwd: WebGLUniformLocation;
  private uCamRight: WebGLUniformLocation;
  private uCamUp: WebGLUniformLocation;
  private portal: PortalUniforms = {
    portal: 1,
    explore: [1, 1, 0, 1, 1, 0, 0],
    maze: 1,
    water: 1,
  };
  private cam: CamUniforms = {
    pos: [0, 1.4, 5.5],
    fwd: [0, 0, -1],
    right: [1, 0, 0],
    up: [0, 1, 0],
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

    const need = (name: string) => {
      const u = gl.getUniformLocation(prog, name);
      if (!u) throw new Error(`missing ${name}`);
      return u;
    };
    this.uResolution = need('uResolution');
    this.uTime = need('uTime');
    this.uPortal = need('uPortal');
    this.uExplore = need('uExplore[0]');
    this.uMaze = need('uMaze');
    this.uWater = need('uWater');
    this.uCamPos = need('uCamPos');
    this.uCamFwd = need('uCamFwd');
    this.uCamRight = need('uCamRight');
    this.uCamUp = need('uCamUp');

    this.resize();
  }

  setPortal(u: PortalUniforms): void {
    this.portal = {
      portal: u.portal,
      explore: u.explore.slice(0, 7),
      maze: u.maze,
      water: u.water,
    };
  }

  setCamera(c: CamUniforms): void {
    this.cam = c;
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

  render(): void {
    const gl = this.gl;
    this.resize();
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uTime, (performance.now() - this.start) / 1000);
    gl.uniform1f(this.uPortal, this.portal.portal);
    const ex = this.portal.explore;
    while (ex.length < 7) ex.push(0);
    gl.uniform1fv(this.uExplore, new Float32Array(ex));
    gl.uniform1f(this.uMaze, this.portal.maze);
    gl.uniform1f(this.uWater, this.portal.water);
    gl.uniform3f(this.uCamPos, this.cam.pos[0], this.cam.pos[1], this.cam.pos[2]);
    gl.uniform3f(this.uCamFwd, this.cam.fwd[0], this.cam.fwd[1], this.cam.fwd[2]);
    gl.uniform3f(this.uCamRight, this.cam.right[0], this.cam.right[1], this.cam.right[2]);
    gl.uniform3f(this.uCamUp, this.cam.up[0], this.cam.up[1], this.cam.up[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
