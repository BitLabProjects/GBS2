import { Engine, IInputHandler, KeyEventArgs, KeyState, KeyStateUtils, TouchEventArgs } from "../../engine/engine";
import { Align, Component, Margin, Node, NodeUI, Transform2D } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { Sprite, SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";
import { Game } from "../../net/game";
import { RollbackClient } from "../../net/rollbackClient";
import { RollbackHost } from "../../net/rollbackHost";
import { NetplayInput, NetplayPlayer, SerializedState } from "../../net/types";
import { ObjUtils, TypeDescriptor, TypeKind } from "../../utils/objutils";
import { Rect } from "../../utils/rect";
import { Vect2 } from "../../utils/vect2";
import { FullScreenQuad } from "../flocking/fullscreenquad";
import { EJoystickType, JoystickComp } from "./ui/joystickcomp";
import { FollowCameraComp } from "./scene/followcameracomp";
import { IStateComponent } from "./scene/istatecomp";
import { MobComp } from "./scene/mobcomp";
import { Resources } from "./scene/resources";
import { UnitComp } from "./scene/unitcomp";
import { DeadUnitState, EItemType, EMobState, EMobType, EProjectileType, GameState, InventoryItemState, MobState, ProjectileState, UnitState } from "./state/gamestate";
import { HeartComp } from "./ui/heartcomp";
import { UI } from "./ui/ui";
import { ProjectileComp } from "./scene/projectilecomp";
import { Vect3 } from "../../utils/vect3";
//import { JoystickComp } from "./JoystickComp";

const worldBounds: Rect = new Rect(-1000, -1000, 2000, 2000);
const worldBoundsSmall: Rect = new Rect(-100, -100, 200, 200);

export class WebRTCSceneHost extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    let gameComponent = new SimpleGame();
    Node.createFromComp(this, gameComponent);
    new RollbackHost(gameComponent).start(roomName);
  }
}

export class WebRTCScene extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    let gameComponent = new SimpleGame();
    Node.createFromComp(this, gameComponent);
    new RollbackClient(gameComponent).start(roomName);
  }
}

class SimpleGame extends Component implements Game<DefaultInput>, IInputHandler {
  timestep: number = 1000 / 30;
  deterministic: boolean = true;

  private unitComps: Map<number, UnitComp>;
  private projectileComps: Map<number, ProjectileComp>;
  private deadUnitSprites: SpriteComp[];
  private mobComps: Map<number, MobComp>;

  private resources: Resources;

  actualKeys: { [key: string]: KeyState } = {};
  currKeys: { [key: string]: KeyState } = {};

  private state: GameState;

  private ui: UI;

  private mapBackgroundComp: MapBackgroundComp;
  private followCameraComp: FollowCameraComp;
  private currentPlayerId: number;

  private static readonly maxLife: number = 10;

  onCreate() {
    this.state = new GameState();

    // Place spawners
    for (let i = 0; i < 10; i++) {
      this.state.spawnMob(EMobType.ZombieSpawner, Vect3.createRandomXY(worldBounds), 1000);
    }

    // Place shop things
    //this.state.spawnMob(EMobType.ShopPortal, Vect.createRandom(worldBounds), 1000);
    this.state.spawnMob(EMobType.ShopBuyPistol, Vect3.createRandomXY(worldBoundsSmall), 1000);
    this.state.spawnMob(EMobType.ShopBuyGrenade, Vect3.createRandomXY(worldBoundsSmall), 1000);

    // Place some trees
    for (let i = 0; i < 25; i++) {
      this.state.spawnMob(EMobType.Tree, Vect3.createRandomXY(worldBounds), 200);
    }

    //this.state.mobs.push(new MobState(EMobType.Dummy, new Vect(0, 0), 0)); 
    this.unitComps = new Map<number, UnitComp>();
    this.projectileComps = new Map<number, ProjectileComp>();
    this.deadUnitSprites = [];
    this.mobComps = new Map<number, MobComp>();

    this.resources = new Resources(this.scene.engine);

    this.mapBackgroundComp = new MapBackgroundComp();
    Node.createFromComp(this.scene, this.mapBackgroundComp);

    this.followCameraComp = new FollowCameraComp();
    Node.createFromComp(this.scene, this.followCameraComp);

    this.draw();

    this.ui = new UI(this.scene);

    if (this.scene.engine.isMobile) {
      this.scene.engine.requestFullscreen();
    }
  }

