import test from "node:test";
import assert from "node:assert/strict";
import Matter from "matter-js";
import {
  createPaintBody,
  samplePaintPoint,
} from "../src/components/creative/paint-geometry";
const hit = (body: Matter.Body, x: number, y: number) =>
  Matter.Query.point([body], { x, y }).length > 0;
test("point and straight stroke have a six pixel radius", () => {
  const point = createPaintBody([{ x: 20, y: 20 }]);
  assert.ok(hit(point, 20, 20));
  assert.ok(!hit(point, 27, 20));
  const line = createPaintBody([
    { x: 20, y: 20 },
    { x: 120, y: 20 },
  ]);
  assert.ok(hit(line, 70, 25));
  assert.ok(!hit(line, 70, 27));
});
test("curves, sharp corners and closed loops preserve empty interiors", () => {
  for (const points of [
    [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ],
    [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
      { x: 0, y: 0 },
    ],
    Array.from({ length: 25 }, (_, i) => ({
      x: 50 + 40 * Math.cos((i * Math.PI) / 12),
      y: 50 + 40 * Math.sin((i * Math.PI) / 12),
    })),
  ]) {
    const body = createPaintBody(points);
    assert.ok(hit(body, points[1].x, points[1].y));
    assert.ok(
      !hit(body, points.length > 5 ? 50 : 25, points.length > 5 ? 50 : 25),
    );
  }
});
test("self intersections remain solid only along the stroke", () => {
  const body = createPaintBody([
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 100, y: 0 },
    { x: 0, y: 100 },
  ]);
  assert.ok(hit(body, 50, 50));
  assert.ok(!hit(body, 50, 10));
});
test("sampling removes subpixel noise without distorting endpoints", () => {
  const points = [{ x: 0, y: 0 }];
  samplePaintPoint(points, { x: 1, y: 1 });
  samplePaintPoint(points, { x: 3, y: 0 });
  assert.equal(points.length, 2);
});

test("dense straight strokes do not generate redundant collision parts", () => {
  const points = Array.from({ length: 101 }, (_, i) => ({ x: i * 3, y: 20 }));
  const body = createPaintBody(points);
  assert.equal(body.parts.length, 4); // parent, segment and two rounded caps
  assert.ok(hit(body, 150, 25));
  assert.ok(!hit(body, 150, 27));
});
