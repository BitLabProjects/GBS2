export enum TypeKind {
  Number,
  String,
  Array,
  Generic,
}

export class TypeDescriptor {
  props: Map<string, TypeDescriptor>;
  constructor(
    public readonly kind: TypeKind,
    private readonly typeConstructor: any,
    public readonly arrayType?: TypeDescriptor) {
    this.props = new Map<string, TypeDescriptor>();
  }

  create(): any {
    return new this.typeConstructor();
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