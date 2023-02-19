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
    td.addProp("time", numTd);


    let unitTd = new TypeDescriptor(TypeKind.Generic, UnitState);
    unitTd.addProp("playerId", numTd);
    unitTd.addProp("pos", Vect.TypeDescriptor);
    unitTd.addProp("knock", Vect.TypeDescriptor);
    unitTd.addProp("dir", Vect.TypeDescriptor);
    unitTd.addProp("life", numTd);
    unitTd.addProp("score", numTd);
    unitTd.addProp("coolDown", numTd);
    unitTd.addProp("lastHitByPlayerId", numTd);
    td.addProp("units", new TypeDescriptor(TypeKind.Array, undefined, unitTd));
    
    let projectileTd = new TypeDescriptor(TypeKind.Generic, ProjectileState);
    projectileTd.addProp("pos", Vect.TypeDescriptor);
    projectileTd.addProp("vel", Vect.TypeDescriptor);
    projectileTd.addProp("life", numTd);
    projectileTd.addProp("playerId", numTd);
    td.addProp("projectiles", new TypeDescriptor(TypeKind.Array, undefined, projectileTd));
    
    let deadUnitTd = new TypeDescriptor(TypeKind.Generic, DeadUnitState);
    deadUnitTd.addProp("playerId", numTd);
    deadUnitTd.addProp("x", numTd);
    deadUnitTd.addProp("y", numTd);
    deadUnitTd.addProp("fadeTime", numTd);
    td.addProp("deadUnits",  new TypeDescriptor(TypeKind.Array, undefined, deadUnitTd));

    let mobTd = new TypeDescriptor(TypeKind.Generic, MobState);
    mobTd.addProp("type", numTd);
    mobTd.addProp("pos", Vect.TypeDescriptor);
    mobTd.addProp("hitTime", numTd);
    td.addProp("mobs", new TypeDescriptor(TypeKind.Array, undefined, mobTd));
    return td;
  }
}