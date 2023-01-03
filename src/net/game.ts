import { DefaultInput } from "./defaultinput";
import { NetplayPlayer, NetplayState } from "./types";
import { TouchControl } from "./touchcontrols";

export type GameClass = {
  new (players: Array<NetplayPlayer>): Game;
  timestep: number;

  /**
   * Whether or not we should lock the pointer when the user clicks on the
   * canvas. Use this for games like FPSs.
   */
  pointerLock?: boolean;

  /**
   * A list of all the touch controls needed for this game. These will
   * only be shown on mobile.
   */
  touchControls?: { [name: string]: TouchControl };

  /**
   * Is the game deterministic? By default, we assume no. If this is true,
   * certain netcode algorithms can perform more efficiently.
   */
  deterministic?: boolean;
};

export abstract class Game extends NetplayState<DefaultInput> {
  pointerLock: boolean;
  touchControls: { [name: string]: TouchControl };
  timestep: number;
  deterministic: boolean;
  abstract init(players: Array<NetplayPlayer>): void;
  abstract draw(): void;
}
