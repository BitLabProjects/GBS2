import { Engine } from "../../engine/engine";
import { Align, NodeUI, TransformUI } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";
import { Rect } from "../../utils/rect";

export class UIScene extends Scene {
  private nodeRootUI: NodeUI;
  circleBottomLeft: NodeUI;
  squareTopRight: NodeUI;
  rhombusTopRight: NodeUI;

  constructor(engine: Engine) {
    super(engine);

    this.nodeRootUI = NodeUI.createFromComp(this, new UIRootComp());

    let tex = Texture.createFromUrl(engine, "ui/circle.png", false);

    this.circleBottomLeft = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.circleBottomLeft.transformUI.alignH = Align.Begin;
    this.circleBottomLeft.transformUI.alignV = Align.End;
    this.circleBottomLeft.transformUI.width = 128;
    this.circleBottomLeft.transformUI.height = 128;
    let circleBottomLeftSpr = new SpriteComp(tex);
    circleBottomLeftSpr.color = {r: 0.8, g: 0.8, b: 1, a: 1};
    circleBottomLeftSpr.textureRect = new Rect(0, 0, 128, 128);
    this.circleBottomLeft.addComponent(circleBottomLeftSpr);

    this.squareTopRight = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.squareTopRight.transformUI.alignH = Align.End;
    this.squareTopRight.transformUI.alignV = Align.Begin;
    this.squareTopRight.transformUI.width = 128;
    this.squareTopRight.transformUI.height = 128;
    let squareTopRightSpr = new SpriteComp(tex);
    squareTopRightSpr.color = {r: 1, g: 0.8, b: 0.8, a: 1};
    squareTopRightSpr.textureRect = new Rect(128, 0, 128, 128);
    this.squareTopRight.addComponent(squareTopRightSpr);

    this.rhombusTopRight = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.rhombusTopRight.transformUI.alignH = Align.Middle;
    this.rhombusTopRight.transformUI.alignV = Align.Middle;
    this.rhombusTopRight.transformUI.width = 128;
    this.rhombusTopRight.transformUI.height = 128;
    let rhombusTopRightSpr = new SpriteComp(tex);
    rhombusTopRightSpr.color = {r: 0.8, g: 1, b: 0.8, a: 1};
    rhombusTopRightSpr.textureRect = new Rect(0, 128, 128, 128);
    this.rhombusTopRight.addComponent(rhombusTopRightSpr);
  }
}