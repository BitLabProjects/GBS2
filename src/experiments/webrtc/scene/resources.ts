import { Engine } from "../../../engine/engine";
import { Sprite } from "../../../engine/spritecomp";
import { Texture } from "../../../engine/texture";
import { Rect } from "../../../utils/rect";
import { Vect } from "../../../utils/vect";
import { EMobType } from "../state/gamestate";

export class Resources {
  public unitSprites: Sprite[];
  public mobSprites: Sprite[][];

  constructor(engine: Engine) {
    this.unitSprites = [];
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit1.png`), new Rect(0, 0, 11, 12), new Vect(4, 0)));
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit2.png`), new Rect(0, 0, 13, 14), new Vect(6, 0)));

    this.mobSprites = [];
    this.mobSprites[EMobType.Dummy] = Resources.loadSprites(engine, `webrtc/dummy.png`, 27, 12, 3, 1, new Vect(5, 0));
  }

  static loadSprites(engine: Engine, uri: string, 
                     width: number, height: number,
                     nx: number, ny: number,
                     offset: Vect): Sprite[] {
    let result: Sprite[] = [];
    let spriteW = Math.floor(width / nx);
    let spriteH = Math.floor(height / ny);
    let tex = Texture.createFromUrl(engine, uri);
    for(let y = 0; y < ny; y++) {
      for(let x = 0; x < nx; x++) {
        result[y * nx + x] = new Sprite(tex, new Rect(spriteW * x, spriteH * y, spriteW, spriteH), offset.clone());
      }
    }
    return result;
  }
}