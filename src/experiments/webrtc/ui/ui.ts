import { Align, Margin, NodeUI } from "../../../engine/node";
import { Scene } from "../../../engine/scene";
import { Texture } from "../../../engine/texture";
import { UIRootComp } from "../../../engine/uirootcomp";
import { EJoystickType, JoystickComp } from "./joystickcomp";
import { HeartComp } from "./heartcomp";
import { DefaultInput } from "../scene";
import { UnitState } from "../state/gamestate";

export class UI {
  private nodeRootUI: NodeUI;
  private joystickCompLeft: JoystickComp;
  private joystickCompRight: JoystickComp;
  private joystickCompGrab: JoystickComp;
  private heartComp: HeartComp;

  constructor(private scene: Scene) {
    // Show touch controls only on mobile and request fullscreen
    let uiRootComp = new UIRootComp();
    uiRootComp.uiTexture = Texture.createFromUrl(this.scene.engine, "webrtc/ui.png", false);
    this.nodeRootUI = NodeUI.createFromComp(this.scene, uiRootComp);
    this.heartComp = new HeartComp();
    let nodeUILifeContainer = NodeUI.createFromComp(this.scene, this.heartComp, this.nodeRootUI);
    nodeUILifeContainer.transformUI.alignH = Align.Middle;
    nodeUILifeContainer.transformUI.alignV = Align.Begin;
    nodeUILifeContainer.transformUI.width = 18 * 10;
    nodeUILifeContainer.transformUI.height = 30;
    nodeUILifeContainer.transformUI.margin = Margin.uniform(5);

    if (this.scene.engine.isMobile) {
      this.joystickCompLeft = new JoystickComp(EJoystickType.Movement);
      NodeUI.createFromComp(this.scene, this.joystickCompLeft, this.nodeRootUI);

      this.joystickCompRight = new JoystickComp(EJoystickType.Shoot);
      NodeUI.createFromComp(this.scene, this.joystickCompRight, this.nodeRootUI);

      this.joystickCompGrab = new JoystickComp(EJoystickType.Grab);
      NodeUI.createFromComp(this.scene, this.joystickCompGrab, this.nodeRootUI);
    }
  }

  get isJoystickGrabPressed() {
    return this.joystickCompGrab?.isTouching;
  }

  fillInput(input: DefaultInput) {
    input.joystick1.set(this.joystickCompLeft?.dx ?? 0, this.joystickCompLeft?.dy ?? 0);
    input.joystick2.set(this.joystickCompRight?.dx ?? 0, this.joystickCompRight?.dy ?? 0);
    input.joystick3.set(this.joystickCompGrab?.dx ?? 0, this.joystickCompGrab?.dy ?? 0);
  }

  updateUI(playerUnit: UnitState) {
    this.heartComp.onUpdateLife(playerUnit.life, playerUnit.score);
  }
}