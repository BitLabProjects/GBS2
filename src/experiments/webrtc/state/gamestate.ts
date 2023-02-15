import { TypeDescriptor } from "../../../utils/objutils";
import { Vect } from "../../../utils/vect";

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
  constructor(public type: EMobType, public pos: Vect, public hitTime: number) {
  }
}

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

  static readonly TypeDescriptor: TypeDescriptor = GameState.createTypeDescriptor(); 
  static createTypeDescriptor(): TypeDescriptor {
    let td = new TypeDescriptor(GameState);
    let unitTd = new TypeDescriptor(UnitState, true);
    unitTd.props["pos"] = new TypeDescriptor(Vect);
    unitTd.props["knock"] = new TypeDescriptor(Vect);
    unitTd.props["dir"] = new TypeDescriptor(Vect);
    td.props["units"] = unitTd;

    let projectileTd = new TypeDescriptor(ProjectileState, true);
    projectileTd.props["pos"] = new TypeDescriptor(Vect);
    projectileTd.props["vel"] = new TypeDescriptor(Vect);
    td.props["projectiles"] = projectileTd;
    
    let deadUnitTd = new TypeDescriptor(DeadUnitState, true); 
    td.props["deadUnits"] = deadUnitTd;

    let mobTd = new TypeDescriptor(MobState, true);
    mobTd.props["pos"] = new TypeDescriptor(Vect);
    td.props["mobs"] = mobTd;
    return td;
  }
}