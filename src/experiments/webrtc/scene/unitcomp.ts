import { Component, Transform2D } from "../../../engine/node";
import { Sprite, SpriteComp } from "../../../engine/spritecomp";
import { UnitState } from "../state/gamestate";
import { Resources } from "./resources";

export class UnitComp extends Component {
  private spriteComp: SpriteComp | undefined;
  private walkFrame: number = 0;

  get sprite(): Sprite | undefined {
    return this.spriteComp?.sprite;
  }

  update(unit: UnitState, resources: Resources) {
    if (!this.spriteComp) {
      //this.spriteComp = new SpriteComp(resources.unitSprites[unit.playerId]);
      this.spriteComp = new SpriteComp(resources.man1Idle);
      this.node!.addComponent(this.spriteComp);
    }

    if (unit.dir.length > 0.1) {
      this.spriteComp.sprite = resources.man1Walk[Math.floor(this.walkFrame) % resources.man1Walk.length];
      this.walkFrame += 0.1;
    } else {
      this.spriteComp.sprite = resources.man1Idle;
    }

    // animate sprite color based on knock strength
    let knockLen = unit.knock.length;
    let redQ = knockLen / 50;
    this.spriteComp.color.g = 1 - redQ;
    this.spriteComp.color.b = 1 - redQ;

    let t = this.node!.transform as Transform2D;
    t.x = unit.pos.x;
    t.y = unit.pos.y + unit.pos.z;
    t.scaleX = unit.dir.x >= 0 ? 1 : -1;
    
    this.spriteComp.depth = t.y;
  }
}