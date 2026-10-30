import "./page-tear.css";

let snapshotId = 0;
const TEAR_DURATION = 1000;

/** A visual copy only: React continues to own the restored page underneath. */
function snapshotPage() {
  const body = document.body;
  const copy = document.createElement("div");
  copy.className = body.className;
  copy.style.cssText = body.style.cssText;
  Object.assign(copy.style, {
    position: "absolute",
    top: `${-window.scrollY}px`,
    left: `${-window.scrollX}px`,
    width: `${body.clientWidth}px`,
    minHeight: `${body.scrollHeight}px`,
    margin: "0",
    background: getComputedStyle(body).backgroundColor,
    pointerEvents: "none",
  });
  const sources: Element[] = [];
  const copies: Element[] = [];
  for (const child of body.children) {
    if (child.matches("script, style, link, nextjs-portal, [data-page-tear]"))
      continue;
    const clone = child.cloneNode(true) as Element;
    sources.push(child, ...child.querySelectorAll("*"));
    copies.push(clone, ...clone.querySelectorAll("*"));
    copy.append(clone);
  }

  // cloneNode omits canvas pixels and current form values. Keep both, as well
  // as nested scroll positions and any CSS animation's current appearance.
  const prefix = `page-tear-${++snapshotId}-`;
  const ids = new Map<string, string>();
  sources.forEach((source, i) => {
    const clone = copies[i];
    for (const attribute of Array.from(clone.attributes)) {
      if (attribute.name.startsWith("data-analytics-")) clone.removeAttribute(attribute.name);
    }
    if (source.id) {
      ids.set(source.id, prefix + source.id);
      clone.id = prefix + source.id;
    }
    if (source instanceof HTMLCanvasElement && clone instanceof HTMLCanvasElement)
      clone.getContext("2d")?.drawImage(source, 0, 0);
    if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
      clone.value = source.value;
      clone.checked = source.checked;
    }
    if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement)
      clone.value = source.value;
    if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement)
      clone.selectedIndex = source.selectedIndex;
    // Inline animated properties instead of restarting CSS animations in the copy.
    for (const animation of source.getAnimations()) {
      if (!(animation.effect instanceof KeyframeEffect)) continue;
      const computed = getComputedStyle(source);
      for (const frame of animation.effect.getKeyframes()) {
        for (const property of Object.keys(frame)) {
          if (["offset", "computedOffset", "easing", "composite"].includes(property)) continue;
          if (clone instanceof HTMLElement || clone instanceof SVGElement) {
            const css = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
            clone.style.setProperty(css, computed.getPropertyValue(css));
          }
        }
      }
    }
  });
  for (const clone of copies) {
    for (const attribute of Array.from(clone.attributes)) {
      let value = attribute.value.replace(/url\(["']?#([^)'"\s]+)["']?\)/g,
        (match, id: string) => ids.has(id) ? `url(#${ids.get(id)})` : match);
      if (attribute.name === "href" || attribute.name === "xlink:href") {
        if (value.startsWith("#") && ids.has(value.slice(1))) value = `#${ids.get(value.slice(1))}`;
      }
      if (value !== attribute.value) clone.setAttribute(attribute.name, value);
    }
  }
  return {
    element: copy,
    restoreScroll: () => sources.forEach((source, i) => {
      copies[i].scrollTop = source.scrollTop;
      copies[i].scrollLeft = source.scrollLeft;
    }),
  };
}

// Keep the lower edge attached while the upper-left corner peels away first.
// Matching vertices allow Safari to interpolate the curved, fibrous edge.
function tornEdge(top: number, bottom: number, band = false) {
  const points: string[] = [];
  const edge: number[] = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const y = i / segments;
    const tension = (1 - y) ** 1.65;
    const fibers = Math.sin(i * 1.73 + Math.sin(i * 0.61) * 2.4) * 0.27
      + Math.sin(i * 3.91) * 0.13;
    const ripple = Math.sin(y * Math.PI * 3.4 + 0.6) * 0.8
      + Math.sin(y * Math.PI * 7.1) * 0.32;
    const lift = Math.min(1, top / 5) * (0.15 + tension * 0.85);
    const x = bottom + (top - bottom) * tension + (fibers + ripple) * lift;
    edge.push(x);
    points.push(`${x}% ${y * 100}%`);
  }
  if (band) {
    for (let i = segments; i >= 0; i--) {
      const width = 1.2 + (1 - i / segments) * 4.8;
      points.push(`${edge[i] + width}% ${i / segments * 100}%`);
    }
  } else points.push("100% 100%", "100% 0%");
  return `polygon(${points.join(",")})`;
}