  onUpdate() {

  }

  serialize(): SerializedState {
    return ObjUtils.cloneDiscardingTypes(this.state);
  }

  deserialize(value: SerializedState): void {
    this.state = ObjUtils.cloneUsingTypeDescriptor(value, GameState.TypeDescriptor);
  }

  getInput(): DefaultInput {
    let input = new DefaultInput();

    if (this.ui.isJoystickGrabTapped) {
      this.actualKeys['c'] = KeyState.Pressed;
    }
    if (this.ui.isJoystickShootTapped) {
      this.actualKeys['v'] = KeyState.Pressed;
    }

    // Add or update pressed keys
    for (let key in this.actualKeys) {
      let currVal = this.currKeys[key];
      let actualVal = this.actualKeys[key];
      if (actualVal === KeyState.JustPressed || actualVal === KeyState.Pressed) {
        if (currVal === undefined) {
          currVal = KeyState.JustPressed;
        } else {
          currVal = KeyState.Pressed;
        }
      }
      this.currKeys[key] = currVal;
    }
    // Remove keys no longer pressed
    for (let key in this.currKeys) {
      if (this.actualKeys[key] === undefined || this.actualKeys[key] === KeyState.Released) {
        delete this.currKeys[key];
      }
    }

    input.keyLeft = this.currKeys["ArrowLeft"] || KeyState.Released;
    input.keyRight = this.currKeys["ArrowRight"] || KeyState.Released;
    input.keyUp = this.currKeys["ArrowUp"] || KeyState.Released;
    input.keyDown = this.currKeys["ArrowDown"] || KeyState.Released;
    input.keySpace = this.currKeys[" "] || KeyState.Released;
    input.keyC = this.currKeys["c"] || KeyState.Released;
    input.keyV = this.currKeys["v"] || KeyState.Released;
    this.ui.fillInput(input);
    return input;
  }
  getStartInput(): DefaultInput {
    return new DefaultInput();
  }
  getGameStateTypeDef(): TypeDescriptor {
    return GameState.TypeDescriptor;
  }
  getGameInputTypeDef(): TypeDescriptor {
    return DefaultInput.TypeDescriptor;
  }

  onTouchUpdate(tea: TouchEventArgs): void {
  }

  onKeyUpdate(kea: KeyEventArgs): void {
    this.actualKeys = ObjUtils.cloneDiscardingTypes(kea.keys);
  }

