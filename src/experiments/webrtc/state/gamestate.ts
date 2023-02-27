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
    public lastHitByPlayerId: number,
    public carryMobId: number) { }
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
    public mobId: number,
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
  nextMobId: number;

  constructor() {
    this.time = 0;
    this.units = [];
    this.projectiles = [];
    this.deadUnits = [];
    this.mobs = [];
    this.nextMobId = 1;
  }

  findMobNearPos(pos: Vect, range: number): number {
    let idxNearest = -1;
    let nearestDist = range;
    for (let [i, mob] of this.mobs.entries()) {
      let currDist = mob.pos.distanceTo(pos);
      if (currDist < nearestDist) {
        idxNearest = i;
        nearestDist = currDist;
      }
    }
    return idxNearest;
  }

  static readonly TypeDescriptor: TypeDescriptor = GameState.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {

    let td = new TypeDescriptor(TypeKind.Generic, GameState);
    td.addProp("time", TypeDescriptor.Float32);

    let unitTd = new TypeDescriptor(TypeKind.Generic, UnitState);
    unitTd.addProp("playerId", TypeDescriptor.Int32);
    unitTd.addProp("pos", Vect.TypeDescriptor);
    unitTd.addProp("knock", Vect.TypeDescriptor);
    unitTd.addProp("dir", Vect.TypeDescriptor);
    unitTd.addProp("life", TypeDescriptor.Int32);
    unitTd.addProp("score", TypeDescriptor.Int32);
    unitTd.addProp("coolDown", TypeDescriptor.Int32);
    unitTd.addProp("lastHitByPlayerId", TypeDescriptor.Int32);
    unitTd.addProp("carryMobId", TypeDescriptor.Int32);
    td.addProp("units", new TypeDescriptor(TypeKind.Array, undefined, unitTd));
    
    let projectileTd = new TypeDescriptor(TypeKind.Generic, ProjectileState);
    projectileTd.addProp("pos", Vect.TypeDescriptor);
    projectileTd.addProp("vel", Vect.TypeDescriptor);
    projectileTd.addProp("life", TypeDescriptor.Int32);
    projectileTd.addProp("playerId", TypeDescriptor.Int32);
    td.addProp("projectiles", new TypeDescriptor(TypeKind.Array, undefined, projectileTd));
    
    let deadUnitTd = new TypeDescriptor(TypeKind.Generic, DeadUnitState);
    deadUnitTd.addProp("playerId", TypeDescriptor.Int32);
    deadUnitTd.addProp("x", TypeDescriptor.Float32);
    deadUnitTd.addProp("y", TypeDescriptor.Float32);
    deadUnitTd.addProp("fadeTime", TypeDescriptor.Float32);
    td.addProp("deadUnits",  new TypeDescriptor(TypeKind.Array, undefined, deadUnitTd));

    let mobTd = new TypeDescriptor(TypeKind.Generic, MobState);
    mobTd.addProp("mobId", TypeDescriptor.Int32);
    mobTd.addProp("type", TypeDescriptor.Int32);
    mobTd.addProp("pos", Vect.TypeDescriptor);
    mobTd.addProp("hitTime", TypeDescriptor.Float32);
    td.addProp("mobs", new TypeDescriptor(TypeKind.Array, undefined, mobTd));

    td.addProp("nextMobId", TypeDescriptor.Int32);

    return td;
  }
}