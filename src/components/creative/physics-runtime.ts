import type Matter from "matter-js";

let runtime: typeof Matter | undefined;

export async function loadPhysics() {
  runtime ??= (await import("matter-js")).default;
}

export function getPhysics() {
  if (!runtime) throw new Error("Load the physics engine before using it.");
  return runtime;
}