  // The tick function takes a map of Player -> Input and
  // simulates the game forward. Think of it like making
  // a local multiplayer game with multiple controllers.
  tick(playerInputs: Map<NetplayPlayer, DefaultInput>) {
    let deltaTime = this.timestep / 1000;
    let state = this.state;
    state.time += deltaTime;

    this.currentPlayerId = -1;
    for (const [player, input] of playerInputs.entries()) {
      let playerId = player.getID();
      let unitState = state.units[playerId];
      if (!unitState) {
        let x = playerId === 0 ? -150 : +150;
        unitState = new UnitState(
          playerId,
          new Vect3(x, 0, 0),
          new Vect3(0, 0, 0),
          new Vect2(1, 0),
          SimpleGame.maxLife,
          0,
          0,
          -1,
          0,
          [],
          -1);
        state.units[playerId] = unitState;
      }

      if (player.isLocalPlayer()) {
        this.currentPlayerId = playerId;
      }

      this.tickPlayerMovement(unitState, input, deltaTime);
      this.tickPlayerActions(state, unitState, input, deltaTime);
    }

    let mobHitByIdxUnit: number[] = [];

    for (let [i, projectile] of state.projectiles.entries()) {
      let hitAreaGrenade = false;
      switch (projectile.type) {
        case EProjectileType.Grenade: {
          projectile.vel.scale(0.95);
          hitAreaGrenade = true;
        } break;
      }

      let doDamage = false;
      if (hitAreaGrenade) {
        if (projectile.life <= 0) {
          // The grenade exploded, do damage
          doDamage = true;
        }
      } else {
        doDamage = true;
      }

      let projectileDelta = projectile.vel.clone();
      projectileDelta.scale(deltaTime);
      if (doDamage) {
        // Hit units
        this.tickProjectileHit(state, projectile, projectileDelta, hitAreaGrenade, mobHitByIdxUnit);
      }

      if (projectile.life <= 0) {
        state.projectiles.splice(i, 1);
      } else {
        projectile.pos.addScaled(projectileDelta, 1);
        projectile.life -= 1;
      }
    }

    // Remove dead mobs
    {
      let i = 0;
      while (i < state.mobs.length) {
        if (state.mobs[i].life <= 0) {
          // Remove the mob by replacing it with the last in the list
          if (i < state.mobs.length - 1) {
            state.mobs[i] = state.mobs.pop()!;
          } else {
            state.mobs.pop();
          }

          // Assign score
          let hitByPlayerIdx = state.getPlayerById(mobHitByIdxUnit[i]);
          if (hitByPlayerIdx >= 0) {
            state.units[hitByPlayerIdx].score += 1;
          }
        } else {
          i++;
        }
      }
    }

    for (let [i, mob] of state.mobs.entries()) {
      mob.hitTime += deltaTime;
      mob.pos.x += (mob.knock.x) * deltaTime;
      mob.pos.y += (mob.knock.y) * deltaTime;
      mob.knock.scale(0.85);

      if (mob.life <= 0) continue;

      // Mob logic by type
      switch (mob.type) {
        case EMobType.Dummy:
          break;

        case EMobType.ZombieSpawner:
          switch (mob.state) {
            case EMobState.Idle: {
              if (mob.stateTime <= 0) {
                if (state.mobs.length < 500) {
                  state.spawnMob(EMobType.Zombie,
                    state.nextRandVectXY(80, 150, mob.pos),
                    10);
                }
                mob.stateTime = 3 + state.nextRandF() * 2;
              } else {
                mob.stateTime -= deltaTime;
              }
            } break;
          }
          break;

        case EMobType.Zombie:
          switch (mob.state) {
            case EMobState.Idle: {
              // Find nearest player
              let idxUnit = state.findUnitNearPos(mob.pos, 16 * 20);
              if (idxUnit >= 0) {
                mob.attackPlayerId = state.units[idxUnit].playerId;
                mob.state = EMobState.Follow;
              }
            } break;

            case EMobState.Follow:
            case EMobState.Attack: {
              // Follow the player
              let idxUnit = state.getPlayerById(mob.attackPlayerId);
              if (idxUnit < 0) {
                // Player left the game
                mob.state = EMobState.Idle;

              } else {
                let unit = state.units[idxUnit];
                let dir = unit.pos.getSubtracted(mob.pos);
                let dirLen = dir.length;
                if (mob.state === EMobState.Attack) {
                  if (mob.stateTime > 0) {
                    mob.stateTime -= deltaTime;
                  } else {
                    if (dirLen < 30) {
                      // Attack
                      // Hit and knockback
                      unit.life -= 1;
                      unit.knock.copy(dir);
                      unit.knock.scale(0.8);

                      mob.stateTime = 2 + state.nextRandF() * 3;
                    } else {
                      mob.state = EMobState.Follow;
                    }
                  }

                } else {
                  if (dirLen < 30) {
                    mob.stateTime = 1 + state.nextRandF();
                    mob.state = EMobState.Attack;

                  } else if (dirLen > 16 * 30) {
                    // Disengage
                    mob.attackPlayerId = -1;
                    mob.state = EMobState.Idle;

                  } else {
                    // Walk towards player
                    dir.scale(1 / dirLen);
                    mob.pos.addScaled(dir, 20 * deltaTime);
                  }
                }
              }
            } break;
          } break;

        default:
          break;
      }
    }

    // Kill dead units
    for (let [i, unit] of state.units.entries()) {
      if (unit.life <= 0) {
        // Add a dead unit
        state.deadUnits.push(new DeadUnitState(i, unit.pos.x, unit.pos.y, 100));
        // Give score to shooting player
        if (unit.lastHitByPlayerId >= 0) {
          state.units[unit.lastHitByPlayerId].score += 1;
        }
        // Reset unit to random location
        unit.pos.scale(0); // TODO Random location inside map
        unit.life = SimpleGame.maxLife;
        unit.knock.scale(0);
        break;
      }
    }

    // // Fade dead units
    // for (let [i, unit] of state.deadUnits.entries()) {
    //   unit.fadeTime -= deltaTime;
    //   if (unit.fadeTime <= 0) {
    //     state.deadUnits.splice(i, 1);
    //   }
    // }
  }

