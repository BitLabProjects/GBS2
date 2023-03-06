import { ObjUtils, TypeDescriptor, TypeKind } from "../../../utils/objutils";
import { Vect2 } from "../../../utils/vect2";
import { Vect3 } from "../../../utils/vect3";

export class UnitState {
  constructor(
    public playerId: number,
    public pos: Vect3,
    public knock: Vect3,
    public dir: Vect2,
    public life: number,
    public score: number,
    public coolDown: number,
    public lastHitByPlayerId: number,
    public carryMobId: number,
    public inventoryItems: InventoryItemState[],
    public rightHandItemIdx: number) { }

  getId() { return this.playerId; }

  hasItem(type: EItemType): boolean {
    for(let item of this.inventoryItems) {
      if (item.type === type) {
        return true;
      }
    }
    return false;
  }

  addItemToInventory(type: EItemType, quantity: number) {
    this.inventoryItems.push(new InventoryItemState(type, quantity));
    if (this.rightHandItemIdx < 0) {
      this.rightHandItemIdx = 0;
    }
  }

  grabNextItem() {
    if (this.inventoryItems.length === 0) {
      return;
    }
    this.rightHandItemIdx = (this.rightHandItemIdx + 1) % this.inventoryItems.length;
    /*
    // This also works when the unit does not have a current item in hand, because i will start at zero
    let i = this.rightHandItemIdx + 1;

    // Cycle until we find a weapon, or go back to the current one
    let triedItems = 0;
    while (triedItems < this.inventoryItems.length) {
      switch (this.inventoryItems[i].type) {
        case EItemType.Pistol:
        case EItemType.GrenadeLauncher:
          this.rightHandItemIdx = i;
          return;
      }
      i = (i + 1) % this.inventoryItems.length;
      triedItems += 1;
    }
    */
  }
}
export enum EItemType {
  Pistol = 1,
  Grenade = 2,
}

export class InventoryItemState {
  constructor(
    public type: EItemType,
    public quantity: number) { }
}

export enum EProjectileType {
  Pistol = 1,
  Grenade = 2,
}
export class ProjectileState {
  constructor(
    public projectileId: number,
    public type: EProjectileType,
    public pos: Vect3,
    public vel: Vect3,
    public life: number,
    public playerId: number) { }

  getId() { return this.projectileId; }
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
  Zombie = 2,
  ZombieSpawner = 3,
  ShopPortal = 4,
  ShopBuyPistol = 5,
  ShopBuyGrenade = 6,
  Tree = 7,
}
export enum EMobState {
  Idle = 0,
  Follow = 1,
  GoToTarget = 2,
  Attack = 3,
}
export class MobState {
  constructor(
    public mobId: number,
    public type: EMobType,
    public pos: Vect3,
    public knock: Vect3,
    public hitTime: number,
    public attackPlayerId: number,
    public state: EMobState,
    public stateTime: number,
    public life: number,) {
  }

  getId() { return this.mobId; }
}

export class GameState {
  time: number;
  units: UnitState[];
  projectiles: ProjectileState[];
  deadUnits: DeadUnitState[];
  mobs: MobState[];
  nextProjectileId: number;
  nextMobId: number;
  randVal: number;

  constructor() {
    this.time = 0;
    this.units = [];
    this.projectiles = [];
    this.deadUnits = [];
    this.mobs = [];
    this.nextProjectileId = 1;
    this.nextMobId = 1;
    this.randVal = 1337;
  }

  nextRandF(): number {
    this.randVal = ObjUtils.rand(this.randVal);
    return (this.randVal % 10000) / 10000;
  }
  nextRandVectXY(radiusMin: number, radiusMax: number, center: Vect3): Vect3 {
    let alpha = this.nextRandF() * Math.PI * 2;
    let radius = radiusMin + this.nextRandF() * (radiusMax - radiusMin);
    return new Vect3(
      center.x + Math.cos(alpha) * radius,
      center.y + Math.sin(alpha) * radius,
      0);
  }

  getPlayerById(playerId: number): number {
    for (let [i, unit] of this.units.entries()) {
      if (unit.playerId === playerId) {
        return i;
      }
    }
    return -1;
  }

