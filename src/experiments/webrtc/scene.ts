import { Engine, IInputHandler, KeyEventArgs, TouchEventArgs } from "../../engine/engine";
import { Component, Node, NodeUI, Transform2D } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { Sprite, SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";
import { DefaultInput, KeyState } from "../../net/defaultinput";
import { Game } from "../../net/game";
import { RollbackWrapper } from "../../net/rollbackwrapper";
import { TouchControl, VirtualJoystick } from "../../net/touchcontrols";
import { NetplayPlayer, SerializedState } from "../../net/types";
import { clone } from "../../net/utils";
import { ObjUtils, TypeDescriptor } from "../../utils/objutils";
import { Vect } from "../../utils/vect";
import { FullScreenQuad } from "../flocking/fullscreenquad";
import { JoystickComp } from "./joystickcomp";
//import { JoystickComp } from "./JoystickComp";

export class WebRTCSceneHost extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    Node.createFromComp(this, new FullScreenQuad());
    let gameComponent = new SimpleGame();
    Node.createFromComp(this, gameComponent);
    new RollbackWrapper(gameComponent, engine.canvas).start(roomName, false);
  }
}

export class WebRTCScene extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    Node.createFromComp(this, new FullScreenQuad());
    let gameComponent = new SimpleGame();
    Node.createFromComp(this, gameComponent);
    new RollbackWrapper(gameComponent, engine.canvas).start(roomName, true);
  }
}

class GameState {
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

class UnitState {
  constructor(
    public pos: Vect,
    public knock: Vect,
    public dir: Vect,
    public life: number,
    public score: number,
    public coolDown: number,
    public lastHitByPlayerId: number) { }
}
class ProjectileState {
  constructor(
    public pos: Vect,
    public vel: Vect,
    public life: number,
    public playerId: number) { }
}
class DeadUnitState {
  constructor(
    public playerId: number, 
    public x: number, 
    public y: number, 
    public fadeTime: number) { }
}
enum EMobType {
  Unknown = 0,
  Dummy = 1,
}
class MobState {
  constructor(public type: EMobType, public pos: Vect) {
  }
}

class SimpleGame extends Component implements Game<DefaultInput>, IInputHandler {
  timestep: number = 1000 / 60;
  deterministic: boolean = true;

  private unitSpriteComps: SpriteComp[];
  private projectileSpriteComps: SpriteComp[];
  private deadUnitSprites: SpriteComp[];
  private mobSpriteComps: SpriteComp[];

  private unitSprites: Sprite[];
  private projectileSprite: Sprite;
  private mobSprites: Sprite[];

  keys: { [key: string]: KeyState } = {};

  private state: GameState;

  private nodeRootUI: NodeUI;
  private joystickCompLeft: JoystickComp;
  private joystickCompRight: JoystickComp;

  private readonly maxLife: number = 10;

  onCreate() {
    this.state = new GameState();
    this.state.units.push(new UnitState(new Vect(-150, 0), new Vect(0, 0), new Vect(1, 0), this.maxLife, 0, 0, -1));
    this.state.units.push(new UnitState(new Vect(+150, 0), new Vect(0, 0), new Vect(1, 0), this.maxLife, 0, 0, -1));
    this.state.mobs.push(new MobState(EMobType.Dummy, new Vect(0, 0)));
    this.unitSpriteComps = [];
    this.projectileSpriteComps = [];
    this.deadUnitSprites = [];
    this.mobSpriteComps = [];

    this.unitSprites = [];
    this.unitSprites.push(new Sprite(Texture.createFromUrl(this.scene.engine, `flocking/unit1.png`), new Vect(4, 0)));
    this.unitSprites.push(new Sprite(Texture.createFromUrl(this.scene.engine, `flocking/unit2.png`), new Vect(6, 0)));
    this.projectileSprite = new Sprite(Texture.createFromUrl(this.scene.engine, `webrtc/bullet1.png`), new Vect(3, 3));

    this.mobSprites = [];
    this.mobSprites[EMobType.Dummy] = new Sprite(Texture.createFromUrl(this.scene.engine, `webrtc/dummy.png`), new Vect(4, 0));

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
    return clone(this.state);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: SerializedState): void {
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

    this.state = ObjUtils.cloneUsingTypeDescriptor(value, td);
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
    this.keys = ObjUtils.clone(kea.keys);
  }

