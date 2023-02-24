import { ObjUtils, TypeDescriptor, TypeKind } from "../utils/objutils";
import murmur32 from 'murmur-32';
import { BufferReader } from "../utils/bufferreader";
import { BufferWriter } from "../utils/bufferwriter";

export enum LeProtCmd {
  Ping = 0,
  Pong = 1,
  Pang = 2,
  FirstUserMessage = 10,
}

export enum LeProtSysVals {
  EndOfObject = 128,
}

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

  genMessage(messageTypeId: number, value: any) {
    let writer = new BufferWriter(this.tempBuffer);
    writer.writeUint8(messageTypeId);

    let typeId = this.messageTypes.get(messageTypeId);
    if (typeId === undefined) {
      throw new Error("Invalid messageTypeId: " + messageTypeId);
    }
    let type = this.types[typeId];
    ObjUtils.serialize(writer, value, type);
    return this.tempBuffer.slice(0, writer.length);
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