import * as Peer from "peerjs";
import StatCounter from "../utils/statcounter";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";

import * as log from "loglevel";
import { Game } from "./game";
import { IKeyFrameState, RollbackNetcode } from "./netcode/rollback";

import * as getUuidByString from 'uuid-by-string'
import { LeProtMsg_RollbackInit, LeProtMsg_RollbackInput, LeProtMsg_RollbackState, RollbackBase } from "./rollbackBase";
import { LeProtCmd } from "./leprot";

const PING_INTERVAL = 1000;

interface IClientConnData {
  conn: Peer.DataConnection;
  connIsOpen: boolean;
  playerId: number;
  initSent: boolean;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
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
        let msg = new LeProtMsg_RollbackInput();
        msg.frame = frame;
        msg.playerId = playerId;
        msg.input = input.serialize();
        for (let clientConnData of this.connectedClients) {
          if (!clientConnData.connIsOpen || !clientConnData.initSent) {
            continue;
          }
          //console.log(`Sending input for frame ${frame} to player ${clientConnData.playerId}`);
          clientConnData.conn.send(this.leprot.genMessage(this.leprotMsgId_RollbackInput, msg));
          clientConnData.packetsSent += 1;
        }
      },
      (keyFrameState: IKeyFrameState) => {
        //Send the official state for the frame to every player
        for (let clientConnData of this.connectedClients) {
          if (!clientConnData.connIsOpen) {
            continue;
          }
          if (clientConnData.initSent) {
            let msg = new LeProtMsg_RollbackState();
            msg.keyFrameState = keyFrameState;
            //console.log(`Sending state ${keyFrameState.frame} to player ${clientConnData.playerId}, size: ${JSON.stringify(msg).length} bytes`);
            clientConnData.conn.send(this.leprot.genMessage(this.leprotMsgId_RollbackState, msg));
            clientConnData.packetsSent += 1;

          } else {
            clientConnData.initSent = true;
            let msg = new LeProtMsg_RollbackInit();
            msg.initialState = keyFrameState;
            msg.assignedPlayerId = clientConnData.playerId;
            //console.log(`Sending init ${keyFrameState.frame} to player ${clientConnData.playerId}, size: ${JSON.stringify(msg).length} bytes`);
            clientConnData.conn.send(this.leprot.genMessage(this.leprotMsgId_RollbackInit, msg));
            clientConnData.packetsSent += 1;
          }
        }
      }
    );

    this.startGameLoop();
  }

  onClientConnected(conn: Peer.DataConnection) {
    conn.on("error", (err: any) => console.error(err));

    conn.on("open", () => {
      this.onClientConnectionOpen(conn);
    });
  }

  onClientConnectionOpen(conn: Peer.DataConnection) {
    console.log("Client has connected... Starting game...");
    let player = this.rollbackNetcode!.addPlayer();
    let clientData: IClientConnData = {
      conn: conn,
      connIsOpen: true,
      playerId: player.getID(),
      initSent: false,
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
    }
    this.connectedClients.push(clientData);

    this.watchRTCStats(clientData);

    conn.on("data", (data: any) => {
      let msg = this.leprot.parseMessage(new Uint8Array(data));
      switch (msg.command) {
        case LeProtCmd.Pong:
          let diff = BigInt(Date.now()) - msg.payload.date1;
          this.pingMeasure.update(Number(diff));
          conn.send(this.leprot.genPingPang(LeProtCmd.Pang, msg.payload.date2));
          break;

        case this.leprotMsgId_RollbackInput:
            let rollbackInput = msg.payload as LeProtMsg_RollbackInput;
            this.rollbackNetcode!.onRemoteInput(rollbackInput.frame, rollbackInput.playerId, rollbackInput.input);
          break;
      }
    });

    setInterval(() => {
      conn.send(this.leprot.genPingPang(LeProtCmd.Ping, BigInt(Date.now())));
    }, PING_INTERVAL);
    clientData.packetsSent += 1;
  }

  watchRTCStats(clientConnData: IClientConnData) {
    setInterval(() => {
      clientConnData.conn.peerConnection
        .getStats()
        .then((stats) => {
          //this.rtcStats = this.formatRTCStats(stats)
          stats.forEach((report) => {
            if (report.type === "data-channel") {
              clientConnData.bytesSent = report["bytesSent"];
              clientConnData.bytesReceived = report["bytesReceived"];
            }
          });
        });
    }, 1000);
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

  protected getStats(): string {
    let result = "";
    for (let clientConnData of this.connectedClients) {
      result += `Player #${clientConnData.playerId}, bytesSent: ${(clientConnData.bytesSent / 1024).toFixed(2)} kB / ${clientConnData.packetsSent} p, bytesReceived: ${(clientConnData.bytesReceived / 1024).toFixed(2)} kB<br/>`;
    }
    return result;
  }
}
