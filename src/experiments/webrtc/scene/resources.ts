import { Engine } from "../../../engine/engine";
import { Sprite } from "../../../engine/spritecomp";
import { Texture } from "../../../engine/texture";
import { Rect } from "../../../utils/rect";
import { Vect } from "../../../utils/vect";
import { EMobType } from "../state/gamestate";

export class Resources {
  public unitSprites: Sprite[];
  public man1Idle: Sprite;
  public man1Walk: Sprite[];
  public mobSprites: Sprite[][];

  constructor(engine: Engine) {
    this.unitSprites = [];
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit1.png`), new Rect(0, 0, 11, 12), new Vect(4, 0)));
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit2.png`), new Rect(0, 0, 13, 14), new Vect(6, 0)));
    
    let man1Tex = Texture.createFromUrl(engine, `webrtc/art/man1.png`);
    this.man1Idle = new Sprite(man1Tex, new Rect(0, 0, 32, 32), new Vect(16, 0));
    this.man1Walk = Resources.loadSprites(engine, man1Tex, 128, 32, 4, 1, new Vect(16, 0), 32);

    this.mobSprites = [];
    this.mobSprites[EMobType.Dummy] = Resources.loadSprites(engine, `webrtc/dummy.png`, 27, 12, 3, 1, new Vect(5, 0));
    this.mobSprites[EMobType.Zombie] = Resources.loadSprites(engine, `webrtc/art/zombie.png`, 32, 32, 1, 1, new Vect(16, 0));
  }

  static loadSprites(engine: Engine, uriOrTex: string | Texture, 
                     width: number, height: number,
                     nx: number, ny: number,
                     offset: Vect,
                     texOffX: number = 0): Sprite[] {
    let result: Sprite[] = [];
    let spriteW = Math.floor(width / nx);
    let spriteH = Math.floor(height / ny);
    if (typeof uriOrTex === "string") {
      uriOrTex = Texture.createFromUrl(engine, uriOrTex);
    }
    for(let y = 0; y < ny; y++) {
      for(let x = 0; x < nx; x++) {
        result[y * nx + x] = new Sprite(uriOrTex, new Rect(texOffX + spriteW * x, spriteH * y, spriteW, spriteH), offset.clone());
      }
    }
    return result;
  }
}