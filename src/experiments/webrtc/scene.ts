import { Engine } from "../../engine/engine";
import { Node, NodeUI, Transform2D } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";
import { DefaultInput } from "../../net/defaultinput";
import { Game } from "../../net/game";
import { RollbackWrapper } from "../../net/rollbackwrapper";
import { TouchControl, VirtualJoystick } from "../../net/touchcontrols";
import { NetplayPlayer, SerializedState } from "../../net/types";
import { clone } from "../../net/utils";
import { FullScreenQuad } from "../flocking/fullscreenquad";
import { JoystickComp } from "./joystickcomp";
//import { JoystickComp } from "./JoystickComp";

export class WebRTCSceneHost extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    Node.createFromComp(this, new FullScreenQuad());
    new RollbackWrapper(new SimpleGame(this), engine.canvas).start(roomName, false);
  }
}

export class WebRTCScene extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    Node.createFromComp(this, new FullScreenQuad());
    new RollbackWrapper(new SimpleGame(this), engine.canvas).start(roomName, true);
  }
}

class GameState {
  units: UnitState[];
  projectiles: ProjectileState[];
  deadUnits: DeadUnitState[];

  constructor() {
    this.units = [];
    this.projectiles = [];
    this.deadUnits = [];
  }
}

class UnitState {
  constructor(public x: number, public y: number,
    public xKnock: number, public yKnock: number,
    public xDir: number, public yDir: number,
    public life: number,
    public score: number,
    public coolDown: number) { }
}
class ProjectileState {
  constructor(public x: number, public y: number,
    public xVel: number, public yVel: number,
    public life: number,
    public playerId: number) { }
}
class DeadUnitState {
  constructor(public playerId: number, public x: number, public y: number, public fadeTime: number) { }
}

class SimpleGame extends Game {
  public static timestep = 1000 / 60; // Our game runs at 60 FPS;

  private unitSprites: SpriteComp[];
  private projectileSprites: SpriteComp[];
  private deadUnitSprites: SpriteComp[];
  private unitTextures: Texture[];
  private projectileTexture: Texture;

  private state: GameState;

  //private virtualJoystick1: JoystickComp;
  //private virtualJoystick2: JoystickComp;

  private nodeRootUI: NodeUI;

  private readonly maxLife: number = 10;

  constructor(private scene: Scene) {
    super();
    this.state = new GameState();
    this.state.units.push(new UnitState(-150, 0, 0, 0, 1, 0, this.maxLife, 0, 0));
    this.state.units.push(new UnitState(+150, 0, 0, 0, 1, 0, this.maxLife, 0, 0));
    this.unitSprites = [];
    this.projectileSprites = [];
    this.deadUnitSprites = [];

    this.unitTextures = [
      Texture.createFromUrl(this.scene.engine, `flocking/unit1.png`),
      Texture.createFromUrl(this.scene.engine, `flocking/unit2.png`)
    ]
    this.projectileTexture = Texture.createFromUrl(this.scene.engine, `webrtc/bullet1.png`)

    this.draw();

    //this.virtualJoystick1 = new VirtualJoystick();
    //this.virtualJoystick2 = new VirtualJoystick(true);
    //this.touchControls = { 'joystick1': this.virtualJoystick1, 'joystick2': this.virtualJoystick2 };

    this.nodeRootUI = NodeUI.createFromComp(scene, new UIRootComp());
    NodeUI.createFromComp(this.scene, new JoystickComp(), this.nodeRootUI);
  }

  serialize(): SerializedState {
    return clone(this.state);
  }

  /**
   * By default, use the auto deserializer.
   */
  deserialize(value: SerializedState): void {
    this.state = clone(value);
  }

  init(players: NetplayPlayer[]): void {
  }

