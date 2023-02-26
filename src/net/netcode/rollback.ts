/**
 * Taken and personalized from NetPlay.js: https://github.com/rameshvarun/netplayjs
 * Rollback netcode is an effective netcode algorithm for two-player games which allows
 * both players to have lag-free control of their own character, at the expense of
 * artifacting for remote characters. This is the most common algorithm used in
 * fighting games.
 *
 * The algorithm works as follows:
 * - All clients play on the same clock.
 * - When a client simulates a frame F, it uses it's own local input, but makes a guess as to what
 *   actions the remote players have taken. The client sends it's local input to all other players.
 * - When a remote player's input for frame F arrives, we rewind the state of the game to F - 1,
 *   and replay forward with the correct input from frame F.
 *
 * Resources:
 * - RetroArch Netplay Implementation: https://github.com/libretro/RetroArch/tree/v1.9.0/network/netplay
 */

import { NetplayInput, NetplayPlayer, NetplayState, SerializedState } from "../types";
import { get, shift } from "../utils";
import * as log from "loglevel";
import { ObjUtils, TypeDescriptor } from "../../utils/objutils";

export interface IKeyFrameState {
  frame: number;
  state: any;
  playerInputs: { [idx: number]: any };
}

class RollbackHistory<TInput extends NetplayInput<TInput>> {
  /**
   * The frame number that this history entry represents.
   */
  frame: number;

  /**
   * The serialized state of the game at this frame.
   */
  state: SerializedState;
  stateHash: number | undefined;
  stateHashFromHost: number | undefined;

  /**
   * These inputs represent the set of inputs that produced this state
   * from the previous state.
   * Eg: history[n].state = history[n - 1].state.tick(history[n].inputs)
   */
  inputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>;

  constructor(
    frame: number,
    state: SerializedState,
    inputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>
  ) {
    this.frame = frame;
    this.state = state;
    this.stateHash = undefined;
    this.stateHashFromHost = undefined;
    this.inputs = inputs;
  }

  static createFromKeyFrameState<TInput extends NetplayInput<TInput>>(
    keyFrameState: IKeyFrameState,
    players: Map<number, NetplayPlayer>,
    getDefaultInput: () => TInput): RollbackHistory<TInput> {
    let historyInputs = new Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>();
    for (let playerIdStr in keyFrameState.playerInputs) {
      let playerId = parseInt(playerIdStr);
      let input = getDefaultInput();
      input.deserialize(keyFrameState.playerInputs[playerId]);
      let player = players.get(playerId)!;
      historyInputs.set(player, { input: input, isPrediction: false });
    }
    return new RollbackHistory(keyFrameState.frame, keyFrameState.state, historyInputs);
  }

  isPlayerInputPredicted(player: NetplayPlayer) {
    return get(this.inputs, player).isPrediction;
  }

  anyInputPredicted(): boolean {
    for (const [player, { isPrediction }] of this.inputs.entries()) {
      if (isPrediction) return true;
    }
    return false;
  }

  allInputsSynced(): boolean {
    return !this.anyInputPredicted();
  }
}

const DEV: boolean = false;

export class RollbackNetcode<
  TGame extends NetplayState<TInput>,
  TInput extends NetplayInput<TInput>
