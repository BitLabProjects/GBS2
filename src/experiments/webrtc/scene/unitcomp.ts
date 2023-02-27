import { Component, Transform2D } from "../../../engine/node";
import { Sprite, SpriteComp } from "../../../engine/spritecomp";
import { UnitState } from "../state/gamestate";
import { Resources } from "./resources";

export class UnitComp extends Component {
  private spriteComp: SpriteComp | undefined;

  get sprite(): Sprite | undefined {
    return this.spriteComp?.sprite;
  }

  update(unit: UnitState, resources: Resources) {
    if (!this.spriteComp) {
      //this.spriteComp = new SpriteComp(resources.unitSprites[unit.playerId]);
      this.spriteComp = new SpriteComp(resources.unitSprites[2]);
      this.node!.addComponent(this.spriteComp);
    }

    // animate sprite color based on knock strength
    let knockLen = unit.knock.length;
    let redQ = knockLen / 50;
    this.spriteComp.color.g = 1 - redQ;
    this.spriteComp.color.b = 1 - redQ;

    let t = this.node!.transform as Transform2D;
    t.x = unit.pos.x;
    t.y = unit.pos.y;
  }
}