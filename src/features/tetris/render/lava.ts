import { blocks, type Game, type GameEvent } from "../engine/game";
import { PIECE_NAMES } from "../engine/pieces";
export const vertex = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
// Constant 3x3 sampling: cost is independent of the number of occupied cells.
export const fragment = `precision mediump float;
uniform sampler2D uGrid;uniform vec2 uSize;uniform float uTime;uniform vec3 uColors[7];uniform float uGlow;uniform float uImpulse;uniform float uMelt;uniform float uFall;uniform float uStretch;
float id(vec2 p){if(p.x<0.||p.x>=10.||p.y<0.||p.y>=20.)return 0.;return floor(texture2D(uGrid,(p+.5)/vec2(10.,20.)).r*255.+.5);}
float same(float a,float b){return a>.5&&abs(a-b)<.1?1.:0.;}
void main(){vec2 p=vec2(gl_FragCoord.x/uSize.x*10.,(1.-gl_FragCoord.y/uSize.y)*20.);p.y+=uFall;vec2 base=floor(p);float best=100.;float chosen=0.;vec2 normal=vec2(0.);
for(int i=0;i<9;i++){vec2 c=base+vec2(mod(float(i),3.)-1.,floor(float(i)/3.)-1.);float k=id(c);if(k<.5)continue;vec4 tex=texture2D(uGrid,(c+.5)/vec2(10.,20.));float l=same(k,id(c-vec2(1.,0.))),r=same(k,id(c+vec2(1.,0.))),t=same(k,id(c-vec2(0.,1.))),b=same(k,id(c+vec2(0.,1.)));vec2 d=p-(c+.5);d+=.008*sin(uTime*.6+c.yx)+uImpulse*.012*sin(c.yx+uTime*10.);d.y*=1.-tex.b*uStretch*.06;float adjacentX=d.x<0.?l:r;float adjacentY=d.y<0.?t:b;float radius=.19*(1.-max(adjacentX,adjacentY));vec2 shift=vec2(r-l,b-t)*.125;vec2 halfSize=vec2(.5)+vec2(l+r,t+b)*.125;vec2 q=abs(d-shift)-(halfSize-radius);float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-radius+tex.a*uMelt*.9;
if(sd<best){best=sd;chosen=k;vec2 grad=q.x>q.y?vec2(sign(d.x),0.):vec2(0.,sign(d.y));if(max(q.x,q.y)>0.)grad=normalize(max(q,0.)+.001)*sign(d);normal=grad;}}
if(chosen<.5)discard;float shape=1.-smoothstep(-.025,.025,best);float aura=uGlow*exp(-max(best,0.)*18.)*.22;float alpha=max(shape,aura);if(alpha<.008)discard;vec3 color=vec3(0.);for(int i=0;i<7;i++)if(abs(chosen-float(i+1))<.1)color=uColors[i];float edge=1.-smoothstep(0.,.2,-best);vec3 n=normalize(vec3(normal*edge*.85,1.));float spec=pow(max(dot(n,normalize(vec3(-.5,-.8,1.))),0.),22.);float core=smoothstep(0.,.45,-best);float wave=.5+.5*sin(p.x*.5+p.y*.23+uTime*.35);float bubble=1.-smoothstep(.035,.075,length(vec2(fract(p.x*1.7)-.5,fract(p.y*.65+uTime*.12)-.5)));vec3 glossy=mix(color,vec3(1.),core*(.32+.18*wave))+color*.16+vec3(spec*.8+bubble*.08)+color*edge*.18;gl_FragColor=vec4(glossy,alpha);}`;
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
