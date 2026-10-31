// Next enforces this marker at build time. Unit tests execute the server modules
// directly in Node; neutralise only the marker, never the modules being tested.
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return {
        url: new URL("./server-only-stub.cjs", import.meta.url).href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
