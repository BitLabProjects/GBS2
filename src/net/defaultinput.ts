import { NetplayInput } from "./types";
import * as utils from "./utils";
import { TouchControl } from "./touchcontrols";
import { ObjUtils } from "../utils/objutils";

export enum KeyState {
  Released = 0,
  Pressed = 1,
  JustPressed = 2,
  JustReleased = 3,
}

export class DefaultInput extends NetplayInput<DefaultInput> {
  pressed: { [key: string]: KeyState } = {};
  isPressed(key: string): boolean {
    switch (this.pressed[key]) {
      case KeyState.Pressed:
      case KeyState.JustPressed:
        return true;

      default:
        return false;
    }
  }
  isJustPressed(key: string): boolean {
    switch (this.pressed[key]) {
      case KeyState.JustPressed:
        return true;

      default:
        return false;
    }
  }

  mousePosition?: { x: number; y: number };

  touches: Array<{ x: number; y: number }> = [];

  touchControls?: { [name: string]: any };
}

export class DefaultInputReader {
  canvas: HTMLCanvasElement;

  PRESSED_KEYS: { [key: string]: KeyState } = {};

  mousePosition: { x: number; y: number } | null = null;
  mouseDelta: { x: number; y: number } | null = null;
  touches: Array<{ x: number; y: number }> = [];

  touchControls: { [name: string]: TouchControl };

  getCanvasScale(): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: this.canvas.width / rect.width,
      y: this.canvas.height / rect.height,
    };
  }

  projectClientPosition(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.getCanvasScale();

    return {
      x: (clientX - rect.left) * scale.x,
      y: (clientY - rect.top) * scale.y,
    };
  }

  constructor(
    canvas: HTMLCanvasElement,
    pointerLock: boolean,
    touchControls: { [name: string]: TouchControl }
  ) {
    this.canvas = canvas;
    this.touchControls = touchControls;

    document.addEventListener(
      "keydown",
      (event) => {
        this.PRESSED_KEYS[event.key] = KeyState.JustPressed;
      },
      false
    );
    document.addEventListener(
      "keyup",
      (event) => {
        this.PRESSED_KEYS[event.key] = KeyState.JustReleased;
      },
      false
    );

    canvas.addEventListener(
      "mouseenter",
      (e) => this.updateMousePosition(e),
      false
    );

    canvas.addEventListener(
      "mousemove",
      (e) => this.updateMousePosition(e),
      false
    );

    canvas.addEventListener(
      "mouseleave",
      (e) => {
        this.mousePosition = null;
      },
      false
    );

    canvas.addEventListener("touchstart", (e) => this.updateTouches(e), false);
    canvas.addEventListener("touchmove", (e) => this.updateTouches(e), false);
    canvas.addEventListener("touchend", (e) => this.updateTouches(e), false);

    canvas.addEventListener("mousedown", () => {
      if (pointerLock) {
        canvas.requestPointerLock();
      }
    });
  }

  updateMousePosition(event: MouseEvent) {
    if (document.pointerLockElement === this.canvas) {
      if (!this.mousePosition) {
        // If we are pointer locked, the first position is projected onto the canvas.
        this.mousePosition = this.projectClientPosition(
          event.clientX,
          event.clientY
        );
      } else {
        // Subsequent positions are delta based off of our relative movement.
        const scale = this.getCanvasScale();
        this.mousePosition.x += event.movementX * scale.x;
        this.mousePosition.y += event.movementY * scale.y;
      }
    } else {
      // If we aren't pointer locked, just project the position onto the canvas.
      this.mousePosition = this.projectClientPosition(
        event.clientX,
        event.clientY
      );
    }
  }

  updateTouches(event: TouchEvent) {
    this.touches.length = event.targetTouches.length;
    for (let i = 0; i < event.targetTouches.length; ++i) {
      this.touches[i] = this.projectClientPosition(
        event.targetTouches[i].clientX,
        event.targetTouches[i].clientY
      );
    }
  }

  getInput(): DefaultInput {
    let input = new DefaultInput();

    for (let key in this.PRESSED_KEYS) {
      switch (this.PRESSED_KEYS[key]) {
        case KeyState.Released:
          break;

        case KeyState.Pressed:
          input.pressed[key] = KeyState.Pressed;
          break;

        case KeyState.JustPressed:
          input.pressed[key] = KeyState.JustPressed;
          this.PRESSED_KEYS[key] = KeyState.Pressed;
          break;

        case KeyState.JustReleased:
          input.pressed[key] = KeyState.JustReleased;
          this.PRESSED_KEYS[key] = KeyState.Released;
          break;
      }
    }
    if (this.mousePosition)
      input.mousePosition = ObjUtils.cloneDiscardingTypes(this.mousePosition);
      input.touches = ObjUtils.cloneDiscardingTypes(this.touches);

    for (let [name, control] of Object.entries(this.touchControls)) {
      input.touchControls = input.touchControls || {};
      input.touchControls[name] = ObjUtils.cloneDiscardingTypes(control.getValue());
    }

    return input;
  }
}
