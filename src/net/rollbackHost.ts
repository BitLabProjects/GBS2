import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { RollbackBase } from "./rollbackBase";

const PING_INTERVAL = 100;

export class RollbackHost<TInput extends NetplayInput<TInput>> extends RollbackBase<TInput> {
  constructor(game: Game<TInput>) {
    super(game);
  }

  start(roomName: string) {
    log.info("Creating a PeerJS instance.");
    this.stats.innerHTML = "Waiting players...";

    let roomUUID = getUuidByString(roomName);

    this.peer = new Peer.Peer(roomUUID);
    this.peer.on("error", (err: any) => console.error(err));

    window.onbeforeunload = () => {
      console.log("Disconnecting...");
      this.peer?.disconnect();
      console.log("Disconnected");
    };

    this.peer!.on("open", (id: any) => {
      // We are host, so we need to show a join link.
      log.info("Showing join link.");

      // Construct the players array.
      const players: Array<NetplayPlayer> = [
        new NetplayPlayer(0, true, true), // Player 0 is us, acting as a host.
        new NetplayPlayer(1, false, false), // Player 1 is our peer, acting as a client.
      ];

      // Wait for a connection from a client.
      this.peer!.on("connection", (conn: Peer.DataConnection) => {
        conn.on("error", (err: any) => console.error(err));

        //this.watchRTCStats(conn.peerConnection);

        this.startHost(players, conn);
      });
    });
  }

  formatRTCStats(stats: RTCStatsReport): string {
    let output = "";
    stats.forEach((report) => {
      output += `<details>`;
      output += `<summary>${report.type}</summary>`;

      Object.keys(report).forEach((key) => {
        if (key !== "type") {
          output += `<div>${key}: ${report[key]}</div> `;
        }
      });

      output += `</details>`;
    });
    return output;
  }

  rtcStats: string = "";
  watchRTCStats(connection: RTCPeerConnection) {
    setInterval(() => {
      connection
        .getStats()
        .then((stats) => (this.rtcStats = this.formatRTCStats(stats)));
    }, 1000);
  }

  startHost(players: Array<NetplayPlayer>, conn: Peer.DataConnection) {
    log.info("Starting a rollback host.");

    this.game.init(players);

    this.rollbackNetcode = new RollbackNetcode(
      true,
      this.game,
      players,
      this.getInitialInputs(players),
      100,
      this.pingMeasure,
      this.game.timestep,
      () => this.game.getInput(),
      (frame, input) => {
        conn.send({ type: "input", frame: frame, input: input.serialize() });
      },
      (frame, state) => {
        conn.send({ type: "state", frame: frame, state: state });
      }
    );

    conn.on("data", (data: any) => {
      if (data.type === "input") {
        let input = this.game.getStartInput();
        input.deserialize(data.input);
        this.rollbackNetcode!.onRemoteInput(data.frame, players![1], input);
      } else if (data.type == "ping-req") {
        conn.send({ type: "ping-resp", sent_time: data.sent_time });
      } else if (data.type == "ping-resp") {
        this.pingMeasure.update(Date.now() - data.sent_time);
      }
    });

    conn.on("open", () => {
      console.log("Client has connected... Starting game...");

      setInterval(() => {
        conn.send({ type: "ping-req", sent_time: Date.now() });
      }, PING_INTERVAL);
    });

    this.startGameLoop();
  }
}