  tickPlayerMovement(unitState: UnitState, input: DefaultInput, deltaTime: number) {
    // Generate player velocity from input keys.
    const vel = new Vect2(
      (KeyStateUtils.isPressed(input.keyLeft) ? -1 : 0) +
      (KeyStateUtils.isPressed(input.keyRight) ? 1 : 0) +
      (input.joystick1.x),
      (KeyStateUtils.isPressed(input.keyDown) ? -1 : 0) +
      (KeyStateUtils.isPressed(input.keyUp) ? 1 : 0) +
      (input.joystick1.y),
    );

    // Apply the velocity to the appropriate player.
    let velLen = vel.length;
    if (velLen > 0) {
      unitState.dir.copy(vel);
      unitState.dir.scale(1 / velLen);
    } else {
      unitState.dir.scale(0);
    }
    unitState.pos.x += (vel.x * 100 + unitState.knock.x) * deltaTime;
    unitState.pos.y += (vel.y * 100 + unitState.knock.y) * deltaTime;
    unitState.pos.x = Math.max(worldBounds.x, Math.min(worldBounds.x + worldBounds.width, unitState.pos.x));
    unitState.pos.y = Math.max(worldBounds.y, Math.min(worldBounds.y + worldBounds.height, unitState.pos.y));

    unitState.knock.scale(0.85);
  }

  tickPlayerActions(state: GameState, unitState: UnitState, input: DefaultInput, deltaTime: number) {
    if (unitState.coolDown > 0) {
      unitState.coolDown = Math.max(0, unitState.coolDown - deltaTime);
      return;
    }

    if (unitState.carryMobId > 0) {
      // Update the mob position or drop it
      if (input.keyC === KeyState.JustPressed) {
        unitState.carryMobId = 0;
      } else {
        let mobId = state.mobs.findIndex((x) => x.mobId === unitState.carryMobId);
        state.mobs[mobId].pos.copy(unitState.pos)
        state.mobs[mobId].pos.y += 8;
      }
      return;
    }

    if (input.keyC === KeyState.JustPressed) {
      let mobIdx = state.findMobNearPos(unitState.pos, 16);
      if (mobIdx >= 0) {
        // If the mob is an item, put in inventory, else carry it
        let mob = this.state.mobs[mobIdx];
        switch (mob.type) {
          case EMobType.ShopBuyPistol: {
            if (!unitState.hasItem(EItemType.Pistol)) {
              unitState.addItemToInventory(EItemType.Pistol, 1);
            }
          } return;

          case EMobType.ShopBuyGrenade: {
            if (!unitState.hasItem(EItemType.Grenade)) {
              unitState.addItemToInventory(EItemType.Grenade, 1);
            }
          } return;
        }

        // Not a special mob, carry it
        unitState.carryMobId = state.mobs[mobIdx].mobId;
        return;
      }
    }

    if (input.keyV === KeyState.JustPressed) {
      unitState.grabNextItem();
      return;
    }

    // If nothing in hand, skip item action
    if (unitState.rightHandItemIdx < 0) {
      return;
    }

    let item = unitState.inventoryItems[unitState.rightHandItemIdx];
    let projectileType = item.type === EItemType.Grenade ? EProjectileType.Grenade : EProjectileType.Pistol;
    let projectileLife = projectileType === EProjectileType.Pistol ? 180 : 60;

    let dir: Vect3 | undefined;
    if (KeyStateUtils.isPressed(input.keySpace)) {
      dir = new Vect3(unitState.dir.x, unitState.dir.y, 0);
    } else if (input.joystick2.x !== 0 || input.joystick2.y !== 0) {
      dir = new Vect3(input.joystick2.x, input.joystick2.y, 0);
      dir.normalize();
    }

    // Fire
    if (dir) {
      let pos = unitState.pos.clone();
      // TODO handle height from ground
      pos.addScaled(dir, 10);
      pos.addScaled(new Vect3(0, 1, 0), 15);
      state.spawnProjectile(
        projectileType,
        pos,
        new Vect3(dir.x * 360, dir.y * 360, 0),
        projectileLife,
        unitState.playerId);

      switch (item.type) {
        case EItemType.Pistol:
          unitState.coolDown = 0.05;
          break;

        case EItemType.Grenade:
          unitState.coolDown = 2;
          break;

        default:
          unitState.coolDown = 1;
      }
    }
  }

