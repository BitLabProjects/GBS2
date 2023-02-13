import { Resources } from "./resources";

export interface IStateComponent<TState> {
  update(unit: TState, resources: Resources): void;
}