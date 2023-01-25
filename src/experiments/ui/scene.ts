import { Engine } from "../../engine/engine";
import { Align, NodeUI, TransformUI } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";

export class UIScene extends Scene {
  private nodeRootUI: NodeUI;
  circleBottomLeft: NodeUI;
  circleTopRight: NodeUI;

  constructor(engine: Engine) {
    super(engine);

    this.nodeRootUI = NodeUI.createFromComp(this, new UIRootComp());

    let tex = Texture.createFromUrl(engine, "ui/circle.png");

    this.circleBottomLeft = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.circleBottomLeft.transformUI.alignH = Align.Begin;
    this.circleBottomLeft.transformUI.alignV = Align.End;
    this.circleBottomLeft.transformUI.width = 128;
    this.circleBottomLeft.transformUI.height = 128;
    let circleBottomLeftSpr = new SpriteComp(tex);
    circleBottomLeftSpr.color = {r: 0.8, g: 0.8, b: 1, a: 1};
    this.circleBottomLeft.addComponent(circleBottomLeftSpr);

    this.circleTopRight = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.circleTopRight.transformUI.alignH = Align.End;
    this.circleTopRight.transformUI.alignV = Align.Begin;
    this.circleTopRight.transformUI.width = 128;
    this.circleTopRight.transformUI.height = 128;
    let circleTopRightSpr = new SpriteComp(tex);
    circleTopRightSpr.color = {r: 1, g: 0.8, b: 0.8, a: 1};
    this.circleTopRight.addComponent(circleTopRightSpr);
  }
}