import { TypeDescriptor, TypeKind } from "../utils/objutils";

export enum LeProtCmd {
  Ping = 0,
  Pong = 1,
  Pang = 2,
  Message = 3,
}

export enum LeProtSysVals {
  EndOfObject = 128,
}

export class LeProtType {
  public propName: string[];
  public propType: LeProtType[];
  public arrayType: LeProtType | undefined;
  constructor(public typeDescr: TypeDescriptor) {
    this.propName = [];
    this.propType = [];
    for (let [propName, propTd] of typeDescr.props) {
      if (this.propName.length == 64) {
        throw new Error("Can't describe more than 64 properties per type");
      }
      this.propName.push(propName);
      this.propType.push(new LeProtType(propTd));
    }
    if (typeDescr.kind === TypeKind.Array) {
      this.arrayType = new LeProtType(typeDescr.arrayType!);
    }
  }
}

export class LeProt {
  private types: LeProtType[];
  private messageTypes: Map<number, number>;
  private nextMessageTypeId: number;
  constructor() {
    this.types = [];
    this.messageTypes = new Map<number, number>();
    this.nextMessageTypeId = LeProtCmd.Message;
  }

  registerType(typeDescr: TypeDescriptor): number {
    if (this.types.length === 64) {
      throw new Error("Can't register more than 64 types");
    }
    return this.types.push(new LeProtType(typeDescr)) - 1;
  }

  createMessageType(gameStateTypeId: number) {
    let id = this.nextMessageTypeId;
    this.nextMessageTypeId += 1;
    this.messageTypes.set(id, gameStateTypeId);
    return id;
  }

  genPingPang(cmd: LeProtCmd.Ping | LeProtCmd.Pang, date: bigint): Uint8Array {
    let buffer = new Uint8Array(1 + 8);
    let writer = new BufferWriter(buffer);
    writer.writeUint8(cmd);
    writer.writeUint64(date);
    return buffer;
  }

  genPong(date1: bigint, date2: bigint): Uint8Array {
    let buffer = new Uint8Array(1 + 8 + 8);
    let writer = new BufferWriter(buffer);
    writer.writeUint8(LeProtCmd.Pong);
    writer.writeUint64(date1);
    writer.writeUint64(date2);
    return buffer;
  }

  genMessage(messageTypeId: number, value: any) {
    let buffer = new Uint8Array(1024 * 64);
    let writer = new BufferWriter(buffer);
    writer.writeUint8(messageTypeId);

    let typeId = this.messageTypes.get(messageTypeId);
    if (typeId === undefined) {
      throw new Error("Invalid messageTypeId: " + messageTypeId);
    }
    let type = this.types[typeId];
    this.genMessageWriteValue(writer, value, type);
    return buffer.slice(0, writer.length);
  }

  genMessageWriteValue(writer: BufferWriter, value: any, type: LeProtType) {
    switch (type.typeDescr.kind) {
      case TypeKind.Number:
        writer.writeFloat32(value);
        break;

      case TypeKind.String:
        writer.writeString(value);
        break;

      case TypeKind.Generic:
        for (let i = 0; i < type.propName.length; i++) {
          let propValue = value[type.propName[i]];
          let propType = type.propType[i];
          // Write property index
          writer.writeUint8(i);
          // Recurse to write property value
          this.genMessageWriteValue(writer, propValue, propType);
        }
        writer.writeUint8(LeProtSysVals.EndOfObject);
        break;

      case TypeKind.Array:
        writer.writeUint32(value.length);
        for (let i = 0; i < value.length; i++) {
          this.genMessageWriteValue(writer, value[i], type.arrayType!);
        }
        break;

      default:
        throw new Error("Type kind not supported: " + type.typeDescr.kind);
    }
  }

  parseMessage(buffer: Uint8Array): { command: LeProtCmd, payload: any } {
    let reader = new BufferReader(buffer);
    let cmd = reader.readUint8();
    switch (cmd) {
      case LeProtCmd.Ping:
      case LeProtCmd.Pang:
        return { command: cmd, payload: reader.readUint64() };

      case LeProtCmd.Pong:
        let date1 = reader.readUint64();
        return { command: cmd, payload: { date1: date1, date2: reader.readUint64() } };
    }

    let typeId = this.messageTypes.get(cmd);
    if (typeId !== undefined) {
      let type = this.types[typeId];
      return { command: cmd, payload: this.parseMessageReadValue(reader, type) };
    }

    throw new Error("LeProt protocol error");
  }

  parseMessageReadValue(reader: BufferReader, type: LeProtType): any {
    switch (type.typeDescr.kind) {
      case TypeKind.Number:
        return reader.readFloat32();

      case TypeKind.String:
        return reader.readString();

      case TypeKind.Generic:
        let value = type.typeDescr.create();
        while (true) {
          let propId = reader.readUint8();
          if (propId == LeProtSysVals.EndOfObject) {
            break;
          }
          let propName = type.propName[propId];
          let propType = type.propType[propId];
          value[propName] = this.parseMessageReadValue(reader, propType);
        }
        return value;

      case TypeKind.Array:
        let arrayLength = reader.readUint32();
        let valueArr = [];
        for (let i = 0; i < arrayLength; i++) {
          valueArr[i] = this.parseMessageReadValue(reader, type.arrayType!);
        }
        return valueArr;

      default:
        throw new Error("Type kind not supported: " + type.typeDescr.kind);
    }
  }
}

class BufferWriter {
  private view: DataView;
  private off: number;
  constructor(buff: Uint8Array) {
    this.view = new DataView(buff.buffer);
    this.off = 0;
  }

  get length(): number {
    return this.off;
  }

  writeUint8(value: number) {
    this.view.setUint8(this.off, value);
    this.off += 1;
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
    this.view.setFloat32(this.off, value);
    this.off += 4;
  }
  writeString(value: string) {
    this.writeUint32(value.length);
    for (let i = 0; i < value.length; i++) {
      let charCode = value.charCodeAt(i)
      this.view.setUint16(this.off++, charCode);
      this.off += 2;
    }
  }
}

class BufferReader {
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
    let result = this.view.getFloat32(this.off);
    this.off += 4;
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