import { blocks, type Game, type GameEvent } from "../engine/game";
import { PIECE_NAMES } from "../engine/pieces";
export const vertex = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
// Constant 3x3 sampling: cost is independent of the number of occupied cells.
export const fragment = `precision mediump float;
uniform sampler2D uGrid;uniform vec2 uSize;uniform float uTime;uniform vec3 uColors[7];uniform float uGlow;uniform float uImpulse;uniform float uMelt;uniform float uFall;uniform float uStretch;
float best;float chosen;vec2 nearest;
float id(vec2 p){if(p.x<0.||p.x>=10.||p.y<0.||p.y>=20.)return 0.;return floor(texture2D(uGrid,(p+.5)/vec2(10.,20.)).r*255.+.5);}
float same(float a,float b){return a>.5&&abs(a-b)<.1?1.:0.;}
void point(vec2 p,vec2 q,float k){float d=length(p-q);if(d<best){best=d;chosen=k;nearest=q;}}
void edge(vec2 p,vec2 a,vec2 b,float k){vec2 v=b-a;point(p,a+v*clamp(dot(p-a,v)/max(dot(v,v),.001),0.,1.),k);}
void arc(vec2 p,vec2 center,vec2 quadrant,float r,float k){vec2 v=max((p-center)*quadrant,vec2(.0001));point(p,center+normalize(v)*quadrant*r,k);}
void main(){vec2 p=vec2(gl_FragCoord.x/uSize.x*10.,(1.-gl_FragCoord.y/uSize.y)*20.);p.y+=uFall;p+=uImpulse*.004*sin(vec2(p.y,p.x)+uTime*8.);vec2 base=floor(p);float inside=id(base);float signValue=inside>.5?-1.:1.;best=100.;chosen=inside;nearest=p;float radius=.19+.008*sin(uTime*.5);
for(int i=0;i<9;i++){vec2 c=base+vec2(mod(float(i),3.)-1.,floor(float(i)/3.)-1.);float k=id(c);if(k<.5||(inside>.5&&abs(inside-k)>.1))continue;float l=1.-same(k,id(c-vec2(1.,0.))),r=1.-same(k,id(c+vec2(1.,0.))),t=1.-same(k,id(c-vec2(0.,1.))),b=1.-same(k,id(c+vec2(0.,1.)));float tl=l*t*radius,tr=r*t*radius,bl=l*b*radius,br=r*b*radius;
if(t>.5)edge(p,c+vec2(tl,0.),c+vec2(1.-tr,0.),k);if(b>.5)edge(p,c+vec2(bl,1.),c+vec2(1.-br,1.),k);if(l>.5)edge(p,c+vec2(0.,tl),c+vec2(0.,1.-bl),k);if(r>.5)edge(p,c+vec2(1.,tr),c+vec2(1.,1.-br),k);
if(tl>0.)arc(p,c+vec2(radius),vec2(-1.,-1.),radius,k);if(tr>0.)arc(p,c+vec2(1.-radius,radius),vec2(1.,-1.),radius,k);if(bl>0.)arc(p,c+vec2(radius,1.-radius),vec2(-1.,1.),radius,k);if(br>0.)arc(p,c+vec2(1.-radius),vec2(1.,1.),radius,k);
if(inside>.5&&abs(c.x-base.x)<.1&&abs(c.y-base.y)<.1){vec2 d=p-c;if(tl>0.&&d.x<radius&&d.y<radius&&length(d-vec2(radius))>radius)signValue=1.;if(tr>0.&&d.x>1.-radius&&d.y<radius&&length(d-vec2(1.-radius,radius))>radius)signValue=1.;if(bl>0.&&d.x<radius&&d.y>1.-radius&&length(d-vec2(radius,1.-radius))>radius)signValue=1.;if(br>0.&&d.x>1.-radius&&d.y>1.-radius&&length(d-vec2(1.-radius))>radius)signValue=1.;}}
if(chosen<.5)discard;if(best>5.){best=1.;nearest=p;}float sd=best*signValue;float melting=texture2D(uGrid,(clamp(base,vec2(0.),vec2(9.,19.))+.5)/vec2(10.,20.)).a*uMelt;sd+=melting*.45;float shape=(1.-smoothstep(-.02,.02,sd))*(1.-melting);float aura=uGlow*exp(-max(sd,0.)*18.)*.2;float alpha=max(shape,aura);if(alpha<.008)discard;vec3 color=vec3(0.);for(int i=0;i<7;i++)if(abs(chosen-float(i+1))<.1)color=uColors[i];float rim=1.-smoothstep(0.,.24,-sd);vec2 normal=best<.001?vec2(0.):normalize(p-nearest)*signValue;vec3 n=normalize(vec3(normal*rim*.8,1.));float spec=pow(max(dot(n,normalize(vec3(-.5,-.8,1.))),0.),22.);float core=smoothstep(0.,.55,-sd);float wave=.5+.5*sin(p.x*.5+p.y*.23+uTime*.35);float bubble=1.-smoothstep(.035,.075,length(vec2(fract(p.x*1.7)-.5,fract(p.y*.65+uTime*.12)-.5)));vec3 glossy=mix(color,vec3(1.),core*(.24+.16*wave))+color*.13+vec3(spec*.7+bubble*.045)+color*rim*.12;gl_FragColor=vec4(glossy,alpha);}`;
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
