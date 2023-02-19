import { ObjUtils, TypeDescriptor, TypeKind } from "../utils/objutils";
import murmur32 from 'murmur-32';
import { BufferReader } from "../utils/bufferreader";
import { BufferWriter } from "../utils/bufferwriter";

export enum LeProtCmd {
  Ping = 0,
  Pong = 1,
  Pang = 2,
  TypeHash = 3,
  FirstUserMessage = 10,
}

export enum LeProtSysVals {
  EndOfObject = 128,
}

// export class LeProtType {
//   public propName: string[];
//   public propType: LeProtType[];
//   public arrayType: LeProtType | undefined;
//   constructor(public typeDescr: TypeDescriptor) {
//     this.propName = [];
//     this.propType = [];
//     for (let [propName, propTd] of typeDescr.props) {
//       if (this.propName.length == 64) {
//         throw new Error("Can't describe more than 64 properties per type");
//       }
//       this.propName.push(propName);
//       this.propType.push(new LeProtType(propTd));
//     }
//     if (typeDescr.kind === TypeKind.Array) {
//       this.arrayType = new LeProtType(typeDescr.arrayType!);
//     }
//   }
// }

export class LeProt {
  private types: TypeDescriptor[];
  private messageTypes: Map<number, number>;
  private nextMessageTypeId: number;
  private tempBuffer = new Uint8Array(1024 * 64);
  constructor() {
    this.types = [];
    this.messageTypes = new Map<number, number>();
    this.nextMessageTypeId = LeProtCmd.FirstUserMessage;
  }

  registerType(typeDescr: TypeDescriptor): number {
    if (this.types.length === 64) {
      throw new Error("Can't register more than 64 types");
    }
    return this.types.push(typeDescr) - 1;
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

  genMessage(messageTypeId: number, value: any, hashOnly?: boolean) {
    let writer = new BufferWriter(this.tempBuffer);

    if (!hashOnly) {
      writer.writeUint8(messageTypeId);
    }

    let typeId = this.messageTypes.get(messageTypeId);
    if (typeId === undefined) {
      throw new Error("Invalid messageTypeId: " + messageTypeId);
    }
    let type = this.types[typeId];
    ObjUtils.serialize(writer, value, type);

    let result = this.tempBuffer.slice(0, writer.length);
    if (hashOnly) {
      // The buffer now contains the serialized value, hash it
      let murmurValue = murmur32(result.buffer);
      writer.setOffset(0);
      writer.writeUint8(LeProtCmd.TypeHash);
      writer.writeUint8(messageTypeId);
      writer.writeBytes(new Uint8Array(murmurValue));
      result = this.tempBuffer.slice(0, writer.length);
    }

    return result;
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
      return { command: cmd, payload: ObjUtils.deserialize(reader, type) };
    }

    throw new Error("LeProt protocol error");
  }
}