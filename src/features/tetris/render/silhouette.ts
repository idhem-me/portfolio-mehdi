type Point = readonly [number, number];
const key = (p: Point) => `${p[0]},${p[1]}`;
/** Trace the union boundary, omitting shared edges. Round convex exterior corners only. */
export function silhouette(cells: readonly Point[], radius = 0.19): string {
  const occupied = new Set(cells.map(key));
  const edges = new Map<string, Point[]>();
  const add = (a: Point, b: Point) =>
    edges.set(key(a), [...(edges.get(key(a)) ?? []), b]);
  for (const [x, y] of cells) {
    if (!occupied.has(key([x, y - 1]))) add([x, y], [x + 1, y]);
    if (!occupied.has(key([x + 1, y]))) add([x + 1, y], [x + 1, y + 1]);
    if (!occupied.has(key([x, y + 1]))) add([x + 1, y + 1], [x, y + 1]);
    if (!occupied.has(key([x - 1, y]))) add([x, y + 1], [x, y]);
  }
  let path = "";
  while (edges.size) {
    const start = edges.keys().next().value!;
    let current = start;
    const points: Point[] = [];
    do {
      const p = current.split(",").map(Number) as [number, number];
      points.push(p);
      const choices = edges.get(current);
      if (!choices?.length) break;
      const prev = points.length > 1 ? points[points.length - 2] : null;
      let pick = 0;
      if (prev && choices.length > 1) {
        const dx = p[0] - prev[0],
          dy = p[1] - prev[1];
        let turn = -Infinity;
        choices.forEach((candidate, index) => {
          const ex = candidate[0] - p[0],
            ey = candidate[1] - p[1];
          const angle = Math.atan2(dx * ey - dy * ex, dx * ex + dy * ey);
          if (angle > turn) {
            turn = angle;
            pick = index;
          }
        });
      }
      const next = choices.splice(pick, 1)[0];
      if (!choices.length) edges.delete(current);
      current = key(next);
    } while (current !== start && points.length < 2000);
    const corners = points.map((p, i) => {
      const prev = points[(i + points.length - 1) % points.length],
        next = points[(i + 1) % points.length];
      const incoming = [p[0] - prev[0], p[1] - prev[1]],
        outgoing = [next[0] - p[0], next[1] - p[1]];
      const cross = incoming[0] * outgoing[1] - incoming[1] * outgoing[0];
      const r = cross > 0 ? radius : 0;
      return {
        p,
        a: [p[0] - incoming[0] * r, p[1] - incoming[1] * r],
        b: [p[0] + outgoing[0] * r, p[1] + outgoing[1] * r],
      };
    });
    if (!corners.length) continue;
    path += `M${corners[0].b.join(" ")}`;
    for (let i = 1; i <= corners.length; i++) {
      const c = corners[i % corners.length];
      path += `L${c.a.join(" ")}Q${c.p.join(" ")} ${c.b.join(" ")}`;
    }
    path += "Z";
  }
  return path;
}
