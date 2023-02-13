import { Vect } from "./vect";

export class Rect {
  constructor(public x: number, public y: number, public width: number, public height: number) {

  }

  clone(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }

  get center(): Vect {
    return new Vect(this.x + this.width / 2, this.y + this.height / 2);
  }

  isInside(pos: Vect) {
    return pos.x >= this.x && pos.y >= this.y && pos.x < this.x + this.width && pos.y < this.y + this.height;
  }
}