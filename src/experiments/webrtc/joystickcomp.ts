import { IInputHandler, KeyEventArgs, TouchEventArgs } from "../../engine/engine";
import { Align, Component, Margin, NodeUI, TransformUI } from "../../engine/node";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { TouchDragHandler } from "../../engine/touchdraghandler";
import { Rect } from "../../utils/rect";
import { Vect } from "../../utils/vect";

export class JoystickComp extends Component implements IInputHandler {
  joystickCircle: NodeUI;
  touchDragHandler: TouchDragHandler;
  dx: number = 0;
  dy: number = 0;

  constructor(private readonly isLeft: boolean) {
    super();
    this.touchDragHandler = new TouchDragHandler(
      (point: Vect) => this.joystickCircle.transformUI.bounds.isInside(point),
      (point: Vect, delta: Vect) => {
        delta = delta.clone();
        delta.clampLength(40);
        this.joystickCircle.transformUI.renderTransform = delta;
        this.dx = +delta.x / delta.length;
        this.dy = -delta.y / delta.length;
      });
  }

  onCreate() {
    let tex = Texture.createFromUrl(this.node!.scene.engine, "webrtc/ui.png", false);

    this.joystickCircle = new NodeUI(this.node!.scene, TransformUI.default(), this.node! as NodeUI);
    this.joystickCircle.transformUI.alignH = this.isLeft ? Align.Begin : Align.End;
    this.joystickCircle.transformUI.alignV = Align.End;
    this.joystickCircle.transformUI.width = 80;
    this.joystickCircle.transformUI.height = 80;
    //this.joystickCircle.transformUI.renderTransform = new Vect(20, -20);
    this.joystickCircle.transformUI.margin = Margin.uniform(50);
    let circleBottomLeftSpr = new SpriteComp(tex);
    circleBottomLeftSpr.color = { r: 0.4, g: 0.4, b: 0.4, a: 0.4 };
    circleBottomLeftSpr.textureRect = new Rect(0, 0, 128, 128);
    this.joystickCircle.addComponent(circleBottomLeftSpr);
  }

  onUpdate() {
    if (!this.touchDragHandler.isDragging) {
      this.joystickCircle.transformUI.renderTransform.scale(0.9);
      this.dx = 0;
      this.dy = 0;
    }
  }

  onTouchUpdate(tea: TouchEventArgs): void {
    this.touchDragHandler.onTouchUpdate(tea);
  }

  onKeyUpdate(kea: KeyEventArgs): void {
    //
  }
}