import { ComponentTracker, Engine, EngineSystemWithTrackers } from "./engine";
import { Component } from "./node";

export class DefaultEventsSystem extends EngineSystemWithTrackers {
  private compsAdded: Component[];
  constructor(engine: Engine) {
    super(engine);
    this.addTracker(new ComponentTracker(
      Component,
      this.componentFilter,
      this.onComponentAdded));
    this.compsAdded = [];
  }

  componentFilter = (comp: Component) => {
    // The component is valid if it defines any default event
    return !!((<any>comp).onUpdate) || !!((<any>comp).onCreate);
  }

  onComponentAdded = (comp: Component) => {
    if (!!((<any>comp).onCreate)) {
      this.compsAdded.push(comp);
    }
  }

  onCreate(): void {
  }

  onUpdate(deltaTime: number): void {
    // Call defined events on each component
    for (let comp of this.compsAdded) {
      (<any>comp).onCreate(deltaTime);
    }
    this.compsAdded.length = 0;

    for (let comp of this.trackers[0].components) {
      (<any>comp).onUpdate(deltaTime);
    }
  }
}