  // The tick function takes a map of Player -> Input and
  // simulates the game forward. Think of it like making
  // a local multiplayer game with multiple controllers.
  tick(playerInputs: Map<NetplayPlayer, DefaultInput>) {
    let deltaTime = 1 / 60; //TODO

    for (const [player, input] of playerInputs.entries()) {
      // Generate player velocity from input keys.
      const vel = {
        x:
          (input.isPressed("ArrowLeft") ? -1 : 0) +
          (input.isPressed("ArrowRight") ? 1 : 0) +
          0, //(input.touchControls!.joystick1.x),
        y:
          (input.isPressed("ArrowDown") ? -1 : 0) +
          (input.isPressed("ArrowUp") ? 1 : 0) +
          0, //(input.touchControls!.joystick1.y),
      };


      // Apply the velocity to the appropriate player.
      let unitState = this.state.units[player.getID()];
      let velLen = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (velLen > 0) {
        unitState.xDir = vel.x / velLen;
        unitState.yDir = vel.y / velLen;
      }
      unitState.x += (vel.x * 30 + unitState.xKnock) * deltaTime;
      unitState.y += (vel.y * 30 + unitState.yKnock) * deltaTime;

      unitState.xKnock *= 0.85;
      unitState.yKnock *= 0.85;

      if (unitState.coolDown > 0) {
        unitState.coolDown -= deltaTime;
      } else {
        if (input.isPressed(" ") /*|| input.touchControls!.joystick2.x !== 0 || input.touchControls!.joystick2.y !== 0*/) {
          // Fire
          this.state.projectiles.push(new ProjectileState(unitState.x + unitState.xDir * 10,
            unitState.y + unitState.yDir * 10,
            unitState.xDir * 60, unitState.yDir * 60,
            60 * 3, player.getID()));
          unitState.coolDown = 0.5;
        }
      }
    }

    for (let [i, projectile] of this.state.projectiles.entries()) {
      projectile.x += projectile.xVel * deltaTime;
      projectile.y += projectile.yVel * deltaTime;
      projectile.life -= 1;

      for (let [j, unit] of this.state.units.entries()) {
        if (projectile.playerId === j) {
          continue;
        }
        let dx = projectile.x - unit.x;
        let dy = projectile.y - unit.y;
        if (dx * dx + dy * dy < 5 * 5) {
          projectile.life = 0;
          unit.xKnock = projectile.xVel * 0.8;
          unit.yKnock = projectile.yVel * 0.8;

          unit.life -= 1;
          if (unit.life <= 0) {
            // Add a dead unit
            this.state.deadUnits.push(new DeadUnitState(j, unit.x, unit.y, 100));
            // Give score to shooting player
            this.state.units[projectile.playerId].score += 1;
            // Reset unit to random location
            unit.x = 0; // TODO Random location inside map
            unit.y = 0;
            unit.life = this.maxLife;
            unit.xKnock = 0;
            unit.yKnock = 0;
            break;
          }
        }
      }

      if (projectile.life <= 0) {
        this.state.projectiles.splice(i, 1);
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

  // Draw the state of our game onto a canvas.
  draw() {
    for (let [i, unit] of this.state.units.entries()) {
      let spriteComp: SpriteComp;
      if (this.unitSprites.length <= i) {
        spriteComp = new SpriteComp(this.unitTextures[i]);
        this.unitSprites.push(spriteComp);
        Node.createFromComp(this.scene, spriteComp);
      } else {
        spriteComp = this.unitSprites[i];
      }

      // animate sprite color based on knock strength
      let knockLen = Math.sqrt(unit.xKnock * unit.xKnock + unit.yKnock * unit.yKnock);
      let redQ = knockLen / 50;
      spriteComp.color.g = 1 - redQ;
      spriteComp.color.b = 1 - redQ;

      let t = spriteComp.node!.transform as Transform2D;
      t.x = unit.x;
      t.y = unit.y;
    }

    // Remove leftover unit sprites
    let leftoverUnitSprites = this.unitSprites.splice(this.state.units.length);
    for (let sprite of leftoverUnitSprites) {
      this.scene.removeNode(sprite.node!);
    }

    // TODO Extract sync logic and unify with units above
    for (let [i, projectile] of this.state.projectiles.entries()) {
      let spriteComp: SpriteComp;
      if (this.projectileSprites.length <= i) {
        spriteComp = new SpriteComp(this.projectileTexture);
        this.projectileSprites.push(spriteComp);
        Node.createFromComp(this.scene, spriteComp);
      } else {
        spriteComp = this.projectileSprites[i];
      }
      let t = spriteComp.node!.transform as Transform2D;
      t.x = projectile.x;
      t.y = projectile.y;
    }

    // Remove leftover projectile sprites
    let leftoverProjectileSprites = this.projectileSprites.splice(this.state.projectiles.length);
    for (let sprite of leftoverProjectileSprites) {
      this.scene.removeNode(sprite.node!);
    }

    for (let [i, unit] of this.state.deadUnits.entries()) {
      let spriteComp: SpriteComp;
      if (this.deadUnitSprites.length <= i) {
        spriteComp = new SpriteComp(this.unitTextures[unit.playerId]);
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
  }
}