export class TypeDescriptor {
  props: { [x: string]: TypeDescriptor };
  constructor(public readonly type: any, public readonly isArray: boolean = false) {
    this.props = {};
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

  public static clone(object: any): any {
    return JSON.parse(JSON.stringify(object));
  }

  public static cloneUsingTypeDescriptor(src: any, typeDescr: TypeDescriptor): any {
    let dst = new typeDescr.type();
    for(let srcKey in src) {
      if (typeDescr.props[srcKey]) {
        let propTypeDescr = typeDescr.props[srcKey];
        if (propTypeDescr.isArray) {
          let dstArr = [];
          for(let srcItem of src[srcKey]) {
            dstArr.push(ObjUtils.cloneUsingTypeDescriptor(srcItem, propTypeDescr));
          }
          dst[srcKey] = dstArr;
        } else { 
          dst[srcKey] = ObjUtils.cloneUsingTypeDescriptor(src[srcKey], propTypeDescr);
        }
      } else {
        dst[srcKey] = ObjUtils.clone(src[srcKey]);
      }
    }
    return dst;
  }

  public static cloneArrayUsingType(srcArray: any[], 
                                    type: any,
                                    copyFunc: any): any {
    let dstArray = [];
    for(let srcUnit of srcArray) {
      let dstUnit = new type();
      copyFunc(srcUnit, dstUnit)
      dstArray.push(dstUnit);
    }
    return dstArray;
  }

  public static copyProps(srcObj: any, dstObj: any): void {
    for(let key in srcObj) {
      dstObj[key] = srcObj[key];
    }
  }
}