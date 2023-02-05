import { Vect } from "../utils/vect";
import { ComponentTracker, Engine, EngineSystemWithTrackers, IInputSystem, KeyEventArgs, TouchEventArgs } from "./engine";
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
    return !!((<any>comp).onTouchUpdate) || !!((<any>comp).onKeyUpdate);
  }

  onCreate(): void {
  }

  onUpdate(deltaTime: number): void {
  }

  onTouchUpdate(tea: TouchEventArgs) {
    for (let comp of this.trackers[0].components) {
      if ((<any>comp).onTouchUpdate) {
        (<any>comp).onTouchUpdate(tea);
      }
    }
  }

  onKeyUpdate(kea: KeyEventArgs): void {
    for (let comp of this.trackers[0].components) {
      if ((<any>comp).onKeyUpdate) {
        (<any>comp).onKeyUpdate(kea);
      }
    }
  }
}