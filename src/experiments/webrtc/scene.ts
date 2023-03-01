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
import { EJoystickType, JoystickComp } from "./joystickcomp";
import { FollowCameraComp } from "./scene/followcameracomp";
import { IStateComponent } from "./scene/istatecomp";
import { MobComp } from "./scene/mobcomp";
import { Resources } from "./scene/resources";
import { UnitComp } from "./scene/unitcomp";
import { DeadUnitState, EMobState, EMobType, GameState, MobState, ProjectileState, UnitState } from "./state/gamestate";
import { HeartComp } from "./ui/heartcomp";
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

  private unitComps: UnitComp[];
  private projectileSpriteComps: SpriteComp[];
  private deadUnitSprites: SpriteComp[];
  private mobComps: MobComp[];

  private resources: Resources;
  private projectileSprite: Sprite;

  actualKeys: { [key: string]: KeyState } = {};
  currKeys: { [key: string]: KeyState } = {};

  private state: GameState;

  private nodeRootUI: NodeUI;
  private joystickCompLeft: JoystickComp;
  private joystickCompRight: JoystickComp;
  private joystickCompGrab: JoystickComp;
  private nodeUILifeContainer: NodeUI;

  private mapBackgroundComp: MapBackgroundComp;
  private followCameraComp: FollowCameraComp;
  private currentPlayerId: number;

  private readonly maxLife: number = 10;

  onCreate() {
    this.state = new GameState();

    for (let i = 0; i < 25; i++) {
      this.state.mobs.push(new MobState(this.state.nextMobId, 
                                        EMobType.Zombie, 
                                        Vect.createRandom(worldBounds), 
                                        100000, 
                                        -1, 
                                        EMobState.Idle,
                                        0));
      this.state.nextMobId += 1;
    }
    //this.state.mobs.push(new MobState(EMobType.Dummy, new Vect(0, 0), 0));
    this.unitComps = [];
    this.projectileSpriteComps = [];
    this.deadUnitSprites = [];
    this.mobComps = [];

    this.resources = new Resources(this.scene.engine);

    this.projectileSprite = new Sprite(Texture.createFromUrl(this.scene.engine, `webrtc/bullet1.png`), new Rect(0, 0, 6, 6), new Vect(3, 3));

    this.mapBackgroundComp = new MapBackgroundComp();
    Node.createFromComp(this.scene, this.mapBackgroundComp);

    this.followCameraComp = new FollowCameraComp();
    Node.createFromComp(this.scene, this.followCameraComp);

    this.draw();

    // Show touch controls only on mobile and request fullscreen
    let uiRootComp = new UIRootComp();
    uiRootComp.uiTexture = Texture.createFromUrl(this.scene.engine, "webrtc/ui.png", false);
    this.nodeRootUI = NodeUI.createFromComp(this.scene, uiRootComp);
    this.nodeUILifeContainer = NodeUI.createFromComp(this.scene, new HeartComp(), this.nodeRootUI);
    this.nodeUILifeContainer.transformUI.alignH = Align.Middle;
    this.nodeUILifeContainer.transformUI.alignV = Align.Begin;
    this.nodeUILifeContainer.transformUI.width = 18 * 10;
    this.nodeUILifeContainer.transformUI.height = 30;
    this.nodeUILifeContainer.transformUI.margin = Margin.uniform(5);

    if (this.scene.engine.isMobile) {
      this.scene.engine.requestFullscreen();

      this.joystickCompLeft = new JoystickComp(EJoystickType.Movement);
      NodeUI.createFromComp(this.scene, this.joystickCompLeft, this.nodeRootUI);

      this.joystickCompRight = new JoystickComp(EJoystickType.Shoot);
      NodeUI.createFromComp(this.scene, this.joystickCompRight, this.nodeRootUI);

      this.joystickCompGrab = new JoystickComp(EJoystickType.Grab);
      NodeUI.createFromComp(this.scene, this.joystickCompGrab, this.nodeRootUI);
    }
  }

  onUpdate() {

  }

  serialize(): SerializedState {
    return ObjUtils.cloneDiscardingTypes(this.state);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: SerializedState): void {
    this.state = ObjUtils.cloneUsingTypeDescriptor(value, GameState.TypeDescriptor);
  }

  getInput(): DefaultInput {
    let input = new DefaultInput();

    if (this.joystickCompGrab?.isTouching) {
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
    input.joystick1 = new Vect(this.joystickCompLeft?.dx ?? 0, this.joystickCompLeft?.dy ?? 0);
    input.joystick2 = new Vect(this.joystickCompRight?.dx ?? 0, this.joystickCompRight?.dy ?? 0);
    input.joystick3 = new Vect(this.joystickCompGrab?.dx ?? 0, this.joystickCompGrab?.dy ?? 0);
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
    this.state.time += deltaTime;

    this.currentPlayerId = -1;
    for (const [player, input] of playerInputs.entries()) {
      let playerId = player.getID();
      let unitState = this.state.units[playerId];
      if (!unitState) {
        let x = playerId === 0 ? -150 : +150;
        unitState = new UnitState(playerId, new Vect(x, 0), new Vect(0, 0), new Vect(1, 0), this.maxLife, 0, 0, -1, 0);
        this.state.units[playerId] = unitState;
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
          let mobId = this.state.mobs.findIndex((x) => x.mobId === unitState.carryMobId);
          this.state.mobs[mobId].pos.copy(unitState.pos)
          this.state.mobs[mobId].pos.y += 8;
        }

      } else if (input.keyC === KeyState.JustPressed) {
        let mobIdx = this.state.findMobNearPos(unitState.pos, 16);
        if (mobIdx >= 0) {
          unitState.carryMobId = this.state.mobs[mobIdx].mobId;
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
          let sprite = this.unitComps[player.getID()].sprite;
          if (sprite) {
            pos.addScaled(sprite.spriteRect.center, 1);
          }
          pos.addScaled(dir, 10);
          this.state.projectiles.push(new ProjectileState(
            pos,
            new Vect(dir.x * 360, dir.y * 360),
            60 * 3, player.getID()));
          unitState.coolDown = 0.05;
        }
      }
    }

    for (let [i, projectile] of this.state.projectiles.entries()) {
      let projectileDelta = projectile.vel.clone();
      projectileDelta.scale(deltaTime);

      // Hit units
      for (let [j, unit] of this.state.units.entries()) {
        if (projectile.playerId === j) {
          continue;
        }
        if (this.spriteCollides(projectile.pos, projectileDelta, unit.pos, this.unitComps[unit.playerId].sprite)) {
          projectile.life = 0;

          // Hit and knockback
          unit.life -= 1;
          unit.lastHitByPlayerId = projectile.playerId;
          unit.knock.copy(projectile.vel);
          unit.knock.scale(0.8);
        }
      }

      // Hit mobs
      for (let [j, mob] of this.state.mobs.entries()) {
        if (this.spriteCollides(projectile.pos, projectileDelta, mob.pos, this.mobComps[j].sprite)) {
          projectile.life = 0;

          mob.hitTime = 0;
          // TODO Kill mob
        }
      }

      if (projectile.life <= 0) {
        this.state.projectiles.splice(i, 1);
      } else {
        projectile.pos.addScaled(projectileDelta, 1);
        projectile.life -= 1;
      }
    }

    for (let [i, mob] of this.state.mobs.entries()) {
      // Mob logic by type
      switch (mob.type) {
        case EMobType.Dummy:
          mob.hitTime += this.timestep;
          break;

        case EMobType.Zombie:
          switch (mob.state) {
            case EMobState.Idle: {
              // Find nearest player
              let idxUnit = this.state.findUnitNearPos(mob.pos, 16 * 10);
              if (idxUnit >= 0) {
                mob.attackPlayerId = this.state.units[idxUnit].playerId;
                mob.state = EMobState.Follow;
              }
            } break;

            case EMobState.Follow:
            case EMobState.Attack: {
              // Follow the player
              let idxUnit = this.state.getPlayerById(mob.attackPlayerId);
              if (idxUnit < 0) {
                // Player left the game
                mob.state = EMobState.Idle;

              } else {
                let unit = this.state.units[idxUnit];
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

                      mob.stateTime = 2 + this.state.nextRandF() * 3;
                    } else {
                      mob.state = EMobState.Follow;
                    }
                  }

                } else {
                  if (dirLen < 30) {
                    mob.stateTime = 1 + this.state.nextRandF();
                    mob.state = EMobState.Attack;
                    
                  } else if (dirLen > 16 * 20) {
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
    for (let [i, unit] of this.state.units.entries()) {
      if (unit.life <= 0) {
        // Add a dead unit
        this.state.deadUnits.push(new DeadUnitState(i, unit.pos.x, unit.pos.y, 100));
        // Give score to shooting player
        if (unit.lastHitByPlayerId >= 0) {
          this.state.units[unit.lastHitByPlayerId].score += 1;
        }
        // Reset unit to random location
        unit.pos.scale(0); // TODO Random location inside map
        unit.life = this.maxLife;
        unit.knock.scale(0);
        break;
      }
    }

    // // Fade dead units
    // for (let [i, unit] of this.state.deadUnits.entries()) {
    //   unit.fadeTime -= deltaTime;
    //   if (unit.fadeTime <= 0) {
    //     this.state.deadUnits.splice(i, 1);
    //   }
    // }
  }

  spriteCollides(projectilePos: Vect, projectileDelta: Vect, spritePos: Vect, sprite: Sprite | undefined) {
    let unitCenter = spritePos.clone();
    if (sprite) {
      unitCenter.addScaled(sprite.spriteRect.center, 1);
    }
    return unitCenter.distanceFromSegment(projectilePos, projectileDelta) < 10;
  }

  // The draw method synchronizes the game state with the scene nodes and components
  draw() {
    this.drawSyncComps(this.state.units, this.unitComps, UnitComp);
    this.drawSyncComps(this.state.mobs, this.mobComps, MobComp);

    // TODO Extract sync logic and unify with units above
    for (let [i, projectile] of this.state.projectiles.entries()) {
      let spriteComp: SpriteComp;
      if (this.projectileSpriteComps.length <= i) {
        spriteComp = new SpriteComp(this.projectileSprite.clone());
        this.projectileSpriteComps.push(spriteComp);
        Node.createFromComp(this.scene, spriteComp);
      } else {
        spriteComp = this.projectileSpriteComps[i];
      }
      let t = spriteComp.node!.transform as Transform2D;
      t.x = projectile.pos.x;
      t.y = projectile.pos.y;
    }

    // Remove leftover projectile sprites
    let leftoverProjectileSprites = this.projectileSpriteComps.splice(this.state.projectiles.length);
    for (let sprite of leftoverProjectileSprites) {
      this.scene.removeNode(sprite.node!);
    }

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
      let unit = this.state.units[this.currentPlayerId];
      (this.nodeUILifeContainer.getComponent(HeartComp) as HeartComp).onUpdateLife(unit.life, unit.score);
    }
  }

  drawSyncComps<TState, TComp extends Component & IStateComponent<TState>>(states: TState[], comps: TComp[], type: { new(): TComp; }) {
    for (let [i, state] of states.entries()) {
      let comp = comps[i];
      if (!comp) {
        comp = new type();
        comps[i] = comp;
        Node.createFromComp(this.scene, comp);
      }

      comp.update(state, this.resources);
    }

    // Remove leftover unit sprites
    let leftoverComps = comps.splice(states.length);
    for (let comp of leftoverComps) {
      this.scene.removeNode(comp.node!);
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