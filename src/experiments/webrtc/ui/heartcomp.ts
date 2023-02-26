import { Align, Component, Margin, NodeUI } from "../../../engine/node";
import { Sprite, SpriteComp } from "../../../engine/spritecomp";
import { Texture } from "../../../engine/texture";
import { UITextComp } from "../../../engine/uitextcomp";
import { Color } from "../../../utils/color";
import { Rect } from "../../../utils/rect";

export class HeartComp extends Component {
  private heartSprite: Sprite;
  private currHeartComps: NodeUI[];
  private textComp: UITextComp;

  onCreate() {
    let tex = Texture.createFromUrl(this.node!.scene.engine, "webrtc/ui.png", false);
    this.heartSprite = new Sprite(tex, new Rect(0, 128, 26, 26));
    this.currHeartComps = [];
    this.textComp = new UITextComp("")
    this.node!.addComponent(this.textComp);
  }

  onUpdate() {
  }

  onUpdateLife(life: number, kills: number) {
    life = Math.round(life);
    this.textComp.text = kills.toString();

    while (this.currHeartComps.length < life) {
      // Add hearts
      let node = NodeUI.createFromComp(
        this.scene, 
        new SpriteComp(this.heartSprite, new Color(1.0, 1.0, 1.0, 1.0)),
        this.node! as NodeUI);
      node.transformUI.margin = new Margin(this.currHeartComps.length * (16 + 2) + 35, 0, 0, 0);
      node.transformUI.alignH = Align.Begin;
      node.transformUI.alignV = Align.Middle;
      node.transformUI.width = 16;
      node.transformUI.height = 16;
      this.currHeartComps.push(node);
    }
    while (this.currHeartComps.length > life) {
      // Remove hearts
      let node = this.currHeartComps.pop()!;
      node.scene.removeNode(node);
    }
  }
}