  tickProjectileHit(state: GameState, projectile: ProjectileState, projectileDelta: Vect3, hitAreaGrenade: boolean, mobHitByIdxUnit: number[]) {
    for (let [j, unit] of state.units.entries()) {
      // Avoid auto-hit with ammunition
      if (projectile.type === EProjectileType.Pistol) {
        if (projectile.playerId === j) {
          continue;
        }
      }
      if (SimpleGame.spriteCollides(projectile.pos, projectileDelta, unit.pos, hitAreaGrenade)) {
        projectile.life = 0;

        // Hit and knockback
        let damage = this.calcProjectileDamage(projectile, unit.pos);
        unit.life -= damage;
        unit.lastHitByPlayerId = projectile.playerId;
        
        // TODO Proper knockback
        if (hitAreaGrenade) {
          unit.knock = projectile.pos.versorTo(unit.pos);
          unit.knock.scale(damage * 50);
        } else {
          unit.knock.copy(projectile.vel);
          unit.knock.scale(0.8);
          return; // Can only hit once
        }
      }
    }

    // Hit mobs
    for (let [j, mob] of state.mobs.entries()) {
      if (SimpleGame.spriteCollides(projectile.pos, projectileDelta, mob.pos, hitAreaGrenade)) {
        projectile.life = 0;

        let damage = this.calcProjectileDamage(projectile, mob.pos); 
        mob.life -= damage;
        mob.hitTime = 0;
        mobHitByIdxUnit[j] = projectile.playerId;
        
        // TODO Proper knockback
        if (hitAreaGrenade) {
          mob.knock = projectile.pos.versorTo(mob.pos);
          mob.knock.scale(damage * 50);
        } else {
          mob.knock.copy(projectile.vel);
          mob.knock.scale(0.1);
          return; // Can only hit once
        }
      }
    }
  }

  calcProjectileDamage(projectile: ProjectileState, damagePos: Vect3): number {
    if (projectile.type === EProjectileType.Grenade) {
      let dist = projectile.pos.distanceTo(damagePos);
      let factor = Math.max(0, Math.min(dist / 150, 1));
      return Math.ceil(10 - factor * 10);
    } else {
      return 1;
    }
  }

  static spriteCollides(projectilePos: Vect3, projectileDelta: Vect3, unitPos: Vect3, hitAreaGrenade: boolean) {
    if (hitAreaGrenade) {
      return unitPos.distanceTo(projectilePos) < 150;
    } else {
      return unitPos.distanceFromSegment(projectilePos, projectileDelta) < 10;
    }
  }

