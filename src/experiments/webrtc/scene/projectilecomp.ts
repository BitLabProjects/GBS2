import { Component, Transform2D } from "../../../engine/node";
import { Sprite, SpriteComp } from "../../../engine/spritecomp";
import { ProjectileState, UnitState } from "../state/gamestate";
import { Resources } from "./resources";

export class ProjectileComp extends Component {
  private spriteComp: SpriteComp | undefined;
  private frame: number = 0;

  get sprite(): Sprite | undefined {
    return this.spriteComp?.sprite;
  }

  update(projectile: ProjectileState, resources: Resources) {
    if (!this.spriteComp) {
      this.spriteComp = new SpriteComp(resources.projectileSprites[projectile.type][projectile.type]);
      this.node!.addComponent(this.spriteComp);
    }

    let sprites = resources.projectileSprites[projectile.type];
    this.spriteComp.sprite = sprites[Math.floor(this.frame) % sprites.length];
    this.frame += 0.1;

    let t = this.node!.transform as Transform2D;
    t.x = projectile.pos.x;
    t.y = projectile.pos.y + projectile.pos.z;
    t.angle = Math.atan2(projectile.vel.y, projectile.vel.x);

    this.spriteComp.depth = t.y;
  }
}