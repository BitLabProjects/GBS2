import { Engine, IInputHandler, KeyEventArgs, TouchEventArgs } from "../../engine/engine";
import { Component, Node, NodeUI, Transform2D } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { Sprite, SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";
import { DefaultInput, KeyState } from "../../net/defaultinput";
import { Game } from "../../net/game";
import { RollbackClient } from "../../net/rollbackClient";
import { RollbackHost } from "../../net/rollbackHost";
import { NetplayPlayer, SerializedState } from "../../net/types";
import { ObjUtils, TypeDescriptor } from "../../utils/objutils";
import { Rect } from "../../utils/rect";
import { Vect } from "../../utils/vect";
import { FullScreenQuad } from "../flocking/fullscreenquad";
import { JoystickComp } from "./joystickcomp";
import { FollowCameraComp } from "./scene/followcameracomp";
import { IStateComponent } from "./scene/istatecomp";
import { MobComp } from "./scene/mobcomp";
import { Resources } from "./scene/resources";
import { UnitComp } from "./scene/unitcomp";
import { DeadUnitState, EMobType, GameState, MobState, ProjectileState, UnitState } from "./state/gamestate";
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

  keys: { [key: string]: KeyState } = {};

  private state: GameState;

  private nodeRootUI: NodeUI;
  private joystickCompLeft: JoystickComp;
  private joystickCompRight: JoystickComp;

  private mapBackgroundComp: MapBackgroundComp;
  private followCameraComp: FollowCameraComp;
  private currentPlayerId: number;

  private readonly maxLife: number = 10;

  onCreate() {
    this.state = new GameState();
    this.state.units.push(new UnitState(0, new Vect(-150, 0), new Vect(0, 0), new Vect(1, 0), this.maxLife, 0, 0, -1));
    this.state.units.push(new UnitState(1, new Vect(+150, 0), new Vect(0, 0), new Vect(1, 0), this.maxLife, 0, 0, -1));

    for(let i=0; i<25; i++) { 
      this.state.mobs.push(new MobState(EMobType.Dummy, Vect.createRandom(worldBounds), 0));
    }
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
    if (this.scene.engine.isMobile) {
      this.nodeRootUI = NodeUI.createFromComp(this.scene, new UIRootComp());
      this.scene.engine.requestFullscreen();
      
      this.joystickCompLeft = new JoystickComp(true);
      NodeUI.createFromComp(this.scene, this.joystickCompLeft, this.nodeRootUI);

      this.joystickCompRight = new JoystickComp(false);
      NodeUI.createFromComp(this.scene, this.joystickCompRight, this.nodeRootUI);
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

  init(players: NetplayPlayer[]): void {
  }

  getInput(): DefaultInput {
    let input = this.getStartInput();
    for(let key in this.keys) {
      input.pressed[key] = this.keys[key];
    }
    input.touchControls = {};
    input.touchControls["joystick1"] = { x: this.joystickCompLeft?.dx ?? 0, y: this.joystickCompLeft?.dy ?? 0};
    input.touchControls["joystick2"] = { x: this.joystickCompRight?.dx ?? 0, y: this.joystickCompRight?.dy ?? 0};
    return input;
  }
  getStartInput(): DefaultInput {
    let input = new DefaultInput();
    input.touchControls = {};
    input.touchControls["joystick1"] = { x: 0, y: 0};
    input.touchControls["joystick2"] = { x: 0, y: 0};
    return input;
  }

  onTouchUpdate(tea: TouchEventArgs): void {
  }
  
  onKeyUpdate(kea: KeyEventArgs): void {
    this.keys = ObjUtils.cloneDiscardingTypes(kea.keys);
  }

  // The tick function takes a map of Player -> Input and
  // simulates the game forward. Think of it like making
  // a local multiplayer game with multiple controllers.
  tick(playerInputs: Map<NetplayPlayer, DefaultInput>) {
    let deltaTime = this.timestep / 1000;

    this.currentPlayerId = -1;
    for (const [player, input] of playerInputs.entries()) {
      if (player.isLocal) {
        this.currentPlayerId = player.id;
      }

      // Generate player velocity from input keys.
      const vel = new Vect(
          (input.isPressed("ArrowLeft") ? -1 : 0) +
          (input.isPressed("ArrowRight") ? 1 : 0) +
          (input.touchControls!.joystick1.x), 
          (input.isPressed("ArrowDown") ? -1 : 0) +
          (input.isPressed("ArrowUp") ? 1 : 0) +
          (input.touchControls!.joystick1.y),
      );


      // Apply the velocity to the appropriate player.
      let unitState = this.state.units[player.getID()];
      let velLen = vel.length;
      if (velLen > 0) {
        unitState.dir.copy(vel);
        unitState.dir.scale(1 / velLen);
      }
      unitState.pos.x += (vel.x * 50 + unitState.knock.x) * deltaTime;
      unitState.pos.y += (vel.y * 50 + unitState.knock.y) * deltaTime;
      unitState.pos.x = Math.max(worldBounds.x, Math.min(worldBounds.x + worldBounds.width, unitState.pos.x));
      unitState.pos.y = Math.max(worldBounds.y, Math.min(worldBounds.y + worldBounds.height, unitState.pos.y));

      unitState.knock.scale(0.85);

      if (unitState.coolDown > 0) {
        unitState.coolDown -= deltaTime;
      } else {
        let dir: Vect | undefined;

        if (input.isPressed(" ")) {
          dir = unitState.dir.clone();
        } else if (input.touchControls!.joystick2.x !== 0 || input.touchControls!.joystick2.y !== 0) {
          dir = new Vect(input.touchControls!.joystick2.x, input.touchControls!.joystick2.y);
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
        spriteComp = new SpriteComp(this.resources.unitSprites[unit.playerId]);
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

    if (this.currentPlayerId >= 0) {
      this.followCameraComp.updateFollow(this.state.units[this.currentPlayerId].pos);
      this.mapBackgroundComp.cameraPos.copy(this.followCameraComp.pos);
    }
  }

  drawSyncComps<TState, TComp extends Component & IStateComponent<TState>>(states: TState[], comps: TComp[], type: { new () : TComp; }) {
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