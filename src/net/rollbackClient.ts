import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { IRBPMessage, IRBPMessage_Init, IRBPMessage_Input, RollbackBase } from "./rollbackBase";

const PING_INTERVAL = 1000;

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
        serialization: "json",
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
    this.conn.on("data", (data: IRBPMessage) => {
      if (data.type === "input") {
        let input = this.game.getStartInput();
        input.deserialize(data.input);
        // TODO Le the host tell also the playerId for the input
        this.rollbackNetcode!.onRemoteInput(data.frame, data.playerId, input);

      } else if (data.type === "state") {
        this.rollbackNetcode!.onStateSync(data.keyFrameState);

      } else if (data.type == "init") {
        // The init message is sent as the first message after a client connects
        // It contains the initial state, along with all the players present and relative input for that frame
        // It also tells the starting frame number and the playerID assigned to the client
        this.onClientInitFromHost(data);
        this.conn.send({ type: "init-done" });

      } else if (data.type == "ping-req") {
        this.conn.send({ type: "ping-resp", sent_time: data.sent_time });

      } else if (data.type == "ping-resp") {
        this.pingMeasure.update(Date.now() - data.sent_time);
      }
    });
    this.conn.on("open", () => {
      console.log("Successfully connected to server... Starting game...");

      setInterval(() => {
        this.conn.send({ type: "ping-req", sent_time: Date.now() });
      }, PING_INTERVAL);
    });
  }

  onClientInitFromHost(data: IRBPMessage_Init) {
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
        let msg: IRBPMessage_Input = {
          type: "input",
          frame: frame,
          playerId: playerId,
          input: input.serialize()
        };
        this.conn.send(msg);
      }
    );

    this.startGameLoop();
  }
}
