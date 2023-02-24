import { ObjUtils, TypeDescriptor } from "../utils/objutils";
import { copyfields as copyFields } from "./utils";

// Use a specific type only to tag using places, to be self-explanatory
export type SerializedState = any;

export interface NetplayState<TInput extends NetplayInput<TInput>> {
  tick(playerInputs: Map<NetplayPlayer, TInput>): void;
  serialize(): SerializedState;
  deserialize(value: SerializedState): void;
  getGameStateTypeDef(): TypeDescriptor;
  getGameInputTypeDef(): TypeDescriptor;
}

export abstract class NetplayInput<TInput extends NetplayInput<TInput>> {
  /**
   * By default, the prediction is to just use the same value.
   */
  predictNext(): TInput {
    // @ts-ignore
    return this;
  }

  /**
   * By default, use the auto serializer.
   */
  serialize(): SerializedState {
    return ObjUtils.cloneDiscardingTypes(this);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: SerializedState): void {
    copyFields(value, this);
  }
}

export class NetplayPlayer {
  constructor(private id: number, private isLocal: boolean) {
  }
  isLocalPlayer(): boolean {
    return this.isLocal;
  }
  getID(): number {
    return this.id;
  }
}
