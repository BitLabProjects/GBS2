import { DefaultInputReader } from "./defaultinput";
import { NetplayInput, NetplayPlayer } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import * as Peer from "peerjs";

import * as QRCode from "qrcode";
import * as queryString from "query-string";
import * as getUuidByString from 'uuid-by-string'

export abstract class GameWrapper<TInput extends NetplayInput<TInput>> {
  game: Game<TInput>;

  /** The network stats UI. */
  stats: HTMLDivElement;

  /** The floating menu used to select a match. */
  menu: HTMLDivElement;

  constructor(game: Game<TInput>) {
    this.game = game;

    // Create stats UI
    this.stats = document.createElement("div");
    this.stats.style.zIndex = "1";
    this.stats.style.position = "absolute";
    this.stats.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    this.stats.style.color = "white";
    this.stats.style.padding = "5px";
    this.stats.style.display = "none";

    document.body.appendChild(this.stats);

    // Create menu UI
    this.menu = document.createElement("div");
    this.menu.style.zIndex = "1";
    this.menu.style.position = "absolute";
    this.menu.style.backgroundColor = "white";
    this.menu.style.padding = "5px";
    this.menu.style.left = "0%";
    this.menu.style.bottom = "0%";
    this.menu.style.boxShadow = "0px 0px 10px black";
    this.menu.style.transform = "translate(0%, 0%)";

    document.body.appendChild(this.menu);
  }

  peer?: Peer.Peer;

  start(roomName: string, isClient: boolean) {
    log.info("Creating a PeerJS instance.");
    this.menu.innerHTML = "Waiting players...";

    let roomUUID = getUuidByString(roomName);

    this.peer = isClient ? new Peer.Peer() : new Peer.Peer(roomUUID);
    this.peer.on("error", (err: any) => console.error(err));

    window.onbeforeunload = () => {
      console.log("Disconnecting...");
      this.peer?.disconnect();
      console.log("Disconnected");
    };

    this.peer!.on("open", (id: any) => {
      // Try to parse the room from the hash. If we find one,
      // we are a client.
      //const parsedHash = queryString.default.parse(window.location.hash);
      //const isClient = !!parsedHash.room;

      if (isClient) {
        // We are a client, so connect to the room from the hash.
        this.menu.style.display = "none";

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
      } else {
        // We are host, so we need to show a join link.
        log.info("Showing join link.");

        // Construct the players array.
        const players: Array<NetplayPlayer> = [
          new NetplayPlayer(0, true, true), // Player 0 is us, acting as a host.
          new NetplayPlayer(1, false, false), // Player 1 is our peer, acting as a client.
        ];

        // Wait for a connection from a client.
        this.peer!.on("connection", (conn: any) => {
          // Make the menu disappear.
          this.menu.style.display = "none";
          conn.on("error", (err: any) => console.error(err));

          this.startHost(players, conn);
        });
      }
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

  abstract startHost(players: Array<NetplayPlayer>, conn: Peer.DataConnection): void;
  abstract startClient(
    players: Array<NetplayPlayer>,
    conn: Peer.DataConnection
  ): void;
}
