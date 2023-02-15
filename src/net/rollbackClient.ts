import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { RollbackBase } from "./rollbackBase";

const PING_INTERVAL = 100;

export class RollbackClient<TInput extends NetplayInput<TInput>> extends RollbackBase<TInput> {
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

    this.peer!.on("open", (id: any) => {
      // We are a client, so connect to the room from the hash.

      log.info(`Connecting to room ${roomName}.`);

      const conn = this.peer!.connect(roomUUID as string, {
        serialization: "json",
        reliable: true,
        // @ts-ignore
        _payload: {
          // This is a hack to get around a bug in PeerJS
          originator: true,
          reliable: true,
        },
      });

      conn.on("error", (err: any) => console.error(err));

      // Construct the players array.
      const players = [
        new NetplayPlayer(0, false, true), // Player 0 is our peer, the host.
        new NetplayPlayer(1, true, false), // Player 1 is us, a client
      ];

      this.startClient(players, conn);
    });
  }

  startClient(players: Array<NetplayPlayer>, conn: Peer.DataConnection) {
    log.info("Starting a lockstep client.");

    this.game.init(players);
    this.rollbackNetcode = new RollbackNetcode(
      false,
      this.game!,
      players,
      this.getInitialInputs(players),
      100,
      this.pingMeasure,
      this.game.timestep,
      () => this.game.getInput(),
      (frame, input) => {
        conn.send({ type: "input", frame: frame, input: input.serialize() });
      }
    );

    conn.on("data", (data: any) => {
      if (data.type === "input") {
        let input = this.game.getStartInput();
        input.deserialize(data.input);
        this.rollbackNetcode!.onRemoteInput(data.frame, players![0], input);
      } else if (data.type === "state") {
        this.rollbackNetcode!.onStateSync(data.frame, data.state);
      } else if (data.type == "ping-req") {
        conn.send({ type: "ping-resp", sent_time: data.sent_time });
      } else if (data.type == "ping-resp") {
        this.pingMeasure.update(Date.now() - data.sent_time);
      }
    });
    conn.on("open", () => {
      console.log("Successfully connected to server... Starting game...");

      setInterval(() => {
        conn.send({ type: "ping-req", sent_time: Date.now() });
      }, PING_INTERVAL);

      this.startGameLoop();
    });
  }
}
