export class BufferWriter {
  private view: DataView;
  private off: number;
  constructor(buff: Uint8Array) {
    this.view = new DataView(buff.buffer);
    this.off = 0;
  }

  get length(): number {
    return this.off;
  }

  setOffset(value: number) {
    this.off = value;
  }

  writeUint8(value: number) {
    this.view.setUint8(this.off, value);
    this.off += 1;
  }
  writeInt32(value: number) {
    this.view.setInt32(this.off, value);
    this.off += 4;
  }
  writeUint32(value: number) {
    this.view.setUint32(this.off, value);
    this.off += 4;
  }
  writeUint64(value: bigint) {
    this.view.setBigUint64(this.off, value);
    this.off += 8;
  }
  writeFloat32(value: number) {
    this.view.setFloat64(this.off, value);
    this.off += 8;
  }
  writeString(value: string) {
    this.writeUint32(value.length);
    for (let i = 0; i < value.length; i++) {
      let charCode = value.charCodeAt(i)
      this.view.setUint16(this.off, charCode);
      this.off += 2;
    }
  }
  writeBytes(value: Uint8Array) {
    for (let i = 0; i < value.length; i++) {
      this.view.setUint8(this.off, value[i]);
      this.off += 1;
    }
  }
}