  findMobNearPos(pos: Vect3, range: number): number {
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

  findUnitNearPos(pos: Vect3, range: number): number {
    let idxNearest = -1;
    let nearestDist = range;
    for (let [i, unit] of this.units.entries()) {
      let currDist = unit.pos.distanceTo(pos);
      if (currDist < nearestDist) {
        idxNearest = i;
        nearestDist = currDist;
      }
    }
    return idxNearest;
  }

  spawnProjectile(type: EProjectileType,
    pos: Vect3,
    vel: Vect3,
    life: number,
    playerId: number) {
    this.projectiles.push(new ProjectileState(this.nextProjectileId, type, pos, vel, life, playerId));
    this.nextProjectileId += 1;
  }

  spawnMob(type: EMobType,
    pos: Vect3,
    life: number) {
    this.mobs.push(new MobState(this.nextMobId,
      type,
      pos,
      new Vect3(0, 0, 0),
      100000,
      -1,
      EMobState.Idle,
      0,
      life));
    this.nextMobId += 1;
  }

  static readonly TypeDescriptor: TypeDescriptor = GameState.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {

    let td = new TypeDescriptor(TypeKind.Generic, GameState);
    td.addProp("time", TypeDescriptor.Float32);

    let inventoryItemTd = new TypeDescriptor(TypeKind.Generic, InventoryItemState);
    inventoryItemTd.addProp("type", TypeDescriptor.Int32);
    inventoryItemTd.addProp("quantity", TypeDescriptor.Int32);

    let unitTd = new TypeDescriptor(TypeKind.Generic, UnitState);
    unitTd.addProp("playerId", TypeDescriptor.Int32);
    unitTd.addProp("pos", Vect3.TypeDescriptor);
    unitTd.addProp("knock", Vect3.TypeDescriptor);
    unitTd.addProp("dir", Vect2.TypeDescriptor);
    unitTd.addProp("life", TypeDescriptor.Int32);
    unitTd.addProp("score", TypeDescriptor.Int32);
    unitTd.addProp("coolDown", TypeDescriptor.Int32);
    unitTd.addProp("lastHitByPlayerId", TypeDescriptor.Int32);
    unitTd.addProp("carryMobId", TypeDescriptor.Int32);
    unitTd.addProp("inventoryItems", new TypeDescriptor(TypeKind.Array, undefined, inventoryItemTd));
    unitTd.addProp("rightHandItemIdx", TypeDescriptor.Int32);
    td.addProp("units", new TypeDescriptor(TypeKind.Array, undefined, unitTd));

    let projectileTd = new TypeDescriptor(TypeKind.Generic, ProjectileState);
    projectileTd.addProp("projectileId", TypeDescriptor.Int32);
    projectileTd.addProp("type", TypeDescriptor.Int32);
    projectileTd.addProp("pos", Vect3.TypeDescriptor);
    projectileTd.addProp("vel", Vect3.TypeDescriptor);
    projectileTd.addProp("life", TypeDescriptor.Int32);
    projectileTd.addProp("playerId", TypeDescriptor.Int32);
    td.addProp("projectiles", new TypeDescriptor(TypeKind.Array, undefined, projectileTd));

    let deadUnitTd = new TypeDescriptor(TypeKind.Generic, DeadUnitState);
    deadUnitTd.addProp("playerId", TypeDescriptor.Int32);
    deadUnitTd.addProp("x", TypeDescriptor.Float32);
    deadUnitTd.addProp("y", TypeDescriptor.Float32);
    deadUnitTd.addProp("fadeTime", TypeDescriptor.Float32);
    td.addProp("deadUnits", new TypeDescriptor(TypeKind.Array, undefined, deadUnitTd));

    let mobTd = new TypeDescriptor(TypeKind.Generic, MobState);
    mobTd.addProp("mobId", TypeDescriptor.Int32);
    mobTd.addProp("type", TypeDescriptor.Int32);
    mobTd.addProp("pos", Vect3.TypeDescriptor);
    mobTd.addProp("knock", Vect3.TypeDescriptor);
    mobTd.addProp("hitTime", TypeDescriptor.Float32);
    mobTd.addProp("attackPlayerId", TypeDescriptor.Int32);
    mobTd.addProp("state", TypeDescriptor.Int32);
    mobTd.addProp("stateTime", TypeDescriptor.Float32);
    mobTd.addProp("life", TypeDescriptor.Int32);
    td.addProp("mobs", new TypeDescriptor(TypeKind.Array, undefined, mobTd));

    td.addProp("nextProjectileId", TypeDescriptor.Int32);
    td.addProp("nextMobId", TypeDescriptor.Int32);
    td.addProp("randVal", TypeDescriptor.UInt32);

    return td;
  }
}