  // The draw method synchronizes the game state with the scene nodes and components
  draw() {
    this.drawSyncComps(this.state.units, this.unitComps, UnitComp);
    this.drawSyncComps(this.state.projectiles, this.projectileComps, ProjectileComp);
    this.drawSyncComps(this.state.mobs, this.mobComps, MobComp);

    // // TODO Extract sync logic and unify with units above
    // for (let [i, projectile] of this.state.projectiles.entries()) {
    //   let spriteComp: SpriteComp;
    //   if (this.projectileComps.length <= i) {
    //     spriteComp = new SpriteComp(this.projectileSprite.clone());
    //     this.projectileComps.push(spriteComp);
    //     Node.createFromComp(this.scene, spriteComp);
    //   } else {
    //     spriteComp = this.projectileComps[i];
    //   }
    //   let t = spriteComp.node!.transform as Transform2D;
    //   t.x = projectile.pos.x;
    //   t.y = projectile.pos.y;
    // }

    // // Remove leftover projectile sprites
    // let leftoverProjectileSprites = this.projectileComps.splice(this.state.projectiles.length);
    // for (let sprite of leftoverProjectileSprites) {
    //   this.scene.removeNode(sprite.node!);
    // }

    for (let [i, unit] of this.state.deadUnits.entries()) {
      let spriteComp: SpriteComp;
      if (this.deadUnitSprites.length <= i) {
        //spriteComp = new SpriteComp(this.resources.unitSprites[unit.playerId]);
        spriteComp = new SpriteComp(this.resources.man1Idle);
        this.deadUnitSprites.push(spriteComp);
        Node.createFromComp(this.scene, spriteComp);
      } else {
        spriteComp = this.deadUnitSprites[i];
      }

      // animate opacity based on remaining time
      spriteComp.color.a = Math.min(1, unit.fadeTime / 20) * 0.8;
      let t = spriteComp.node!.transform as Transform2D;
      t.x = unit.x;
      t.y = unit.y;
      t.angle = Math.PI;
    }

    // Remove leftover unit sprites
    let leftoverDeadUnitSprites = this.deadUnitSprites.splice(this.state.deadUnits.length);
    for (let sprite of leftoverDeadUnitSprites) {
      this.scene.removeNode(sprite.node!);
    }

    // Update camera position and background
    if (this.currentPlayerId >= 0) {
      this.followCameraComp.updateFollow(this.state.units[this.currentPlayerId].pos);
      this.mapBackgroundComp.cameraPos.copy(this.followCameraComp.pos);
    }

    // Update UI
    if (this.currentPlayerId >= 0) {
      let playerUnit = this.state.units[this.currentPlayerId];
      this.ui.updateUI(playerUnit);
    }
  }

  drawSyncComps<TState extends { getId(): number },
    TComp extends Component & IStateComponent<TState>>(
      states: TState[],
      comps: Map<number, TComp>,
      type: { new(stateId: number): TComp; }) {

    for (let state of states) {
      let stateId = state.getId();
      let comp = comps.get(stateId);

      if (!comp) {
        comp = new type(stateId);
        comps.set(stateId, comp);
        Node.createFromComp(this.scene, comp);
      }

      comp.update(state, this.resources);
    }

    // Remove leftover unit sprites
    if (states.length !== comps.size) {
      // Build a key map
      let keys = new Set<number>();
      for (let state of states) {
        keys.add(state.getId());
      }

      for (let key of comps.keys()) {
        if (!keys.has(key)) {
          this.scene.removeNode(comps.get(key)!.node!);
          comps.delete(key);
        }
      }
    }
  }
}

class MapBackgroundComp extends FullScreenQuad {
  constructor() {
    super(`
    //color: output color to modify
    //pixelPosCenter: current pixel in world coord

    vec2 worldBoundsHalf = vec2(${(worldBounds.width / 2).toFixed(1)}, ${(worldBounds.height / 2).toFixed(1)});
    float rectRadius = 50.0;
    vec2 d = abs(pixelPosCenter) - worldBoundsHalf + vec2(rectRadius);
    float rectDist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rectRadius;
    color.xyz *= vec3(1.0 - clamp(rectDist, 0.0, 50.0) / 50.0 * 0.4);
    `);
  }
}

export class DefaultInput extends NetplayInput<DefaultInput> {
  keyLeft: KeyState = KeyState.Released;
  keyRight: KeyState = KeyState.Released;
  keyUp: KeyState = KeyState.Released;
  keyDown: KeyState = KeyState.Released;
  keySpace: KeyState = KeyState.Released;
  keyC: KeyState = KeyState.Released;
  keyV: KeyState = KeyState.Released;
  joystick1: Vect2 = new Vect2(0, 0);
  joystick2: Vect2 = new Vect2(0, 0);
  joystick3: Vect2 = new Vect2(0, 0);

  static readonly TypeDescriptor: TypeDescriptor = DefaultInput.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, DefaultInput);
    td.addProp("keyLeft", TypeDescriptor.Int32);
    td.addProp("keyRight", TypeDescriptor.Int32);
    td.addProp("keyUp", TypeDescriptor.Int32);
    td.addProp("keyDown", TypeDescriptor.Int32);
    td.addProp("keySpace", TypeDescriptor.Int32);
    td.addProp("keyC", TypeDescriptor.Int32);
    td.addProp("keyV", TypeDescriptor.Int32);
    td.addProp("joystick1", Vect2.TypeDescriptor);
    td.addProp("joystick2", Vect2.TypeDescriptor);
    td.addProp("joystick3", Vect2.TypeDescriptor);
    return td;
  }
}