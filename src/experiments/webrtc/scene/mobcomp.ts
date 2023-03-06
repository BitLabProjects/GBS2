import { Component, Transform2D } from "../../../engine/node";
import { Sprite, SpriteComp } from "../../../engine/spritecomp";
import { EMobType, MobState } from "../state/gamestate";
import { Resources } from "./resources";

export class MobComp extends Component {
  private spriteComp: SpriteComp | undefined;

  get sprite(): Sprite | undefined {
    return this.spriteComp?.sprite;
  }

  update(mob: MobState, resources: Resources) {
    if (!this.spriteComp) {
      this.spriteComp = new SpriteComp(resources.mobSprites[mob.type][0]);
      this.node!.addComponent(this.spriteComp);
    }

    switch (mob.type) {
      case EMobType.Dummy: {
        //hitTime goes from zero to infinity, the divider must go from 1 to infinity
        let divider = 1 + mob.hitTime * 2;
        // Add 90 degrees to the sin to have an immediate feedback
        let idxFrame = 1 + Math.round(Math.sin(mob.hitTime * 0.1 + Math.PI * 0.5) / divider);
        this.spriteComp.sprite = resources.mobSprites[mob.type][idxFrame];
      } break;

      case EMobType.Zombie: {
        this.spriteComp.sprite = resources.mobSprites[mob.type][0];
      } break;
    }

    let redQ = Math.min(1, mob.hitTime / 0.3);
    this.spriteComp.color.g = redQ;
    this.spriteComp.color.b = redQ;

    let t = this.node!.transform as Transform2D;
    t.x = mob.pos.x;
    t.y = mob.pos.y + mob.pos.z;

    this.spriteComp.depth = t.y;
  }
}