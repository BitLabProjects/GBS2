import { IInputHandler, KeyEventArgs, TouchEventArgs } from "../../engine/engine";
import { Align, Component, Margin, NodeUI, TransformUI } from "../../engine/node";
import { Sprite, SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { TouchDragHandler } from "../../engine/touchdraghandler";
import { Color } from "../../utils/color";
import { Rect } from "../../utils/rect";
import { Vect } from "../../utils/vect";

export enum EJoystickType {
  Movement,
  Shoot,
  Grab,
}

export class JoystickComp extends Component implements IInputHandler {
  joystickCircle: NodeUI;
  touchDragHandler: TouchDragHandler;
  dx: number = 0;
  dy: number = 0;

  constructor(private readonly type: EJoystickType) {
    super();
    this.touchDragHandler = new TouchDragHandler(
      (point: Vect) => this.joystickCircle.transformUI.bounds.isInside(point),
      (point: Vect, delta: Vect) => {
        let rtVect = this.joystickCircle.transformUI.renderTransform;
        rtVect.copy(delta);
        rtVect.clampLength(this.type === EJoystickType.Grab ? 20 : 40);
        let rtVectLen = rtVect.length;
        if (rtVectLen > 0) {
          this.dx = +rtVect.x / rtVectLen;
          this.dy = -rtVect.y / rtVectLen;
        } else {
          this.dx = 0;
          this.dy = 0;
        }
      });
  }

  onCreate() {
    let tex = Texture.createFromUrl(this.node!.scene.engine, "webrtc/ui.png", false);

    this.joystickCircle = new NodeUI(this.node!.scene, TransformUI.default(), this.node! as NodeUI);
    this.joystickCircle.transformUI.alignH = this.type === EJoystickType.Movement ? Align.Begin : Align.End;
    this.joystickCircle.transformUI.alignV = Align.End;
    //this.joystickCircle.transformUI.renderTransform = new Vect(20, -20);
    if (this.type === EJoystickType.Grab) {
      this.joystickCircle.transformUI.width = 40;
      this.joystickCircle.transformUI.height = 40;
      this.joystickCircle.transformUI.margin = new Margin(0, 0, 50, 140);
    } else {
      this.joystickCircle.transformUI.width = 80;
      this.joystickCircle.transformUI.height = 80;
      this.joystickCircle.transformUI.margin = Margin.uniform(50);
    }
    let circleBottomLeftSpr = new SpriteComp(new Sprite(tex, new Rect(0, 0, 128, 128)), new Color(0.4, 0.4, 0.4, 0.4));
    this.joystickCircle.addComponent(circleBottomLeftSpr);
  }

  get isTouching(): boolean {
    return this.touchDragHandler.isDragging;
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