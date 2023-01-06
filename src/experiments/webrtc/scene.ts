import { Engine } from "../../engine/engine";
import { Scene } from "../../engine/scene";
import { SpriteNode } from "../../engine/spritenode";
import { DefaultInput } from "../../net/defaultinput";
import { Game } from "../../net/game";
import { RollbackWrapper } from "../../net/rollbackwrapper";
import { TouchControl, VirtualJoystick } from "../../net/touchcontrols";
import { NetplayPlayer, SerializedState } from "../../net/types";
import { clone } from "../../net/utils";
import { FullScreenQuad } from "../flocking/fullscreenquad";

export class WebRTCSceneHost extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    new FullScreenQuad(this);

    new RollbackWrapper(new SimpleGame(this), engine.canvas).start(roomName, false);
  }
}

export class WebRTCScene extends Scene {
  constructor(engine: Engine, roomName: string) {
    super(engine);

    new FullScreenQuad(this);

    new RollbackWrapper(new SimpleGame(this), engine.canvas).start(roomName, true);
  }
}

class GameState {
  units: UnitState[];
  projectiles: ProjectileState[];

  constructor() {
    this.units = [];
    this.projectiles = [];
  }
}

class UnitState {
  constructor(public x: number, public y: number) { }
}
class ProjectileState {
  constructor(public x: number, public y: number, 
              public xVel: number, public yVel: number,
              public life: number) { }
}

class SimpleGame extends Game {
  public static timestep = 1000 / 60; // Our game runs at 60 FPS;

  private unitSprites: SpriteNode[];
  private projectileSprites: SpriteNode[];

  private state: GameState;

  private virtualJoystick: VirtualJoystick;
  touchControls: { [name: string]: TouchControl };

  constructor(private scene: Scene) {
    super();
    this.state = new GameState();
    this.state.units.push(new UnitState(-150, 0));
    this.state.units.push(new UnitState(+150, 0));
    this.unitSprites = [];
    this.projectileSprites = [];

    this.draw();

    this.virtualJoystick = new VirtualJoystick();
    this.touchControls = { 'joystick': this.virtualJoystick };
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
    for (const [player, input] of playerInputs.entries()) {
      // Generate player velocity from input keys.
      const vel = {
        x:
          (input.isPressed("ArrowLeft") ? -1 : 0) +
          (input.isPressed("ArrowRight") ? 1 : 0) +
          (input.touchControls!.joystick.x),
        y:
          (input.isPressed("ArrowDown") ? -1 : 0) +
          (input.isPressed("ArrowUp") ? 1 : 0) +
          (input.touchControls!.joystick.y),
      };

      // Apply the velocity to the appropriate player.
      let unitState = this.state.units[player.getID()];
      unitState.x += vel.x * 0.5;
      unitState.y += vel.y * 0.5;

      if (input.isJustPressed(" ")) {
        // Fire
        this.state.projectiles.push(new ProjectileState(unitState.x + 10, unitState.y, 60, 0, 60 * 3));
      }
    }

    let deltaTime = 1 / 60; //TODO 
    for (let [i, projectile] of this.state.projectiles.entries()) {
      projectile.x += projectile.xVel * deltaTime;
      projectile.y += projectile.yVel * deltaTime;
      projectile.life -= 1;
      
      if (projectile.life <= 0) {
        this.state.projectiles.splice(i, 1);
      } else { 
        // TODO Collide projectile with units
      }
    }
  }

  // Draw the state of our game onto a canvas.
  draw() {
    for (let [i, unit] of this.state.units.entries()) {
      let spriteNode: SpriteNode;
      if (this.unitSprites.length <= i) {
        spriteNode = new SpriteNode(this.scene, `flocking/unit${i+1}.png`);
        this.unitSprites.push(spriteNode);
        spriteNode.onCreated();
      } else {
        spriteNode = this.unitSprites[i];
      }

      spriteNode.pos.x = unit.x;
      spriteNode.pos.y = unit.y;
    }

    // TODO Extract sync logic and unify with units above
    for (let [i, projectile] of this.state.projectiles.entries()) {
      let spriteNode: SpriteNode;
      if (this.projectileSprites.length <= i) {
        spriteNode = new SpriteNode(this.scene, `webrtc/bullet1.png`);
        this.projectileSprites.push(spriteNode);
        spriteNode.onCreated();
      } else {
        spriteNode = this.projectileSprites[i];
      }
      spriteNode.pos.x = projectile.x;
      spriteNode.pos.y = projectile.y;
    }

    // Remove leftover sprites from projectileSprites and scene
    let leftoverSprites = this.projectileSprites.splice(this.state.projectiles.length);
    for(let projectile of leftoverSprites) {
      this.scene.removeNode(projectile);
    }
  }
}