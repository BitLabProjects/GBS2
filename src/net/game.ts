import { DefaultInput } from "./defaultinput";
import { NetplayInput, NetplayPlayer, NetplayState } from "./types";
import { TouchControl } from "./touchcontrols";

export interface Game<TInput extends NetplayInput<TInput>> extends NetplayState<TInput> {
  timestep: number;
  deterministic: boolean;
  draw(): void;
  getInput(): TInput;
  getStartInput(): TInput;
}
