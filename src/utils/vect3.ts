import { TypeDescriptor, TypeKind } from "./objutils";
import { Rect } from "./rect";

export class Vect3 {
  constructor(public x: number, public y: number, public z: number) {
  }

  static createRandomXY(rect: Rect) {
    return new Vect3(
      Math.random() * rect.width + rect.x,
      Math.random() * rect.height + rect.y,
      0);
  }

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  copy(other: Vect3) {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
  }

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  distanceTo(other: Vect3): number {
    let dx = this.x - other.x;
    let dy = this.y - other.y;
    let dz = this.z - other.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getSubtracted(other: Vect3): Vect3 {
    return new Vect3(this.x - other.x,
                    this.y - other.y,
                    this.z - other.z);
  }

  scale(value: number) {
    this.x *= value;
    this.y *= value;
    this.z *= value;
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

  vectorTo(other: Vect3): Vect3 {
    let result = other.getSubtracted(this);
    return result;
  }

  versorTo(other: Vect3): Vect3 {
    let result = other.getSubtracted(this);
    result.normalize();
    return result;
  }

  addScaled(other: Vect3, scale: number) {
    this.x += other.x * scale;
    this.y += other.y * scale;
    this.z += other.z * scale;
  }

  distanceFromSegment(segmentV1: Vect3, segmentDelta: Vect3): number {
    let diffP = this.getSubtracted(segmentV1);
    let rayN = new Vect3(-segmentDelta.y, segmentDelta.x, segmentDelta.z);
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

  dotProduct(other: Vect3) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  clone(): Vect3 {
    return new Vect3(this.x, this.y, this.z);
  }

  static readonly TypeDescriptor: TypeDescriptor = Vect3.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, Vect3);
    td.addProp("x", TypeDescriptor.Float32);
    td.addProp("y", TypeDescriptor.Float32);
    td.addProp("z", TypeDescriptor.Float32);
    return td;
  }
}