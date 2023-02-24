import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { IRBPMessage, IRBPMessage_Input, LeProtMsg_RollbackInit, LeProtMsg_RollbackInput, LeProtMsg_RollbackState, LeProtMsg_RollbackStateHash, RollbackBase } from "./rollbackBase";
import { LeProtCmd } from "./leprot";

export class RollbackClient<TInput extends NetplayInput<TInput>> extends RollbackBase<TInput> {
  private conn: Peer.DataConnection;

  constructor(game: Game<TInput>) {
    super(game);
  }

  start(roomName: string) {
    log.info("Creating a PeerJS instance.");
    this.stats.innerHTML = "Waiting players...";

    let roomUUID = getUuidByString(roomName);

    this.peer = new Peer.Peer();
    this.peer.on("error", (err: any) => console.error(err));

    window.onbeforeunload = () => {
      console.log("Disconnecting...");
      this.peer?.disconnect();
      console.log("Disconnected");
    };

    this.peer.on("open", (id: any) => {
      // We are a client, so connect to the room from the hash.

      log.info(`Connecting to room ${roomName}.`);

      this.conn = this.peer!.connect(roomUUID as string, {
        serialization: "binary",
        reliable: true,
        // @ts-ignore
        _payload: {
          // This is a hack to get around a bug in PeerJS
          originator: true,
          reliable: true,
        },
      });

      this.conn.on("error", (err: any) => console.error(err));

      this.startClient();
    });
  }

  startClient() {
    // Having a typed argument does not guarantee the message is properly formatted.
    // It helps only during development
    this.conn.on("data", (data: any) => {
      let msg = this.leprot.parseMessage(new Uint8Array(data));
      switch (msg.command) {
        case LeProtCmd.Ping:
          this.conn.send(this.leprot.genPong(msg.payload, BigInt(Date.now())));
          break;

        case LeProtCmd.Pang:
          let diff = BigInt(Date.now()) - msg.payload;
          this.pingMeasure.update(Number(diff));
          break;

        case this.leprotMsgId_RollbackInit:
          // The init message is sent as the first message after a client connects
          // It contains the initial state, along with all the players present and relative input for that frame
          // It also tells the starting frame number and the playerID assigned to the client
          this.onClientInitFromHost(msg.payload as LeProtMsg_RollbackInit);
          break;

        case this.leprotMsgId_RollbackState:
          let rollbackState = msg.payload as LeProtMsg_RollbackState;
          this.rollbackNetcode!.onStateSync(rollbackState.keyFrameState);
          break;

        case this.leprotMsgId_RollbackStateHash:
          let rollbackStateHash = msg.payload as LeProtMsg_RollbackStateHash;
          this.rollbackNetcode!.onStateSyncHash(rollbackStateHash.frame, rollbackStateHash.hash);
          break;

        case this.leprotMsgId_RollbackInput:
            let rollbackInput = msg.payload as LeProtMsg_RollbackInput;
            this.rollbackNetcode!.onRemoteInput(rollbackInput.frame, rollbackInput.playerId, rollbackInput.input);
          break;
      }
    });
    this.conn.on("open", () => {
      console.log("Successfully connected to server... Starting game...");
    });
  }

  onClientInitFromHost(data: LeProtMsg_RollbackInit) {
    this.rollbackNetcode = new RollbackNetcode(
      false,
      this.game,
      data.initialState,
      data.assignedPlayerId,
      100,
      this.pingMeasure,
      this.game.timestep,
      () => this.game.getStartInput(),
      () => this.game.getInput(),
      (frame, playerId, input) => {
        //Send the input to every player
        let msg = new LeProtMsg_RollbackInput();
        msg.frame = frame;
        msg.playerId = playerId;
        msg.input = input.serialize();
        this.conn.send(this.leprot.genMessage(this.leprotMsgId_RollbackInput, msg));
      }
    );

    this.startGameLoop();
  }
}
