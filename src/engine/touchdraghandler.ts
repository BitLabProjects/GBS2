import { Vect } from "../utils/vect";
import { IInputHandler, KeyEventArgs, TouchEventArgs, TouchState } from "./engine";

export class TouchDragHandler implements IInputHandler {
  private touchId: number = -1;
  private downPos: Vect;

  constructor(private readonly isPointValidForDragStart: (point: Vect) => boolean,
              private readonly dragUpdate: (point: Vect, delta: Vect) => void) {

  }

  get isDragging(): boolean {
    return this.touchId >= 0;
  }

  onTouchUpdate(tea: TouchEventArgs) {
    if (this.touchId >= 0) {
      // We are dragging
      let touch = tea.getTouchById(this.touchId);
      if (touch) {
        switch (touch.state) {
          case TouchState.Release:
            // The touch was released
            this.touchId = -1;
            break;
          case TouchState.Update:
            this.dragUpdate(touch.pos, new Vect(touch.pos.x - this.downPos.x, touch.pos.y - this.downPos.y));
            break;
        }
      } else {
        // Should never arrive here, TODO assert
        this.touchId = -1;
      }
    } else {
      // Search for a touch starting now that's inside our bounds
      for(let touch of tea.touches) {
        if (touch.state === TouchState.Press && this.isPointValidForDragStart(touch.pos)) {
          this.touchId = touch.id;
          this.downPos = touch.pos.clone();
        }
      }
    }
  }

  onKeyUpdate(kea: KeyEventArgs): void {
    //
  }
}