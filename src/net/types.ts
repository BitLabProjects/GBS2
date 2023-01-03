import { clone, copyfields as copyFields } from "./utils";

// Use a specific type only to tag using places, to be self-explanatory
export type SerializedState = any;

export abstract class NetplayState<TInput extends NetplayInput<TInput>> {
  abstract tick(playerInputs: Map<NetplayPlayer, TInput>): void;

  /**
   * By default, use the auto serializer.
   */
  serialize(): SerializedState {
    return clone(this);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: SerializedState): void {
    copyFields(value, this);
  }
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
    return clone(this);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: SerializedState): void {
    copyFields(value, this);
  }
}

export class NetplayPlayer {
  id: number;
  isLocal: boolean;
  isHost: boolean;

  constructor(id: number, isLocal: boolean, isHost: boolean) {
    this.id = id;
    this.isLocal = isLocal;
    this.isHost = isHost;
  }
  isLocalPlayer(): boolean {
    return this.isLocal;
  }
  isRemotePlayer(): boolean {
    return !this.isLocal;
  }
  isServer(): boolean {
    return this.isHost;
  }
  isClient(): boolean {
    return !this.isHost;
  }
  getID(): number {
    return this.id;
  }
}

export interface GameType<TState, TInput> {
  /**
   * Given a list of players, return the initial game state.
   */
  constructInitialState(players: Array<NetplayPlayer>): TState;

  /**
   * Construct a new input object with a default value. A new object
   * needs to be constructed, since serialized values will be copied into this.
   */
  constructDefaultInput(): TInput;

  /**
   * The game simulation timestep, in milliseconds.
   */
  timestep: number;

  // The dimensions of the rendering canvas.
  canvasWidth: number;
  canvasHeight: number;

  draw(state: TState, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void;

  getInputReader(
    document: HTMLDocument,
    canvas: HTMLCanvasElement
  ): () => TInput;
}
