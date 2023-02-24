import murmur32 from "murmur-32";
import { BufferReader } from "./bufferreader";
import { BufferWriter } from "./bufferwriter";

export enum TypeKind {
  Float32,
  Int32,
  UInt32,
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

  public static readonly Float32: TypeDescriptor = new TypeDescriptor(TypeKind.Float32, undefined);
  public static readonly Int32: TypeDescriptor = new TypeDescriptor(TypeKind.Int32, undefined);
  public static readonly UInt32: TypeDescriptor = new TypeDescriptor(TypeKind.UInt32, undefined);
  public static readonly String: TypeDescriptor = new TypeDescriptor(TypeKind.String, undefined);

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
      case TypeKind.Float32:
      case TypeKind.Int32:
      case TypeKind.UInt32:
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
      case TypeKind.Float32:
        writer.writeFloat32(value);
        break;

      case TypeKind.Int32:
        writer.writeInt32(value);
        break;

      case TypeKind.UInt32:
        writer.writeUint32(value);
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
      case TypeKind.Float32:
        return reader.readFloat32();

      case TypeKind.Int32:
        return reader.readInt32();

      case TypeKind.UInt32:
        return reader.readUint32();

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

  static buffer = new Uint8Array(64 * 1024);
  public static getObjectHash(value: any, typeDef: TypeDescriptor) {
    let writer = new BufferWriter(ObjUtils.buffer);
    ObjUtils.serialize(writer, value, typeDef);
    let finalBuffer = ObjUtils.buffer.slice(0, writer.length);
    let stateHashBuff = murmur32(finalBuffer.buffer);
    let view = new DataView(stateHashBuff);
    return view.getUint32(0);
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