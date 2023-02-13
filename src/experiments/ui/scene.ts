import { Engine, TouchEventArgs, TouchState } from "../../engine/engine";
import { Align, Component, NodeUI, TransformUI } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { Sprite, SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import { UIRootComp } from "../../engine/uirootcomp";
import { Color } from "../../utils/color";
import { Rect } from "../../utils/rect";
import { Vect } from "../../utils/vect";

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
    let circleBottomLeftSpr = new SpriteComp(new Sprite(tex));
    circleBottomLeftSpr.color = new Color(0.8, 0.8, 1, 1);
    circleBottomLeftSpr.sprite.textureRect = new Rect(0, 0, 128, 128);
    this.circleBottomLeft.addComponent(circleBottomLeftSpr);
    this.circleBottomLeft.addComponent(new DraggableComponent());

    this.squareTopRight = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.squareTopRight.transformUI.alignH = Align.End;
    this.squareTopRight.transformUI.alignV = Align.Begin;
    this.squareTopRight.transformUI.width = 128;
    this.squareTopRight.transformUI.height = 128;
    let squareTopRightSpr = new SpriteComp(new Sprite(tex));
    squareTopRightSpr.color = new Color(1, 0.8, 0.8, 1);
    squareTopRightSpr.sprite.textureRect = new Rect(128, 0, 128, 128);
    this.squareTopRight.addComponent(squareTopRightSpr);
    this.squareTopRight.addComponent(new DraggableComponent());

    this.rhombusTopRight = new NodeUI(this, TransformUI.default(), this.nodeRootUI as NodeUI);
    this.rhombusTopRight.transformUI.alignH = Align.Middle;
    this.rhombusTopRight.transformUI.alignV = Align.Middle;
    this.rhombusTopRight.transformUI.width = 128;
    this.rhombusTopRight.transformUI.height = 128;
    let rhombusTopRightSpr = new SpriteComp(new Sprite(tex));
    rhombusTopRightSpr.color = new Color(0.8, 1, 0.8, 1);
    rhombusTopRightSpr.sprite.textureRect = new Rect(0, 128, 128, 128);
    this.rhombusTopRight.addComponent(rhombusTopRightSpr);
    this.rhombusTopRight.addComponent(new DraggableComponent());
  }
}

export class DraggableComponent extends Component {
  private touchId: number = -1;
  private downPos: Vect;
  private startRenderTransform: Vect;

  onTouchUpdate(tea: TouchEventArgs) {
    let nodeui = this.node! as NodeUI;

    if (this.touchId >= 0) {
      // We are dragging
      let touch = tea.getTouchById(this.touchId);
      if (touch) {
        switch (touch.state) {
          case TouchState.Release:
            // The touch was released
            this.touchId = -1;
            break;
          case TouchState.Update:
            nodeui.transformUI.renderTransform.x = this.startRenderTransform.x + touch.pos.x - this.downPos.x;
            nodeui.transformUI.renderTransform.y = this.startRenderTransform.y + touch.pos.y - this.downPos.y;
            break;
        }
      } else {
        // Should never arrive here, TODO assert
        this.touchId = -1;
      }
    } else {
      // Search for a touch starting now that's inside our bounds
      for(let touch of tea.touches) {
        if (touch.state === TouchState.Press && nodeui.transformUI.bounds.isInside(touch.pos)) {
          this.touchId = touch.id;
          this.downPos = touch.pos.clone();
          this.startRenderTransform = nodeui.transformUI.renderTransform.clone();
        }
      }
    }
  }
}