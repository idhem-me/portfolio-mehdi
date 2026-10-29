import Matter from "matter-js";
export type PaintPoint = { x: number; y: number };
export const PAINT_WIDTH = 12;
/** Keep the collision outline within 0.6px while removing redundant samples. */
export function simplifyPaintPoints(
  points: PaintPoint[],
  tolerance = 0.6,
): PaintPoint[] {
  if (points.length < 3) return points;
  const keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop()!;
    const a = points[start],
      b = points[end];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    let maximum = tolerance * tolerance,
      split = -1;
    for (let i = start + 1; i < end; i++) {
      const p = points[i];
      const t = lengthSquared
        ? Math.max(
            0,
            Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
          )
        : 0;
      const distance = (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2;
      if (distance > maximum) {
        maximum = distance;
        split = i;
      }
    }
    if (split >= 0) {
      keep.add(split);
      pending.push([start, split], [split, end]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((index) => points[index]);
}
export function createPaintBody(
  points: PaintPoint[],
  options: Matter.IChamferableBodyDefinition = {},
) {
  const parts: Matter.Body[] = [];
  const outline = simplifyPaintPoints(points);
  outline.forEach((point, index) => {
    parts.push(
      Matter.Bodies.circle(point.x, point.y, PAINT_WIDTH / 2, options, 20),
    );
    const previous = outline[index - 1];
    if (previous) {
      const length = Math.hypot(point.x - previous.x, point.y - previous.y);
      if (length > 0.01)
        parts.push(
          Matter.Bodies.rectangle(
            (point.x + previous.x) / 2,
            (point.y + previous.y) / 2,
            length,
            PAINT_WIDTH,
            {
              ...options,
              angle: Math.atan2(point.y - previous.y, point.x - previous.x),
            },
          ),
        );
    }
  });
  return Matter.Body.create({ ...options, parts });
}
export function samplePaintPoint(points: PaintPoint[], point: PaintPoint) {
  const last = points.at(-1);
  if (!last || Math.hypot(last.x - point.x, last.y - point.y) >= 3)
    points.push(point);
}
