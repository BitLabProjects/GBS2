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
import { Vect } from "../../utils/vect";
import { FullScreenQuad } from "../flocking/fullscreenquad";
import { EJoystickType, JoystickComp } from "./ui/joystickcomp";
import { FollowCameraComp } from "./scene/followcameracomp";
import { IStateComponent } from "./scene/istatecomp";
import { MobComp } from "./scene/mobcomp";
import { Resources } from "./scene/resources";
import { UnitComp } from "./scene/unitcomp";
import { DeadUnitState, EMobState, EMobType, EProjectileType, GameState, MobState, ProjectileState, UnitState } from "./state/gamestate";
import { HeartComp } from "./ui/heartcomp";
import { UI } from "./ui/ui";
import { ProjectileComp } from "./scene/projectilecomp";
//import { JoystickComp } from "./JoystickComp";

const worldBounds: Rect = new Rect(-400, -400, 800, 800);

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

    for (let i = 0; i < 5; i++) {
      this.state.spawnMob(EMobType.ZombieSpawner, Vect.createRandom(worldBounds), 1000);
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

    if (this.ui.isJoystickGrabPressed) {
      this.actualKeys['c'] = KeyState.Pressed;
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
        unitState = new UnitState(playerId, new Vect(x, 0), new Vect(0, 0), new Vect(1, 0), SimpleGame.maxLife, 0, 0, -1, 0);
        state.units[playerId] = unitState;
      }

      if (player.isLocalPlayer()) {
        this.currentPlayerId = playerId;
      }

      // Generate player velocity from input keys.
      const vel = new Vect(
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

      if (unitState.coolDown > 0) {
        unitState.coolDown = Math.max(0, unitState.coolDown - deltaTime);
      } else if (unitState.carryMobId > 0) {
        // Update the mob position or drop it
        if (input.keyC === KeyState.JustPressed) {
          unitState.carryMobId = 0;
        } else {
          let mobId = state.mobs.findIndex((x) => x.mobId === unitState.carryMobId);
          state.mobs[mobId].pos.copy(unitState.pos)
          state.mobs[mobId].pos.y += 8;
        }

      } else if (input.keyC === KeyState.JustPressed) {
        let mobIdx = state.findMobNearPos(unitState.pos, 16);
        if (mobIdx >= 0) {
          unitState.carryMobId = state.mobs[mobIdx].mobId;
        }

      } else {
        let dir: Vect | undefined;

        if (KeyStateUtils.isPressed(input.keySpace)) {
          dir = unitState.dir.clone();
        } else if (input.joystick2.x !== 0 || input.joystick2.y !== 0) {
          dir = new Vect(input.joystick2.x, input.joystick2.y);
          dir.normalize();
        }

        // Fire
        if (dir) {
          let pos = unitState.pos.clone();
          // TODO handle height from ground
          pos.addScaled(dir, 10);
          pos.addScaled(new Vect(0, 1), 15);
          state.spawnProjectile(
            EProjectileType.Pistol,
            pos,
            new Vect(dir.x * 360, dir.y * 360),
            60 * 3, 
            player.getID());
          unitState.coolDown = 0.05;
        }
      }
    }

    let mobHitByIdxUnit: number[] = [];

    for (let [i, projectile] of state.projectiles.entries()) {
      let projectileDelta = projectile.vel.clone();
      projectileDelta.scale(deltaTime);

      // Hit units
      for (let [j, unit] of state.units.entries()) {
        if (projectile.playerId === j) {
          continue;
        }
        if (SimpleGame.spriteCollides(projectile.pos, projectileDelta, unit.pos)) {
          projectile.life = 0;

          // Hit and knockback
          unit.life -= 1;
          unit.lastHitByPlayerId = projectile.playerId;
          unit.knock.copy(projectile.vel);
          unit.knock.scale(0.8);
          
          break;
        }
      }

      if (projectile.life > 0) {
        // Hit mobs
        for (let [j, mob] of state.mobs.entries()) {
          if (SimpleGame.spriteCollides(projectile.pos, projectileDelta, mob.pos)) {
            projectile.life = 0;
  
            mob.hitTime = 0;
            mob.life -= 1;
            mobHitByIdxUnit[j] = projectile.playerId;
  
            break;
          }
        }
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
      if (mob.life <= 0) continue;

      // Mob logic by type
      switch (mob.type) {
        case EMobType.Dummy:
          break;

        case EMobType.ZombieSpawner:
          switch (mob.state) {
            case EMobState.Idle: {
              if (mob.stateTime <= 0) {
                if (state.mobs.length < 100) {
                  state.spawnMob(EMobType.Zombie, 
                    state.nextRandVect(80, 150, mob.pos), 
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

  static spriteCollides(projectilePos: Vect, projectileDelta: Vect, spritePos: Vect) {
    let unitCenter = spritePos.clone();
    return unitCenter.distanceFromSegment(projectilePos, projectileDelta) < 10;
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

  drawSyncComps<TState extends {getId(): number}, 
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

      for(let key of comps.keys()) {
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
  joystick1: Vect = new Vect(0, 0);
  joystick2: Vect = new Vect(0, 0);
  joystick3: Vect = new Vect(0, 0);

  static readonly TypeDescriptor: TypeDescriptor = DefaultInput.createTypeDescriptor();
  static createTypeDescriptor(): TypeDescriptor {
    let td = new TypeDescriptor(TypeKind.Generic, DefaultInput);
    td.addProp("keyLeft", TypeDescriptor.Int32);
    td.addProp("keyRight", TypeDescriptor.Int32);
    td.addProp("keyUp", TypeDescriptor.Int32);
    td.addProp("keyDown", TypeDescriptor.Int32);
    td.addProp("keySpace", TypeDescriptor.Int32);
    td.addProp("keyC", TypeDescriptor.Int32);
    td.addProp("joystick1", Vect.TypeDescriptor);
    td.addProp("joystick2", Vect.TypeDescriptor);
    td.addProp("joystick3", Vect.TypeDescriptor);
    return td;
  }
}