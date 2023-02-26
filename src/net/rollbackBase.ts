import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { IKeyFrameState, RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { LeProt } from "./leprot";
import { ObjUtils, TypeDescriptor, TypeKind } from "../utils/objutils";

export class LeProtMsg_RollbackInit {
  initialState: IKeyFrameState;
  assignedPlayerId: number;

  static createTypeDescriptor(keyFrameStateTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackInit);
    td.addProp("initialState", keyFrameStateTypeDescr);
    td.addProp("assignedPlayerId", TypeDescriptor.Int32);
    return td;
  }
}

export class LeProtMsg_RollbackState {
  keyFrameState: IKeyFrameState;

  static createTypeDescriptor(keyFrameStateTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackState);
    td.addProp("keyFrameState", keyFrameStateTypeDescr);
    return td;
  }
}

export class LeProtMsg_RollbackStateHash {
  constructor(
    public frame: number,
    public hash: number) { }

  static createTypeDescriptor(): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackStateHash);
    td.addProp("frame", TypeDescriptor.Int32);
    td.addProp("hash", TypeDescriptor.UInt32);
    return td;
  }
}

export class LeProtMsg_RollbackInput {
  frame: number;
  playerId: number;
  input: any;
  frameSync: number; //Piggy-back the currently synced frame

  static createTypeDescriptor(inputTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackInput);
    td.addProp("frame", TypeDescriptor.Int32);
    td.addProp("playerId", TypeDescriptor.Int32);
    td.addProp("input", inputTypeDescr);
    td.addProp("frameSync", TypeDescriptor.Int32);
    return td;
  }
}

export class KeyFrameState implements IKeyFrameState {
  frame: number;
  state: any;
  playerInputs: any[];

  static createTypeDescriptor(stateTypeDescr: TypeDescriptor, inputTypeDescr: TypeDescriptor): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, LeProtMsg_RollbackInit);
    td.addProp("frame", TypeDescriptor.Int32);
    td.addProp("state", stateTypeDescr);
    td.addProp("playerInputs", new TypeDescriptor(TypeKind.Array, undefined, inputTypeDescr));
    return td;
  }
}

export class RollbackBase<TInput extends NetplayInput<TInput>> {
  stats: HTMLDivElement;
  debugButton: HTMLButtonElement;

  pingMeasure: StatCounter = new StatCounter(0.2);

  game: Game<TInput>;

  rollbackNetcode?: RollbackNetcode<Game<TInput>, TInput>;

  peer?: Peer.Peer;
  leprot: LeProt;
  leprotMsgId_RollbackInit: number;
  leprotMsgId_RollbackState: number;
  leprotMsgId_RollbackStateHash: number;
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

    let leprotType_RollbackStateHash = this.leprot.registerType(LeProtMsg_RollbackStateHash.createTypeDescriptor());
    this.leprotMsgId_RollbackStateHash = this.leprot.createMessageType(leprotType_RollbackStateHash);

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

    this.debugButton = document.createElement("button");
    this.debugButton.style.zIndex = "1";
    this.debugButton.style.position = "absolute";
    this.debugButton.style.right = "5px";
    this.debugButton.style.top = "5px";
    this.debugButton.style.padding = "5px";
    this.debugButton.textContent = "Debug";
    this.debugButton.onclick = () => {
      let content = JSON.stringify(this.rollbackNetcode?.getKeyframeHistory());
      let blob = new Blob([content], {
        type: "application/json",
      })
      ObjUtils.downloadBlob(blob, "log_keyframehistory.txt");
    };
    document.body.appendChild(this.debugButton);
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