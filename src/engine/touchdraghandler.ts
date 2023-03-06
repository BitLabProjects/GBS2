import { Vect2 } from "../utils/vect2";
import { IInputHandler, KeyEventArgs, TouchEventArgs, TouchState } from "./engine";

export class TouchDragHandler implements IInputHandler {
  private touchId: number = -1;
  private downPos: Vect2;
  private isDrag: boolean;

  constructor(private readonly isPointValidForDragStart: (point: Vect2) => boolean,
              private readonly dragUpdate: (point: Vect2, delta: Vect2) => void,
              private readonly onTap: () => void) {

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
            if (!this.isDrag) {
              this.onTap();
            }
            this.touchId = -1;
            break;

          case TouchState.Update:
            let delta = touch.pos.getSubtracted(this.downPos);
            if (!this.isDrag) {
              if (delta.length > 10) {
                this.isDrag = true;
              }
            }
            if (this.isDrag) {  
              this.dragUpdate(touch.pos, delta);
            }
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
          this.isDrag = false;
        }
      }
    }
  }

  onKeyUpdate(kea: KeyEventArgs): void {
    //
  }
}