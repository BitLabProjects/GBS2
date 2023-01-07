import { Engine, EngineSystemForComp } from "./engine";
import { Component } from "./node";

export class DefaultEventsSystem extends EngineSystemForComp {
  constructor(engine: Engine) {
    super(engine, Component);
  }

  protected componentFilter(comp: Component): boolean {
    // The component is valid if it defines any default event
    return !!((<any>comp).onUpdate);
  }

  onCreated(): void {
  }

  onUpdate(deltaTime: number): void {
    // Call defined events on each component
    for(let comp of this.components) {
      (<any>comp).onUpdate(deltaTime);
    }
  }
}