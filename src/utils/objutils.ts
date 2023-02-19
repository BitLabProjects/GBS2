import { BufferReader } from "./bufferreader";
import { BufferWriter } from "./bufferwriter";

export enum TypeKind {
  Number,
  String,
  Array,
  Generic,
}

export class TypeDescriptor {
  props: Map<string, TypeDescriptor>;
  propName: string[];
  constructor(
    public readonly kind: TypeKind,
    private readonly typeConstructor: any,
    public readonly arrayType?: TypeDescriptor) {
    this.props = new Map<string, TypeDescriptor>();
    this.propName = [];
  }

  create(): any {
    return new this.typeConstructor();
  }

  addProp(name: string, type: TypeDescriptor) {
    if (this.propName.length == 64) {
      throw new Error("Can't describe more than 64 properties per type");
    }
    this.props.set(name, type);
    this.propName.push(name);
  }
}

export class ObjUtils {
  public static arrayRemoveReplacingWithLast<T>(array: T[], element: T) {
    let idxComp = array.indexOf(element);
    if (idxComp >= 0) {
      // Replace it with the last, and reduce length by one
      if (idxComp < array.length - 1) {
        array[idxComp] = array[array.length - 1];
      }
      array.length -= 1;
    }
  }

  public static cloneUsingTypeDescriptor(src: any, typeDescr: TypeDescriptor): any {
    switch (typeDescr.kind) {
      case TypeKind.Number:
      case TypeKind.String:
        return src;

      case TypeKind.Generic:
        let dst = typeDescr.create();
        for (let srcKey in src) {
          let propTypeDescr = typeDescr.props.get(srcKey);
          dst[srcKey] = ObjUtils.cloneUsingTypeDescriptor(src[srcKey], propTypeDescr!);
        }
        return dst;

      case TypeKind.Array:
        let dstArr = [];
        for (let srcItem of src) {
          dstArr.push(ObjUtils.cloneUsingTypeDescriptor(srcItem, typeDescr.arrayType!));
        }
        return dstArr;

      default:
        throw new Error("Type kind not supported: " + typeDescr.kind);
    }
    
  }

  public static cloneDiscardingTypes(src: any): any {
    if (typeof src === "number" || typeof src === "string") {
      return src;
    } else if (Array.isArray(src)) {
      let dstObj: any[] = [];
      for (let srcKey in src) {
        dstObj[srcKey as any] = ObjUtils.cloneDiscardingTypes(src[srcKey]);
      }
      return dstObj;
    } else {
      let dstObj: any = {};
      for (let srcKey in src) {
        dstObj[srcKey] = ObjUtils.cloneDiscardingTypes(src[srcKey]);
      }
      return dstObj;
    }
  }

  public static cloneArrayUsingType(srcArray: any[],
    type: any,
    copyFunc: any): any {
    let dstArray = [];
    for (let srcUnit of srcArray) {
      let dstUnit = new type();
      copyFunc(srcUnit, dstUnit)
      dstArray.push(dstUnit);
    }
    return dstArray;
  }

  public static serialize(writer: BufferWriter, value: any, type: TypeDescriptor) {
    switch (type.kind) {
      case TypeKind.Number:
        writer.writeFloat32(value);
        break;

      case TypeKind.String:
        writer.writeString(value);
        break;

      case TypeKind.Generic:
        for (let i = 0; i < type.propName.length; i++) {
          let propName = type.propName[i];
          let propType = type.props.get(propName)!;
          ObjUtils.serialize(writer, value[propName], propType);
        }
        break;

      case TypeKind.Array:
        writer.writeUint32(value.length);
        for (let i = 0; i < value.length; i++) {
          ObjUtils.serialize(writer, value[i], type.arrayType!);
        }
        break;

      default:
        throw new Error("Type kind not supported: " + type.kind);
    }
  }

  public static deserialize(reader: BufferReader, type: TypeDescriptor): any {
    switch (type.kind) {
      case TypeKind.Number:
        return reader.readFloat32();

      case TypeKind.String:
        return reader.readString();

      case TypeKind.Generic:
        let value = type.create();
        for (let i = 0; i < type.propName.length; i++) {
          let propName = type.propName[i];
          let propType = type.props.get(propName)!;
          value[propName] = ObjUtils.deserialize(reader, propType);
        }
        return value;

      case TypeKind.Array:
        let arrayLength = reader.readUint32();
        let valueArr = [];
        for (let i = 0; i < arrayLength; i++) {
          valueArr[i] = ObjUtils.deserialize(reader, type.arrayType!);
        }
        return valueArr;

      default:
        throw new Error("Type kind not supported: " + type.kind);
    }
  }

  public static copyProps(srcObj: any, dstObj: any): void {
    for (let key in srcObj) {
      dstObj[key] = srcObj[key];
    }
  }

  public static assertIsTrue(value: boolean) {
    if (!value) {
      debugger;
    }
  }
  public static assertEquals(expectedValue: any, actualValue: any) {
    if (expectedValue !== actualValue) {
      debugger;
    }
  }
}