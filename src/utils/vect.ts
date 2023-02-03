export class Vect {
  constructor(public x: number, public y: number) {

  }

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  scale(value: number) {
    this.x *= value;
    this.y *= value;
  }

  clampLength(maxLength: number) {
    let l = this.length;
    if (l > maxLength) {
      this.scale(maxLength / l);
    }
  }

  clone(): Vect {
    return new Vect(this.x, this.y);
  }
}