import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { IKeyFrameState, RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { IRBPMessage_Init, IRBPMessage_Input, IRBPMessage_State, RollbackBase } from "./rollbackBase";

const PING_INTERVAL = 100;

interface IClientConnData {
  conn: Peer.DataConnection;
  connIsOpen: boolean;
  playerId: number;
  initSent: boolean;
}

export class RollbackHost<TInput extends NetplayInput<TInput>> extends RollbackBase<TInput> {
  connectedClients: IClientConnData[];

  constructor(game: Game<TInput>) {
    super(game);
    this.connectedClients = [];
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

      // Wait for a connection from a client.
      this.peer!.on("connection", (conn: Peer.DataConnection) => {
        this.onClientConnected(conn);
      });
      this.startHost();
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

  startHost() {
    log.info("Starting a rollback host.");

    this.rollbackNetcode = new RollbackNetcode(
      true,
      this.game,
      undefined,
      0,
      100,
      this.pingMeasure,
      this.game.timestep,
      () => this.game.getStartInput(),
      () => this.game.getInput(),
      (frame, playerId, input) => {
        //Send the input to every player
        let msg: IRBPMessage_Input = {
          type: "input",
          frame: frame,
          playerId: playerId,
          input: input.serialize()
        };
        for (let clientConnData of this.connectedClients) {
          if (!clientConnData.connIsOpen || !clientConnData.initSent) {
            continue;
          }
          console.log(`Sending input for frame ${frame} to player ${clientConnData.playerId}`);
          clientConnData.conn.send(msg);
        }
      },
      (keyFrameState: IKeyFrameState) => {
        //Send the official state for the frame to every player
        for (let clientConnData of this.connectedClients) {
          if (!clientConnData.connIsOpen) {
            continue;
          }
          if (clientConnData.initSent) {
            console.log(`Sending state ${keyFrameState.frame} to player ${clientConnData.playerId}`);
            let msg: IRBPMessage_State = {
              type: "state",
              keyFrameState: keyFrameState,
            };
            clientConnData.conn.send(msg);

          } else {
            console.log(`Sending init ${keyFrameState.frame} to player ${clientConnData.playerId}`);
            clientConnData.initSent = true;
            let msg: IRBPMessage_Init = {
              type: "init",
              initialState: keyFrameState,
              assignedPlayerId: clientConnData.playerId,
            };
            clientConnData.conn.send(msg);
          }
        }
      }
    );

    this.startGameLoop();
  }

  onClientConnected(conn: Peer.DataConnection) {
    //this.watchRTCStats(conn.peerConnection);

    conn.on("error", (err: any) => console.error(err));

    conn.on("open", () => {
      this.onClientConnectionOpen(conn);
    });
  }

  onClientConnectionOpen(conn: Peer.DataConnection) {
    console.log("Client has connected... Starting game...");
    let player = this.rollbackNetcode!.addPlayer();
    let clientData = {
      conn: conn,
      connIsOpen: true,
      playerId: player.getID(),
      initSent: false,
    }
    this.connectedClients.push(clientData);
    
    conn.on("data", (data: any) => {
      if (data.type === "input") {
        let input = this.game.getStartInput();
        input.deserialize(data.input);
        this.rollbackNetcode!.onRemoteInput(data.frame, data.playerId, input);

      } else if (data.type == "init-done") {
        // Ok

      } else if (data.type == "ping-req") {
        conn.send({ type: "ping-resp", sent_time: data.sent_time });

      } else if (data.type == "ping-resp") {
        this.pingMeasure.update(Date.now() - data.sent_time);
      }
    });

    setInterval(() => {
      conn.send({ type: "ping-req", sent_time: Date.now() });
    }, PING_INTERVAL);
  }
}
