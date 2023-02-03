import { Vect } from "../utils/vect";
import { ComponentTracker, Engine, EngineSystemWithTrackers, IInputSystem, TouchEventArgs } from "./engine";
import { Component } from "./node";

export class InputSystem extends EngineSystemWithTrackers implements IInputSystem {
  constructor(engine: Engine) {
    super(engine);
    this.addTracker(new ComponentTracker(
      engine.genTrackerId(),
      Component,
      this.componentFilter));
  }

  componentFilter = (comp: Component) => {
    // The component is valid if it defines any input event
    return !!((<any>comp).onTouchUpdate);
  }

  onCreate(): void {
  }

  onUpdate(deltaTime: number): void {
    //for (let comp of this.trackers[0].components) {
    //  (<any>comp).onUpdate(deltaTime);
    //}
  }

  onTouchUpdate(tea: TouchEventArgs) {
    for (let comp of this.trackers[0].components) {
      if ((<any>comp).onTouchUpdate) {
        (<any>comp).onTouchUpdate(tea);
      }
    }
  }
}