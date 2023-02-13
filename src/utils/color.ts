export class Color {
  constructor(public r: number, public g: number, public b: number, public a: number) {
    
  }

  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a);
  }
}