import { IInputHandler, TouchEventArgs } from "../../engine/engine";
import { Align, Component, NodeUI, TransformUI } from "../../engine/node";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { TouchDragHandler } from "../../engine/touchdraghandler";
import { Rect } from "../../utils/rect";
import { Vect } from "../../utils/vect";

export class JoystickComp extends Component implements IInputHandler {
  joystickCircle: NodeUI;
  touchDragHandler: TouchDragHandler;

  constructor() {
    super();
    this.touchDragHandler = new TouchDragHandler(
      (point: Vect) => (this.node! as NodeUI).transformUI.bounds.isInside(point),
      (point: Vect, delta: Vect) => {
        this.joystickCircle.transformUI.renderTransform = delta.clone();
        this.joystickCircle.transformUI.renderTransform.clampLength(40);
      });
  }

  onCreate() {
    let tex = Texture.createFromUrl(this.node!.scene.engine, "ui/circle.png", false);

    this.joystickCircle = new NodeUI(this.node!.scene, TransformUI.default(), this.node! as NodeUI);
    this.joystickCircle.transformUI.alignH = Align.Begin;
    this.joystickCircle.transformUI.alignV = Align.End;
    this.joystickCircle.transformUI.width = 80;
    this.joystickCircle.transformUI.height = 80;
    this.joystickCircle.transformUI.renderTransform = new Vect(20, -20);
    let circleBottomLeftSpr = new SpriteComp(tex);
    circleBottomLeftSpr.color = { r: 0.8, g: 0.8, b: 1, a: 1 };
    circleBottomLeftSpr.textureRect = new Rect(0, 0, 128, 128);
    this.joystickCircle.addComponent(circleBottomLeftSpr);
  }

  onUpdate() {
    if (!this.touchDragHandler.isDragging) {
      this.joystickCircle.transformUI.renderTransform.scale(0.9);
    }
  }

  onTouchUpdate(tea: TouchEventArgs): void {
    this.touchDragHandler.onTouchUpdate(tea);
  }
}