export class Vect {
  constructor(public x: number, public y: number) {

  }

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  getSubtracted(other: Vect): Vect {
    return new Vect(this.x - other.x, this.y - other.y);
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

  normalize() {
    let l = this.length;
    if (l < 0.00001) {
      this.scale(0);
    } else {
      this.scale(1 / l);
    }
  }

  addScaled(other: Vect, scale: number) {
    this.x += other.x * scale;
    this.y += other.y * scale;
  }

  clone(): Vect {
    return new Vect(this.x, this.y);
  }
}