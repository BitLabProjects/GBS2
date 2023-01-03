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

export class WebRTCScene extends Scene {
  constructor(engine: Engine) {
    super(engine);

    new FullScreenQuad(this);

    new RollbackWrapper(new SimpleGame(this), engine.canvas).start();
  }
}

class SimpleGame extends Game {
  public static timestep = 1000 / 60; // Our game runs at 60 FPS;

  private playerA_sprite: SpriteNode;
  private playerB_sprite: SpriteNode;

  private state: { playerA: { x: number, y: number }, playerB: { x: number, y: number } };

  private virtualJoystick: VirtualJoystick;
  touchControls: { [name: string]: TouchControl };

  constructor(private scene: Scene) {
    super();
    this.state = { playerA: { x: -100, y: 0 }, playerB: { x: +100, y: 0 } };

    this.playerA_sprite = new SpriteNode(this.scene, 1);
    this.playerB_sprite = new SpriteNode(this.scene, 2);
    this.playerA_sprite.onCreated();
    this.playerB_sprite.onCreated();

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
          (input.pressed.ArrowLeft ? -1 : 0) +
          (input.pressed.ArrowRight ? 1 : 0) + 
          (input.touchControls['joystick'].x),
        y:
          (input.pressed.ArrowDown ? -1 : 0) +
          (input.pressed.ArrowUp ? 1 : 0) +
          (input.touchControls['joystick'].y),
      };

      // Apply the velocity to the appropriate player.
      if (player.getID() == 0) {
        this.state.playerA.x += vel.x * 0.5;
        this.state.playerA.y += vel.y * 0.5;
      } else if (player.getID() == 1) {
        this.state.playerB.x += vel.x * 0.5;
        this.state.playerB.y += vel.y * 0.5;
      }
    }
  }

  // Normally, we have to implement a serialize / deserialize function
  // for our state. However, there is an autoserializer that can handle
  // simple states for us. We don't need to do anything here!
  // serialize() {}
  // deserialize(value) {}

  // Draw the state of our game onto a canvas.
  draw() {
    // Initialize our player positions.
    this.playerA_sprite.pos.x = this.state.playerA.x;
    this.playerA_sprite.pos.y = this.state.playerA.y;
    this.playerB_sprite.pos.x = this.state.playerB.x;
    this.playerB_sprite.pos.y = this.state.playerB.y;
  }
}