import { Engine } from "../../../engine/engine";
import { Sprite } from "../../../engine/spritecomp";
import { Texture } from "../../../engine/texture";
import { Vect } from "../../../utils/vect";

export class Resources {
  public unitSprites: Sprite[];
  constructor(engine: Engine) {
    this.unitSprites = [];
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit1.png`), new Vect(4, 0)));
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit2.png`), new Vect(6, 0)));
  }
}