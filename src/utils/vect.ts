export class Vect {
  constructor(public x: number, public y: number) {

  }

  clone(): Vect {
    return new Vect(this.x, this.y);
  }
}