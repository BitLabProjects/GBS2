import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { IKeyFrameState, RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'

const PING_INTERVAL = 100;

export type IRBPMessage = IRBPMessage_Input | IRBPMessage_State | IRBPMessage_Init | IRBPMessage_Ping | IRBPMessage_Pong;
export interface IRBPMessage_Input {
  type: "input";
  frame: number;
  playerId: number;
  input: any;
}
export interface IRBPMessage_State {
  type: "state";
  keyFrameState: IKeyFrameState;
}
export interface IRBPMessage_Init {
  type: "init";
  initialState: IKeyFrameState;
  assignedPlayerId: number;
}
export interface IRBPMessage_Ping {
  type: "ping-req";
  sent_time: number;
}
export interface IRBPMessage_Pong {
  type: "ping-resp";
  sent_time: number;
}

export class RollbackBase<TInput extends NetplayInput<TInput>> {
  /** The network stats UI. */
  stats: HTMLDivElement;

  pingMeasure: StatCounter = new StatCounter(0.2);

  game: Game<TInput>;

  rollbackNetcode?: RollbackNetcode<Game<TInput>, TInput>;

  peer?: Peer.Peer;

  constructor(game: Game<TInput>) {
    this.game = game;

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
          `;
      }

      // Request another frame.
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}