  // The tick function takes a map of Player -> Input and
  // simulates the game forward. Think of it like making
  // a local multiplayer game with multiple controllers.
  tick(playerInputs: Map<NetplayPlayer, DefaultInput>) {
    let deltaTime = 1 / 60; //TODO

    for (const [player, input] of playerInputs.entries()) {
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
        unitState.dir = vel.clone();
        unitState.dir.scale(1 / velLen);
      }
      unitState.pos.x += (vel.x * 50 + unitState.knock.x) * deltaTime;
      unitState.pos.y += (vel.y * 50 + unitState.knock.y) * deltaTime;

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
          pos.addScaled(this.unitSpriteComps[player.getID()].sprite.spriteRect.center, 1);
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
        if (this.spriteCollides(projectile.pos, projectileDelta, unit.pos, this.unitSpriteComps[j].sprite)) {
          projectile.life = 0;

          // Hit and knockback
          unit.life -= 1;
          unit.lastHitByPlayerId = projectile.playerId;          
          unit.knock = projectile.vel.clone();
          unit.knock.scale(0.8);
        }
      }

      // Hit mobs
      for (let [j, mob] of this.state.mobs.entries()) {
        if (this.spriteCollides(projectile.pos, projectileDelta, mob.pos, this.unitSpriteComps[j].sprite)) {
          projectile.life = 0;

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

  spriteCollides(projectilePos: Vect, projectileDelta: Vect, spritePos: Vect, sprite: Sprite) {
    let unitCenter = spritePos.clone();
    unitCenter.addScaled(sprite.spriteRect.center, 1);
    return unitCenter.distanceFromSegment(projectilePos, projectileDelta) < 10;
  }

  // Draw the state of our game onto a canvas.
  draw() {
    for (let [i, unit] of this.state.units.entries()) {
      let spriteComp: SpriteComp;
      if (this.unitSpriteComps.length <= i) {
        spriteComp = new SpriteComp(this.unitSprites[i]);
        this.unitSpriteComps.push(spriteComp);
        Node.createFromComp(this.scene, spriteComp);
      } else {
        spriteComp = this.unitSpriteComps[i];
      }

      // animate sprite color based on knock strength
      let knockLen = unit.knock.length;
      let redQ = knockLen / 50;
      spriteComp.color.g = 1 - redQ;
      spriteComp.color.b = 1 - redQ;

      let t = spriteComp.node!.transform as Transform2D;
      t.x = unit.pos.x;
      t.y = unit.pos.y;
    }

    // Remove leftover unit sprites
    let leftoverUnitSprites = this.unitSpriteComps.splice(this.state.units.length);
    for (let sprite of leftoverUnitSprites) {
      this.scene.removeNode(sprite.node!);
    }

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
        spriteComp = new SpriteComp(this.unitSprites[unit.playerId]);
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

    // Mobs
    for (let [i, mob] of this.state.mobs.entries()) {
      let spriteComp: SpriteComp;
      if (this.mobSpriteComps.length <= i) {
        spriteComp = new SpriteComp(this.mobSprites[mob.type] ?? this.mobSprites[EMobType.Dummy]);
        this.mobSpriteComps.push(spriteComp);
        Node.createFromComp(this.scene, spriteComp);
      } else {
        spriteComp = this.mobSpriteComps[i];
      }

      // Mob logic by type
      switch (mob.type) {
        case EMobType.Dummy:
          break;

        default:
          break;
      }

      let t = spriteComp.node!.transform as Transform2D;
      t.x = mob.pos.x;
      t.y = mob.pos.y;
    }

    // Remove leftover unit sprites
    let leftoverMobSprites = this.mobSpriteComps.splice(this.state.mobs.length);
    for (let sprite of leftoverMobSprites) {
      this.scene.removeNode(sprite.node!);
    }
  }
}