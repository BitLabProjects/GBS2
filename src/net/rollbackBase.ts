import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { IKeyFrameState, RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { LeProt } from "./leprot";
import { TypeDescriptor, TypeKind } from "../utils/objutils";

const PING_INTERVAL = 100;

export type IRBPMessage = IRBPMessage_Input;
export interface IRBPMessage_Input {
  type: "input";
  frame: number;
  playerId: number;
  input: any;
}

export class LeProtMsg_RollbackInit {
  initialState: IKeyFrameState;
  assignedPlayerId: number;

  static createTypeDescriptor(keyFrameStateTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackInit);
    td.props.set("initialState", keyFrameStateTypeDescr);
    td.props.set("assignedPlayerId", new TypeDescriptor(TypeKind.Number, undefined));
    return td;
  }
}

export class LeProtMsg_RollbackState {
  keyFrameState: IKeyFrameState;

  static createTypeDescriptor(keyFrameStateTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackState);
    td.props.set("keyFrameState", keyFrameStateTypeDescr);
    return td;
  }
}

export class LeProtMsg_RollbackInput {
  frame: number;
  playerId: number;
  input: any;

  static createTypeDescriptor(inputTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackInput);
    let numTd = new TypeDescriptor(TypeKind.Number, undefined);
    td.props.set("frame", numTd);
    td.props.set("playerId", numTd);
    td.props.set("input", inputTypeDescr);
    return td;
  }
}

export class KeyFrameState implements IKeyFrameState {
  frame: number;
  state: any;
  playerInputs: any[];

  static createTypeDescriptor(stateTypeDescr: TypeDescriptor, inputTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackInit);
    td.props.set("frame", new TypeDescriptor(TypeKind.Number, undefined));
    td.props.set("state", stateTypeDescr);
    td.props.set("playerInputs", new TypeDescriptor(TypeKind.Array, undefined, inputTypeDescr));
    return td;
  }
}

export class RollbackBase<TInput extends NetplayInput<TInput>> {
  stats: HTMLDivElement;

  pingMeasure: StatCounter = new StatCounter(0.2);

  game: Game<TInput>;

  rollbackNetcode?: RollbackNetcode<Game<TInput>, TInput>;

  peer?: Peer.Peer;
  leprot: LeProt;
  leprotMsgId_RollbackInit: number;
  leprotMsgId_RollbackState: number;
  leprotMsgId_RollbackInput: number;

  constructor(game: Game<TInput>) {
    this.game = game;
    this.leprot = new LeProt();

    let stateTypeDef = this.game.getGameStateTypeDef();
    let inputTypeDef = this.game.getGameInputTypeDef();
    let keyFrameStateTD = KeyFrameState.createTypeDescriptor(stateTypeDef, inputTypeDef);

    let leprotType_RollbackInit = this.leprot.registerType(LeProtMsg_RollbackInit.createTypeDescriptor(keyFrameStateTD));
    this.leprotMsgId_RollbackInit = this.leprot.createMessageType(leprotType_RollbackInit);

    let leprotType_RollbackState = this.leprot.registerType(LeProtMsg_RollbackState.createTypeDescriptor(keyFrameStateTD));
    this.leprotMsgId_RollbackState = this.leprot.createMessageType(leprotType_RollbackState);

    let leprotType_RollbackInput = this.leprot.registerType(LeProtMsg_RollbackInput.createTypeDescriptor(inputTypeDef));
    this.leprotMsgId_RollbackInput = this.leprot.createMessageType(leprotType_RollbackInput);

    // Create stats UI
    this.stats = document.createElement("div");
    this.stats.style.zIndex = "1";
    this.stats.style.position = "absolute";
    this.stats.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    this.stats.style.color = "white";
    this.stats.style.padding = "5px";

    document.body.appendChild(this.stats);
  }

  getInitialInputs(
    players: Array<NetplayPlayer>
  ): Map<NetplayPlayer, TInput> {
    let initialInputs: Map<NetplayPlayer, TInput> = new Map();
    for (let player of players) {
      initialInputs.set(player, this.game.getStartInput());
    }
    return initialInputs;
  }

  startGameLoop() {
    // Start the netcode game loop.
    this.rollbackNetcode!.start();

    let frameCount = 0;
    let animate = () => {
      // Draw state to canvas.
      this.game!.draw();

      // Update stats
      frameCount += 1;
      if (frameCount === 30) {
        frameCount = 0;
        /*
          <div>History Size: ${this.rollbackNetcode!.history.length}</div>
          <div>Frame Number: ${this.rollbackNetcode!.currentFrame()}</div>
          <div>Largest Future Size: ${this.rollbackNetcode!.largestFutureSize()}</div>
        */
        this.stats.innerHTML = `
          <div>Ping: ${this.pingMeasure
            .average
            .toFixed(2)} ms +/- ${this.pingMeasure.stddev.toFixed(2)} ms</div>
          <div>Pred. Frames: ${this.rollbackNetcode!.predictedFrames()}</div>
          <div title="If true, then the other player is running slow, so we wait for them.">Stalling: ${this.rollbackNetcode!.shouldStall()}</div>
          ${this.getStats()}
          `;
      }

      // Request another frame.
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  protected getStats(): string {
    return "";
  }
}