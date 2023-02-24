import { NetplayInput, NetplayState } from "./types";
import { TypeDescriptor } from "../utils/objutils";

export interface Game<TInput extends NetplayInput<TInput>> extends NetplayState<TInput> {
  timestep: number;
  deterministic: boolean;
  draw(): void;
  getInput(): TInput;
  getStartInput(): TInput;
}
