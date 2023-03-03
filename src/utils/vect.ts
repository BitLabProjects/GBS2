import { TypeDescriptor, TypeKind } from "./objutils";
import { Rect } from "./rect";

export class Vect {
  constructor(public x: number, public y: number) {
  }

  static createRandom(rect: Rect) {
    return new Vect(
      Math.random() * rect.width + rect.x,
      Math.random() * rect.height + rect.y);
  }

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  copy(other: Vect) {
    this.x = other.x;
    this.y = other.y;
  }

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  distanceTo(other: Vect): number {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
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

  distanceFromSegment(segmentV1: Vect, segmentDelta: Vect): number {
    let diffP = this.getSubtracted(segmentV1);
    let rayN = new Vect(-segmentDelta.y, segmentDelta.x);
    rayN.normalize();
    let normalDot = diffP.dotProduct(rayN);
    let pointOnRay = this.clone();
    pointOnRay.addScaled(rayN, -normalDot);

    let t = pointOnRay.distanceTo(segmentV1);
    if (t < 0) {
      return this.distanceTo(segmentV1);
    } else if (t > segmentDelta.length) {
      let p = segmentV1.clone();
      p.addScaled(segmentDelta, 1);
      return this.distanceTo(p);
    } else {
      return Math.abs(normalDot);
    }
  }

  dotProduct(other: Vect) {
    return this.x * other.x + this.y * other.y;
  }

  clone(): Vect {
    return new Vect(this.x, this.y);
  }

  static readonly TypeDescriptor: TypeDescriptor = Vect.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, Vect);
    td.addProp("x", TypeDescriptor.Float32);
    td.addProp("y", TypeDescriptor.Float32);
    return td;
  }
}