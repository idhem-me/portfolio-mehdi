/**
 * Décor hors-carte — désactivé en phase 1 (carte DA déjà très large).
 * Conservé comme stub pour ne pas casser Game.tsx.
 */
import { Container } from "pixi.js";

export class Scenery {
  readonly root = new Container();

  async loadAssets(): Promise<void> {
    /* no-op phase 1 */
  }

  build(): void {
    this.root.removeChildren();
  }

  destroy(): void {
    this.root.removeChildren();
  }
}
