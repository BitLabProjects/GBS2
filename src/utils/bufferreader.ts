export class BufferReader {
  private view: DataView;
  private off: number;
  constructor(buff: Uint8Array) {
    this.view = new DataView(buff.buffer);
    this.off = 0;
  }

  readUint8() {
    let result = this.view.getUint8(this.off);
    this.off += 1;
    return result;
  }
  readInt32() {
    let result = this.view.getInt32(this.off);
    this.off += 4;
    return result;
  }
  readUint32() {
    let result = this.view.getUint32(this.off);
    this.off += 4;
    return result;
  }
  readUint64() {
    let result = this.view.getBigInt64(this.off);
    this.off += 8;
    return result;
  }
  readFloat32() {
    let result = this.view.getFloat64(this.off);
    this.off += 8;
    return result;
  }
  readString() {
    let length = this.readUint32();
    let result = "";
    for (let i = 0; i < length; i++) {
      let charCode = this.view.getUint16(this.off);
      this.off += 2;
      result += String.fromCharCode(charCode);
    }
    return result;
  }
}