// A smooth displacement field bends the rendered content as well as its edges.
// It avoids multiplying the DOM into strips, keeping the snapshot lightweight.
let bendMap: string | undefined;
function createPaperBend(stage: HTMLElement, surface: HTMLElement) {
  if (!bendMap) {
    const canvas = document.createElement("canvas");
    const size = 256;
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const pixels = context.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const v = y / (size - 1);
        const index = (y * size + x) * 4;
        const bow = Math.sin(v * Math.PI * 1.35 - u * 0.9);
        const flex = Math.sin(u * Math.PI * 0.85 + v * Math.PI * 1.4);
        pixels.data[index] = Math.round((0.5 + bow * 0.38 * (1 - u * 0.55)) * 255);
        pixels.data[index + 1] = Math.round((0.5 - flex * 0.26) * 255);
        pixels.data[index + 2] = 128;
        pixels.data[index + 3] = 255;
      }
    }
    context.putImageData(pixels, 0, 0);
    bendMap = canvas.toDataURL();
  }
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  const filter = document.createElementNS(ns, "filter");
  filter.id = `page-tear-bend-${snapshotId}`;
  filter.setAttribute("x", "-35%");
  filter.setAttribute("y", "-35%");
  filter.setAttribute("width", "170%");
  filter.setAttribute("height", "170%");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const image = document.createElementNS(ns, "feImage");
  image.setAttribute("href", bendMap);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", String(window.innerWidth));
  image.setAttribute("height", String(window.innerHeight));
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("result", "bend");
  const displacement = document.createElementNS(ns, "feDisplacementMap");
  displacement.setAttribute("in", "SourceGraphic");
  displacement.setAttribute("in2", "bend");
  displacement.setAttribute("xChannelSelector", "R");
  displacement.setAttribute("yChannelSelector", "G");
  displacement.setAttribute("scale", "0");
  // Displacement sampling can produce jagged fine grid lines on high-DPI Safari.
  // A subpixel softening follows the bend and returns to zero at both ends.
  const soften = document.createElementNS(ns, "feGaussianBlur");
  soften.setAttribute("stdDeviation", "0");
  filter.append(image, displacement, soften);
  svg.append(filter);
  stage.append(svg);
  surface.style.filter = `url("#${filter.id}")`;
  return { displacement, soften };
}

