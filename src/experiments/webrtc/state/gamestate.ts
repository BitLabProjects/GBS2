import { Vect } from "../../../utils/vect";

export class GameState {
  units: UnitState[];
  projectiles: ProjectileState[];
  deadUnits: DeadUnitState[];
  mobs: MobState[];

  constructor() {
    this.units = [];
    this.projectiles = [];
    this.deadUnits = [];
    this.mobs = [];
  }
}

export class UnitState {
  constructor(
    public playerId: number,
    public pos: Vect,
    public knock: Vect,
    public dir: Vect,
    public life: number,
    public score: number,
    public coolDown: number,
    public lastHitByPlayerId: number) { }
}
export class ProjectileState {
  constructor(
    public pos: Vect,
    public vel: Vect,
    public life: number,
    public playerId: number) { }
}
export class DeadUnitState {
  constructor(
    public playerId: number, 
    public x: number, 
    public y: number, 
    public fadeTime: number) { }
}
export enum EMobType {
  Unknown = 0,
  Dummy = 1,
}
export class MobState {
  constructor(public type: EMobType, public pos: Vect) {
  }
}