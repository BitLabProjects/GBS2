import { Vect } from "./vect";

export class Rect {
  constructor(public x: number, public y: number, public width: number, public height: number) {

  }

  isInside(pos: Vect) {
    return pos.x >= this.x && pos.y >= this.y && pos.x < this.x + this.width && pos.y < this.y + this.height;
  }
}