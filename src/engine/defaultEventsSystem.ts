import { Engine, EngineSystemForComp } from "./engine";
import { Component } from "./node";

export class DefaultEventsSystem extends EngineSystemForComp {
  private compsAdded: Component[];
  constructor(engine: Engine) {
    super(engine, Component);
    this.compsAdded = [];
  }

  protected componentFilter(comp: Component): boolean {
    // The component is valid if it defines any default event
    return !!((<any>comp).onUpdate) || !!((<any>comp).onCreate);
  }

  onComponentAdded(comp: Component): void {
    if (!!((<any>comp).onCreate)) {
      this.compsAdded.push(comp);
    }
  }

  onCreate(): void {
  }

  onUpdate(deltaTime: number): void {
    // Call defined events on each component
    for(let comp of this.compsAdded) {
      (<any>comp).onCreate(deltaTime);
    }
    this.compsAdded.length = 0;

    for(let comp of this.components) {
      (<any>comp).onUpdate(deltaTime);
    }
  }
}