import { TypeDescriptor, TypeKind } from "../../../utils/objutils";
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
  constructor(
    public type: EMobType, 
    public pos: Vect, 
    public hitTime: number) {
  }
}

export class GameState {
  time: number;
  units: UnitState[];
  projectiles: ProjectileState[];
  deadUnits: DeadUnitState[];
  mobs: MobState[];

  constructor() {
    this.time = 0;
    this.units = [];
    this.projectiles = [];
    this.deadUnits = [];
    this.mobs = [];
  }

  static readonly TypeDescriptor: TypeDescriptor = GameState.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {
    let numTd = new TypeDescriptor(TypeKind.Number, undefined);

    let td = new TypeDescriptor(TypeKind.Generic, GameState);
    td.props.set("time", numTd);


    let unitTd = new TypeDescriptor(TypeKind.Generic, UnitState);
    unitTd.props.set("playerId", numTd);
    unitTd.props.set("pos", Vect.TypeDescriptor);
    unitTd.props.set("knock", Vect.TypeDescriptor);
    unitTd.props.set("dir", Vect.TypeDescriptor);
    unitTd.props.set("life", numTd);
    unitTd.props.set("score", numTd);
    unitTd.props.set("coolDown", numTd);
    unitTd.props.set("lastHitByPlayerId", numTd);
    td.props.set("units", new TypeDescriptor(TypeKind.Array, undefined, unitTd));
    
    let projectileTd = new TypeDescriptor(TypeKind.Generic, ProjectileState);
    projectileTd.props.set("pos", Vect.TypeDescriptor);
    projectileTd.props.set("vel", Vect.TypeDescriptor);
    projectileTd.props.set("life", numTd);
    projectileTd.props.set("playerId", numTd);
    td.props.set("projectiles", new TypeDescriptor(TypeKind.Array, undefined, projectileTd));
    
    let deadUnitTd = new TypeDescriptor(TypeKind.Generic, DeadUnitState);
    deadUnitTd.props.set("playerId", numTd);
    deadUnitTd.props.set("x", numTd);
    deadUnitTd.props.set("y", numTd);
    deadUnitTd.props.set("fadeTime", numTd);
    td.props.set("deadUnits",  new TypeDescriptor(TypeKind.Array, undefined, deadUnitTd));

    let mobTd = new TypeDescriptor(TypeKind.Generic, MobState);
    mobTd.props.set("type", numTd);
    mobTd.props.set("pos", Vect.TypeDescriptor);
    mobTd.props.set("hitTime", numTd);
    td.props.set("mobs", new TypeDescriptor(TypeKind.Array, undefined, mobTd));
    return td;
  }
}