/** Returns an idempotent cancellation function for navigation/unmount. */
export function tearPage(restore: () => void, onFinish: () => void): () => void {
  const snapshot = snapshotPage();
  const stage = document.createElement("div");
  stage.dataset.pageTear = "";
  stage.setAttribute("aria-hidden", "true");
  stage.className = "page-tear-stage";
  const sheet = document.createElement("div");
  sheet.className = "page-tear-sheet";
  const paper = document.createElement("div");
  paper.className = "page-tear-paper";
  paper.inert = true;
  paper.append(snapshot.element);
  const curl = document.createElement("div");
  curl.className = "page-tear-curl";
  const surface = document.createElement("div");
  surface.className = "page-tear-surface";
  const lighting = document.createElement("div");
  lighting.className = "page-tear-lighting";
  paper.append(lighting);
  surface.append(paper, curl);
  sheet.append(surface);
  stage.append(sheet);

  const originalChildren = Array.from(document.body.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .map((element) => ({ element, inert: element.inert }));
  const scroll = { x: window.scrollX, y: window.scrollY };
  const animations: Animation[] = [];
  let finished = false;
  let bendFrame = 0;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const block = (event: Event) => event.preventDefault();
  const blockKey = (event: KeyboardEvent) => {
    if (["Tab", "Enter", " ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key))
      event.preventDefault();
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    cancelAnimationFrame(bendFrame);
    for (const animation of animations) animation.cancel();
    stage.remove();
    for (const { element, inert } of originalChildren) element.inert = inert;
    document.removeEventListener("wheel", block, true);
    document.removeEventListener("touchmove", block, true);
    document.removeEventListener("keydown", blockKey, true);
    window.removeEventListener("resize", finish);
    onFinish();
  };

  document.body.append(stage);
  snapshot.restoreScroll();
  for (const { element } of originalChildren) element.inert = true;
  document.addEventListener("wheel", block, { capture: true, passive: false });
  document.addEventListener("touchmove", block, { capture: true, passive: false });
  document.addEventListener("keydown", blockKey, true);
  window.addEventListener("resize", finish);
  try {
    // The opaque copy is already mounted before React restores the real page.
    restore();
    window.scrollTo(scroll.x, scroll.y);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stage.dataset.motion = "reduced";
      animations.push(sheet.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160, fill: "forwards",
      }));
    } else {
      stage.dataset.motion = "full";
      const bend = createPaperBend(stage, surface);
      const offsets = [0, 0.14, 0.28, 0.43, 0.59, 0.77, 1];
      const edges = [
        { top: 0, bottom: 0 },
        { top: 2.5, bottom: 0 },
        { top: 8, bottom: 0 },
        { top: 17, bottom: 0.3 },
        { top: 27, bottom: 2 },
        { top: 35, bottom: 8 },
        { top: 43, bottom: 22 },
      ];
      const timing: KeyframeAnimationOptions = {
        duration: TEAR_DURATION, easing: "cubic-bezier(.35,0,.3,1)", fill: "forwards",
      };
      animations.push(paper.animate(edges.map(({ top, bottom }, i) => ({
        clipPath: tornEdge(top, bottom), offset: offsets[i],
      })), timing));
      animations.push(curl.animate(edges.map(({ top, bottom }, i) => ({
        clipPath: tornEdge(top, bottom, true),
        opacity: i === 0 ? 0 : i === edges.length - 1 ? 0.15 : 0.65,
        offset: offsets[i],
      })), timing));
      animations.push(lighting.animate([
        { opacity: 0, backgroundPosition: "0% 0%", offset: 0 },
        { opacity: 0.35, backgroundPosition: "25% 15%", offset: 0.28 },
        { opacity: 0.85, backgroundPosition: "60% 45%", offset: 0.59 },
        { opacity: 0.2, backgroundPosition: "100% 90%", offset: 1 },
      ], timing));
      animations.push(sheet.animate([
        { filter: "drop-shadow(-2px 3px 2px rgb(0 0 0 / .12)) drop-shadow(-4px 6px 6px rgb(0 0 0 / .1))", offset: 0 },
        { filter: "drop-shadow(-6px 12px 7px rgb(0 0 0 / .32)) drop-shadow(-22px 30px 25px rgb(0 0 0 / .35))", offset: 0.28 },
        { filter: "drop-shadow(-10px 20px 12px rgb(0 0 0 / .36)) drop-shadow(-38px 48px 38px rgb(0 0 0 / .42))", offset: 0.59 },
        { filter: "drop-shadow(-6px 14px 10px rgb(0 0 0 / .2)) drop-shadow(-26px 34px 30px rgb(0 0 0 / .25))", offset: 1 },
      ], timing));
      // The corner starts gently, bows outward, then the trailing edge catches
      // up as the sheet sweeps down and right along a continuous curved path.
      const flight = sheet.animate([
        { transform: "translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skewY(0deg)", offset: 0 },
        { transform: "translate3d(.3%,.3%,22px) rotateX(-3deg) rotateY(-4deg) rotateZ(-1deg) skewY(.5deg)", offset: 0.14 },
        { transform: "translate3d(2%,2%,65px) rotateX(-9deg) rotateY(-12deg) rotateZ(-4deg) skewY(1.5deg)", offset: 0.28 },
        { transform: "translate3d(7%,7%,125px) rotateX(-16deg) rotateY(-22deg) rotateZ(-9deg) skewY(3deg)", offset: 0.43 },
        { transform: "translate3d(23%,15%,170px) rotateX(-12deg) rotateY(-28deg) rotateZ(-13deg) skewY(1deg)", offset: 0.59 },
        { transform: "translate3d(45%,46%,105px) rotateX(-6deg) rotateY(-19deg) rotateZ(-10deg) skewY(-1.5deg)", offset: 0.77 },
        { transform: "translate3d(88%,115%,40px) rotateX(-3deg) rotateY(-12deg) rotateZ(-6deg) skewY(0deg)", offset: 1 },
      ], timing);
      animations.push(flight);
      if (bend) {
        const amplitude = Math.min(220, Math.min(window.innerWidth, window.innerHeight) * 0.30);
        const updateBend = () => {
          if (finished) return;
          // Read the animation clock so pause/seek and background tabs stay in sync.
          const progress = Math.min(1, Math.max(0, Number(flight.currentTime ?? 0) / TEAR_DURATION));
          const bow = Math.sin(progress * Math.PI) ** 1.2;
          const flutter = 1 + Math.sin(progress * Math.PI * 3) * 0.12;
          bend.displacement.setAttribute("scale", String(amplitude * bow * flutter));
          bend.soften.setAttribute("stdDeviation", String(bow * 0.35));
          bendFrame = requestAnimationFrame(updateBend);
        };
        updateBend();
      }
    }
    // Cancellation rejects finished promises; both paths must release the lock.
    void Promise.all(animations.map((animation) => animation.finished)).then(finish, finish);
    fallback = setTimeout(finish, 1800);
  } catch {
    finish();
  }
  return finish;
}
