import { blocks, type Game, type GameEvent } from "../engine/game";
import { PIECE_NAMES } from "../engine/pieces";
export const vertex = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
// Constant 3x3 sampling: cost is independent of the number of occupied cells.
export const fragment = `precision mediump float;
uniform sampler2D uGrid; uniform vec2 uSize; uniform float uTime; uniform vec3 uColors[7]; uniform float uGlow; uniform float uImpulse; uniform float uMelt; uniform float uFall; uniform float uStretch;
float id(vec2 p){if(p.x<0.||p.x>=10.||p.y<0.||p.y>=20.)return 0.;return floor(texture2D(uGrid,(p+.5)/vec2(10.,20.)).r*255.+.5);}
void main(){vec2 p=vec2(gl_FragCoord.x/uSize.x*10.,(1.-gl_FragCoord.y/uSize.y)*20.);p.y+=uFall;vec2 base=floor(p);float best=0.;float chosen=0.;vec2 norm=vec2(0.);
float ids[9];float weights[9];vec2 gradients[9];
for(int idx=0;idx<9;idx++){vec2 c=base+vec2(mod(float(idx),3.)-1.,floor(float(idx)/3.)-1.);ids[idx]=id(c);vec2 d=p-(c+.5);d+=.012*sin(uTime*.8+c.yx*2.)+uImpulse*.025*sin(c.yx*3.+uTime*15.);vec4 tex=texture2D(uGrid,(clamp(c,vec2(0.),vec2(9.,19.))+.5)/vec2(10.,20.));d.y*=1.-tex.b*uStretch*.12;d.x*=1.+tex.b*uStretch*.04;float melting=1.-tex.a*uMelt;weights[idx]=exp(-dot(d,d)*(5.3+tex.a*uMelt*12.))*melting;gradients[idx]=d*weights[idx];}
for(int i=0;i<9;i++){if(ids[i]<.5)continue;float density=0.;vec2 grad=vec2(0.);for(int j=0;j<9;j++){if(abs(ids[i]-ids[j])<.1){density+=weights[j];grad+=gradients[j];}}if(density>best){best=density;chosen=ids[i];norm=grad;}}
if(chosen<.5)discard;float alpha=smoothstep(.29,.36,best);if(alpha<.01)discard;vec3 color=vec3(0.);for(int i=0;i<7;i++){if(abs(chosen-float(i+1))<.1)color=uColors[i];}
vec3 n=normalize(vec3(norm*5.,.7));vec3 light=normalize(vec3(-.65,-.8,1.));float spec=pow(max(dot(n,light),0.),25.);float edge=pow(1.-n.z,2.);float sheen=pow(max(dot(n,normalize(vec3(.4,.7,1.))),0.),10.);
vec2 bubble=vec2(fract(p.x*1.7)-.5,fract(p.y*.65+uTime*.14)-.5);float bubbles=(1.-smoothstep(.045,.09,length(bubble)))*.12;
vec3 glossy=color*(.72+.28*n.z)+vec3(spec*.85+sheen*.18+bubbles)+color*edge*(.25+uGlow);gl_FragColor=vec4(glossy,alpha);}`;
export function createLava(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  try {
    const compile = (type: number, source: string) => {
      const s = gl.createShader(type)!;
      shaders.push(s);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error("link");
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const a = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const loc = (s: string) => gl.getUniformLocation(program!, s);
    const size = loc("uSize"),
      time = loc("uTime"),
      colors = loc("uColors[0]"),
      glow = loc("uGlow"),
      impulse = loc("uImpulse"),
      melt = loc("uMelt"),
      fall = loc("uFall"),
      stretchUniform = loc("uStretch");
    let quality = 0.8,
      last = 0,
      samples = 0,
      sum = 0,
      impact = 0,
      clearedAt = -10000,
      previousY = 0,
      stretch = 0;
    let clearing: { board: Game["board"]; rows: number[] } | null = null;
    const pixels = new Uint8Array(200 * 4);
    const scratch = document.createElement("canvas").getContext("2d")!;
    let palette = new Float32Array(21);
    let theme = "";
    return {
      event(e: GameEvent, game: Game) {
        if (["lock", "hardDrop", "rotate", "move"].includes(e.type))
          impact = performance.now();
        if (e.type === "lineClear") {
          clearedAt = performance.now();
          clearing = {
            board: game.board.map((r) => [...r]),
            rows: e.rows ?? [],
          };
        }
      },
      draw(game: Game, now: number, reduced: boolean) {
        if (gl.isContextLost()) throw Error("context lost");
        if (last) {
          sum += now - last;
          samples++;
          if (samples >= 60) {
            const avg = sum / samples;
            if (avg > 21) quality = Math.max(0.4, quality * 0.8);
            else if (avg < 17) quality = Math.min(1, quality + 0.05);
            samples = 0;
            sum = 0;
          }
        }
        last = now;
        const width = Math.max(
          100,
          Math.round(
            canvas.clientWidth * Math.min(devicePixelRatio, 1.5) * quality,
          ),
        );
        const height = width * 2;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
        const nextTheme = document.documentElement.className;
        if (theme !== nextTheme) {
          theme = nextTheme;
          const style = getComputedStyle(canvas);
          palette = new Float32Array(
            PIECE_NAMES.flatMap((name) => {
              scratch.fillStyle = style
                .getPropertyValue("--tetris-piece-" + name.toLowerCase())
                .trim();
              scratch.fillRect(0, 0, 1, 1);
              return Array.from(scratch.getImageData(0, 0, 1, 1).data)
                .slice(0, 3)
                .map((x) => x / 255);
            }),
          );
        }
        if (game.current.y > previousY) stretch = 1;
        previousY = game.current.y;
        stretch *= 0.9;
        const age = now - clearedAt;
        const melting = !!clearing && age < 180 && !reduced;
        const board = melting ? clearing!.board : game.board;
        pixels.fill(0);
        board.slice(2).forEach((row, y) =>
          row.forEach((c, x) => {
            if (c) {
              pixels[(y * 10 + x) * 4] = PIECE_NAMES.indexOf(c) + 1;
              if (melting && clearing!.rows.includes(y + 2))
                pixels[(y * 10 + x) * 4 + 3] = 255;
            }
          }),
        );
        if (!game.over && !melting)
          for (const [x, y] of blocks(game.current))
            if (y >= 2) {
              pixels[((y - 2) * 10 + x) * 4] =
                PIECE_NAMES.indexOf(game.current.piece) + 1;
              pixels[((y - 2) * 10 + x) * 4 + 2] = 255;
            }
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          10,
          20,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        );
        gl.uniform1f(stretchUniform, reduced ? 0 : stretch);
        gl.uniform1f(
          impulse,
          reduced ? 0 : Math.max(0, 1 - (now - impact) / 350),
        );
        gl.uniform1f(melt, melting ? Math.min(1, age / 180) : 0);
        gl.uniform1f(
          fall,
          !reduced && age >= 180 && age < 480
            ? Math.exp(-(age - 180) / 75) *
                Math.cos((age - 180) / 90) *
                Math.min(2, clearing?.rows.length ?? 0)
            : 0,
        );
        gl.uniform2f(size, width, height);
        gl.uniform1f(time, now * 0.001 * (reduced ? 0.15 : 1));
        gl.uniform3fv(colors, palette);
        gl.uniform1f(
          glow,
          document.documentElement.classList.contains("dark") ? 0.2 : 0,
        );
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      },
      resetClock() {
        last = 0;
      },
      dispose() {
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        shaders.forEach((s) => gl.deleteShader(s));
      },
    };
  } catch {
    shaders.forEach((s) => gl.deleteShader(s));
    if (program) gl.deleteProgram(program);
    return null;
  }
}