> {
  /**
   * The rollback history buffer.
   */
  history: Array<RollbackHistory<TInput>>;
  lastBroadcastedKeyFrame: number;

  keyframeHistory: IKeyFrameState[];

  /**
   * The max number of frames that we can predict ahead before we have to stall.
   */
  maxPredictedFrames: number;

  /**
   * Inputs from other players that have already arrived, but have not been
   * applied due to our simulation being behind.
   */
  futureMap: Map<NetplayPlayer, Array<{ frame: number; input: TInput }>>;

  highestFrameReceived: Map<NetplayPlayer, number>;

  /**
   * Whether or not we are the host of this match. The host is responsible for
   * sending our authoritative state updates.
   */
  isHost: boolean;

  onStateSyncHash(frame: number, hash: number) {
    // Mark the frame in history with the given hash from the server
    // The validated history entries will be flushed on the next tick
    for (let i = 0; i < this.history.length; ++i) {
      let currentState = this.history[i];
      if (currentState.frame === frame) {
        currentState.stateHashFromHost = hash;
        // if (currentState.stateHash === hash) {
        //   DEV && console.log(`Received frame hash for frame ${frame}, hash ${hash}, confirmed`);
        // } else {
        //   DEV && console.log(`Received frame hash for frame ${frame}, hash ${hash}, WRONG`);
        // }
        break;
      }
    }
  }

  onStateSync(keyFrameState: IKeyFrameState) {
    //DEV && assert.isFalse(this.isHost, "Only clients recieve state syncs.");
    DEV && console.log(`Received keyFrame for frame ${keyFrameState.frame}`);

    // Cleanup states that we don't need anymore because we have the definitive
    // server state. We have to leave at least one state in order to simulate
    // on the next local tick.
    let cleanedUpStates = 0;
    while (this.history.length > 1) {
      //DEV && assert.isTrue(this.history[0].allInputsSynced());
      if (this.history[0].frame < keyFrameState.frame) {
        shift(this.history);
        cleanedUpStates++;
      } else break;
    }
    log.debug(`Cleaned up ${cleanedUpStates} states.`);

    // Update the first state with the definitive server state.
    //DEV && assert.equal(this.history[0].frame, frame);
    this.history[0] = RollbackHistory.createFromKeyFrameState(keyFrameState, this.players, this.getDefaultInput);
    this.history[0].stateHashFromHost = ObjUtils.getObjectHash(keyFrameState.state, this.game.getGameStateTypeDef());

    // Update the expected next input for players for which this keyframe is beyond the inputs received
    for (let [id, player] of this.players) {
      if (get(this.highestFrameReceived, player) < keyFrameState.frame) {
        this.highestFrameReceived.set(player, keyFrameState.frame);
      }
    }

    this.checkInvariants();

    // Rollback to this state.
    this.game.deserialize(keyFrameState.state);

    // Resimulate up to the current point.
    for (let i = 1; i < this.history.length; ++i) {
      let currentState = this.history[i];

      this.game.tick(this.getStateInputs(currentState.inputs));
      currentState.state = this.game.serialize();
      this.checkInvariants();
    }
    log.debug(
      `Resimulated ${this.history.length - 1} states after state sync.`
    );
  }

  onRemoteInput(frame: number, playerId: number, input: TInput) {
    let player = this.players.get(playerId)!;
    // We receive the input from a given player at the given frame
    /*DEV &&
      assert.isTrue(
        player.isRemotePlayer(),
        `'player' must be a remote player.`
      );
    DEV && assert.isNotEmpty(this.history, `'history' cannot be empty.`);*/

    let expectedFrame = get(this.highestFrameReceived, player) + 1;
    if (frame < expectedFrame) {
      return;
    }
    DEV && ObjUtils.assertEquals(expectedFrame, frame);
    this.highestFrameReceived.set(player, expectedFrame);

    // If this input is for a frame that we haven't even simulated, we need to
    // store it in a queue to pull during our next tick.
    if (frame > this.history[this.history.length - 1].frame) {
      DEV && console.log(`Received future input for player ${playerId}, frame ${frame}`);
      get(this.futureMap, player).push({ frame: frame, input: input });
      return; // Skip rest of logic in this function.
    }
    DEV && console.log(`Received input for player ${playerId}, frame ${frame}`);

    // If we have already simulated a frame F for which we are currently receiving
    // an input, it must be the case that frame F is a prediction. This is because,
    // when we simulated F, we didn't have this input available. Find F.
    let idxHistory: number | null = null;
    for (let i = 0; i < this.history.length; ++i) {
      if (this.history[i].frame === frame) {
        idxHistory = i;
        break;
      }
    }

    if (idxHistory === 0) {
      // If the input received is for the first state in history, then it must be already confirmed
      // Can happen when the predicted input was correct
      //DEV && ObjUtils.assertIsTrue(this.history[idxHistory].stateHashConfirmed);
      return;
    }

    if (idxHistory === undefined) {
      // We received an input for a frame we don't have, should have exited before
      DEV && console.log("onRemoteInput Error");
      return;
    }

    //DEV && assert.exists(firstPrediction);

    // Assuming that input messages from a given client are ordered, the
    // first history with a predicted input for this player is also the
    // frame for which we just recieved a message.
    DEV && ObjUtils.assertEquals(this.history[idxHistory!].frame, frame);

    // The state before the first prediction is, by definition,
    // not a prediction. There must be one such state.
    let lastActualState = this.history[idxHistory! - 1];

    // Roll back to that previous state.
    this.game.deserialize(lastActualState.state);

    // Resimulate forwards with the actual input.
    for (let i = idxHistory!; i < this.history.length; ++i) {
      let currentState = this.history[i];
      let currentPlayerInput = get(currentState.inputs, player);

      //DEV && assert.isTrue(currentPlayerInput.isPrediction);

      if (i === idxHistory) {
        //DEV && assert.equal(currentState.frame, frame);

        currentPlayerInput.isPrediction = false;
        currentPlayerInput.input = input;
      } else {
        let previousState = this.history[i - 1];
        let previousPlayerInput = get(previousState.inputs, player);

        currentPlayerInput.input = previousPlayerInput.input.predictNext();
      }

      this.game.tick(this.getStateInputs(currentState.inputs));
      currentState.state = this.game.serialize();
    }

    log.debug(
      `Resimulated ${this.history.length - idxHistory!
      } states after rollback.`
    );

    this.flushHistoryKeyFrames();
  }

  broadcastInput: (frame: number, playerId: number, input: TInput, frameSync: number) => void;
  broadcastState?: (keyFrameState: IKeyFrameState) => void;

  pingMeasure: any;
  timestep: number;

  game: TGame;
  pollInput: () => TInput;

  maxPlayerId: number;
  players: Map<number, NetplayPlayer>;
  localPlayerId: number;

  constructor(
    isHost: boolean,
    game: TGame,
    initialKeyFrameState: IKeyFrameState | undefined,
    localPlayerId: number,
    maxPredictedFrames: number,
    pingMeasure: any,
    timestep: number,
    private getDefaultInput: () => TInput,
    pollInput: () => TInput,
    broadcastInput: (frame: number, playerId: number, input: TInput, frameSync: number) => void,
    broadcastState?: (keyFrameState: IKeyFrameState) => void
  ) {
    this.isHost = isHost;
    this.game = game;
    this.maxPredictedFrames = maxPredictedFrames;
    this.broadcastInput = broadcastInput;
    this.pingMeasure = pingMeasure;
    this.timestep = timestep;
    this.pollInput = pollInput;

    if (isHost) {
      if (broadcastState) {
        this.broadcastState = broadcastState;
      } else {
        throw new Error("Expected a broadcast state function.");
      }
      // TODO The host behaves like any other client using a rollbackClient without the net in the middle
      // Add the player for host
      let playerInputs: TInput[] = [];
      playerInputs[0] = getDefaultInput();
      initialKeyFrameState = { frame: 0, state: game.serialize(), playerInputs: playerInputs }

    } else {
      if (!initialKeyFrameState) {
        throw new Error("Expected an initial state for client.");
      }
      DEV && console.log(`Received initial state for frame ${initialKeyFrameState.frame}`);
    }

    this.players = new Map<number, NetplayPlayer>();
    this.futureMap = new Map();
    this.highestFrameReceived = new Map();

    this.maxPlayerId = -1;
    this.localPlayerId = localPlayerId;
    for (let playerIdStr in initialKeyFrameState.playerInputs) {
      let playerId = parseInt(playerIdStr);
      let player = new NetplayPlayer(playerId, playerId === localPlayerId);
      this.players.set(playerId, player);
      this.futureMap.set(player, []);
      this.highestFrameReceived.set(player, initialKeyFrameState.frame);
      this.maxPlayerId = Math.max(this.maxPlayerId, playerId);
    }

    this.history = [
      RollbackHistory.createFromKeyFrameState(initialKeyFrameState, this.players, this.getDefaultInput),
    ];
    this.lastBroadcastedKeyFrame = -1;

    this.keyframeHistory = [];

    this.checkInvariants();
  }

  getKeyframeHistory(): IKeyFrameState[] {
    return this.keyframeHistory;
  }

  addPlayer(): NetplayPlayer {
    this.maxPlayerId += 1;
    let player = new NetplayPlayer(this.maxPlayerId, false);
    this.players.set(player.getID(), player);
    // Insert an empty input in the future frame, so that in the next tick the player will join with an initial certain input
    // that will result, eventually, in a keyframe that's sent to the client
    let currentFrame = this.currentFrame() + 1;
    this.futureMap.set(player, [{
      frame: currentFrame,
      input: this.getDefaultInput()
    }]);
    this.highestFrameReceived.set(player, currentFrame);

    // We do not have any input for this player, and it's not represented in the current state
    // The next tick will generate an empty input for each player that did not have one in the previous frame, 
    // and the game tick function will insert it into the state

    this.checkInvariants();

    return player;
  }

  currentFrame(): number {
    //DEV && assert.isNotEmpty(this.history, `'history' cannot be empty.`);
    return this.history[this.history.length - 1].frame;
  }

  largestFutureSize(): number {
    return Math.max(...Array.from(this.futureMap.values()).map((a) => a.length)) || 0;
  }

  // Returns the number of frames for which at least one player's input is predicted.
  predictedFrames(): number {
    return this.history.length;
  }

  // Whether or not we should stall.
  shouldStall(): boolean {
    // If we are predicting too many frames, then we have to stall.
    return this.predictedFrames() > this.maxPredictedFrames;
  }

  tick() {
    //DEV && assert.isNotEmpty(this.history, `'history' cannot be empty.`);

    // If we should stall, then don't peform a tick at all.
    if (this.shouldStall()) return;

    // Get the most recent state.
    const lastState = this.history[this.history.length - 1];
    const thisFrame = lastState.frame + 1;

    let thisFrameLocalPlayerInput: TInput | undefined;

    // Construct the new map of inputs for this frame.
    const thisFrameInputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }> = new Map();
    for (const [playerId, player] of this.players) {
      if (player.getID() === this.localPlayerId) {
        thisFrameLocalPlayerInput = this.pollInput();

        // Local player gets the local input.
        thisFrameInputs.set(player, { input: thisFrameLocalPlayerInput, isPrediction: false });
      } else {
        let futureArrayForPlayer = get(this.futureMap, player);
        if (futureArrayForPlayer.length > 0) {
          // If we have already recieved the player's input (due to our)
          // simulation being behind, then use that input.
          let future = shift(futureArrayForPlayer);
          //DEV && assert.equal(lastState.frame + 1, future.frame);
          thisFrameInputs.set(player, {
            input: future.input,
            isPrediction: false,
          });
        } else {
          // Otherwise, set the next input based off of the previous input.
          let lastPlayerInput = lastState.inputs.get(player)!.input;
          thisFrameInputs.set(player, {
            input: lastPlayerInput.predictNext(),
            isPrediction: true,
          });
        }
      }
    }

    // Tick our state with the new inputs, which may include predictions.
    this.game.tick(this.getStateInputs(thisFrameInputs));

    let newState = this.game.serialize();

    // Add a history entry into our rollback buffer.
    this.history.push(
      new RollbackHistory(
        thisFrame,
        newState,
        thisFrameInputs
      )
    );

    this.flushHistoryKeyFrames();

    // Always send the local player inputs.
    // We may have just sent to someone a full keyframe along with the inputs, but normally that does not occour, just send it anyway
    if (thisFrameLocalPlayerInput) {
      // If this frame has not been just sent, then some remote input is missing:
      // Broadcast the new local input to the other players.
      DEV && console.log(`Sent input for frame ${thisFrame}`);
      // The last synced frame is the one before the first in history: we just called the flush
      let frameSync = this.history[0].frame - 1;
      this.broadcastInput(
        thisFrame,
        this.localPlayerId,
        thisFrameLocalPlayerInput,
        frameSync);
    }
  }

  flushHistoryKeyFrames() {
    if (!this.isHost) {
      // Keep removing history entry from start if the hash was confirmed
      // Note that we don't care if the inputs were all received: the state is confirmed, all inputs must be right or irrelevant
      let removeCount = 0;
      while (this.history.length > 1) {
        let historyEntry = this.history[0];
        let nextHistoryEntry = this.history[1];
        if (!historyEntry.allInputsSynced() || !nextHistoryEntry.allInputsSynced()) {
          // We can flush only an history entry if its input are all synced
          // AND the next one is synced as well, since the first history entry must always be synced
          break;
        }
        this.maybeAddHistoryEntryToKeyframeHistory(0);

        if (historyEntry.stateHashFromHost === undefined) {
          break;
        }

        historyEntry.stateHash = ObjUtils.getObjectHash(historyEntry.state, this.game.getGameStateTypeDef());
        if (historyEntry.stateHash === historyEntry.stateHashFromHost) {
          this.history.splice(0, 1);
          removeCount += 1;
        } else {
          // Stall
          break;
        }
      }
      if (removeCount > 0) {
        DEV && console.log(`Flushed ${removeCount} history entries`);
      }
    } else {
      // If this is the server, then we can cleanup states for which input has been synced.
      // However, we must maintain the invariant that there is always at least one state
      // in the history buffer, and that the first entry in the history buffer is a
      // synced state.
      // To do so, start from the end going backwards, stop at the first keyframe found, broadcast it and remove its predecessors
      for (let i = this.history.length - 1; i >= 0; i--) {
        
        let historyEntry = this.history[i];
        if (historyEntry.allInputsSynced()) {
          this.maybeAddHistoryEntryToKeyframeHistory(i);

          if (historyEntry.frame <= this.lastBroadcastedKeyFrame) {
            // The elected key frame to be sent, was already sent.
            break;
          }
          // It's a keyframe, remove the previous entry in history and broadcast
          if (i > 0) {
            this.history.splice(0, i);
          }
          this.lastBroadcastedKeyFrame = historyEntry.frame;
          this.broadcastState!(this.getKeyFrameState(historyEntry));
          break;
        }
      }
    }

    this.checkInvariants();
  }

  maybeAddHistoryEntryToKeyframeHistory(i: number) {
    if (!DEV) {
      return;
    }
    if (!this.history[i].allInputsSynced()) {
      return;
    }

    let lastKeyframeHistoryFrame: number;
    if (this.keyframeHistory.length > 0) {
      lastKeyframeHistoryFrame = this.keyframeHistory[this.keyframeHistory.length-1].frame;
    } else {
      lastKeyframeHistoryFrame = -1;
    }

    if (lastKeyframeHistoryFrame >= 0) {
      // It's either the same frame, or the one before.
      if (lastKeyframeHistoryFrame === this.history[i].frame) {
        return; // Already added
      }
      DEV && ObjUtils.assertEquals(this.history[i].frame - 1, lastKeyframeHistoryFrame);
    }

    this.keyframeHistory.push(this.getKeyFrameState(this.history[i]));
  }

  getKeyFrameState(historyEntry: RollbackHistory<TInput>): IKeyFrameState {
    let playerInputs: TInput[] = [];
    for (const [player, { input }] of historyEntry.inputs.entries()) {
      playerInputs[player.getID()] = input;
    }

    return {
      frame: historyEntry.frame,
      state: historyEntry.state,
      playerInputs: playerInputs
    }
  }

  /**
   * Internally, we store inputs with a flag indicating whether or not that input is
   * a prediction. Before sending that to the state, we need to remove the prediction
   * flags, since the game logic doesn't care.
   */
  getStateInputs(
    inputs: Map<NetplayPlayer, { input: TInput; isPrediction: boolean }>
  ): Map<NetplayPlayer, TInput> {
    let stateInputs: Map<NetplayPlayer, TInput> = new Map();
    for (const [player, { input }] of inputs.entries()) {
      stateInputs.set(player, input);
    }
    return stateInputs;
  }

  update() {
    // If us and our peer are running at the same simulation clock,
    // we should expect inputs from our peer to arrive after we have
    // simulated that state. If inputs from our peer are arriving before
    // we simulate the state, that means we are running slow, and we
    // have to tick faster. Do two ticks to catch up.
    // If we are constantly behind, we are needlessly forcing our
    // peer to predict lots of frames.
    let numTicks = 1;
    if (this.largestFutureSize() > 0) {
      numTicks = 2;
    }

    for (let i = 0; i < numTicks; ++i) {
      this.tick();
    }
  }

  start() {
    setInterval(() => { this.update() }, this.timestep);
  }

  checkInvariants() {
    DEV && ObjUtils.assertIsTrue(this.history.length >= 1);
    DEV && ObjUtils.assertIsTrue(this.history[0].allInputsSynced());
    // for (let i = 1; i < this.history.length; i++) {
    //   DEV && ObjUtils.assertIsTrue(this.history[i].anyInputPredicted());
    // }
  }
}
