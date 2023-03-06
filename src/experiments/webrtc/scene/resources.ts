import { Engine } from "../../../engine/engine";
import { Sprite } from "../../../engine/spritecomp";
import { Texture } from "../../../engine/texture";
import { Rect } from "../../../utils/rect";
import { Vect2 } from "../../../utils/vect2";
import { EMobType, EProjectileType } from "../state/gamestate";

export class Resources {
  public unitSprites: Sprite[];
  public man1Idle: Sprite;
  public man1Walk: Sprite[];
  public mobSprites: Sprite[][];
  public projectileSprites: Sprite[][];

  constructor(engine: Engine) {
    this.unitSprites = [];
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit1.png`), new Rect(0, 0, 11, 12), new Vect2(4, 0)));
    this.unitSprites.push(new Sprite(Texture.createFromUrl(engine, `flocking/unit2.png`), new Rect(0, 0, 13, 14), new Vect2(6, 0)));
    
    let man1Tex = Texture.createFromUrl(engine, `webrtc/art/man1.png`);
    this.man1Idle = new Sprite(man1Tex, new Rect(0, 0, 32, 32), new Vect2(16, 0));
    this.man1Walk = Resources.loadSprites(engine, man1Tex, 128, 32, 4, 1, new Vect2(16, 0), 32);

    this.mobSprites = [];
    this.mobSprites[EMobType.Dummy] = Resources.loadSprites(engine, `webrtc/dummy.png`, 27, 12, 3, 1, new Vect2(5, 0));
    this.mobSprites[EMobType.Zombie] = Resources.loadSprites(engine, `webrtc/art/zombie.png`, 32, 32, 1, 1, new Vect2(16, 0));
    this.mobSprites[EMobType.ZombieSpawner] = Resources.loadSprites(engine, `webrtc/art/spawner.png`, 32, 32, 1, 1, new Vect2(16, 16));
    let furnitureTex = Texture.createFromUrl(engine, `webrtc/art/furniture.png`);
    this.mobSprites[EMobType.ShopPortal] = [new Sprite(furnitureTex, new Rect(40, 0, 26, 43), new Vect2(13, 4))];
    this.mobSprites[EMobType.ShopBuyPistol] = [new Sprite(furnitureTex, new Rect(0, 0, 20, 22), new Vect2(10, 6))];
    this.mobSprites[EMobType.ShopBuyGrenade] = [new Sprite(furnitureTex, new Rect(20, 0, 20, 22), new Vect2(10, 6))];
    this.mobSprites[EMobType.Tree] = [new Sprite(furnitureTex, new Rect(0, 128 - 38, 35, 38), new Vect2(18, 4))];

    this.projectileSprites = [];
    let bulletTex = Texture.createFromUrl(engine, `webrtc/art/bullet.png`);
    this.projectileSprites[EProjectileType.Pistol] = [new Sprite(bulletTex, new Rect(7, 2, 7, 2), new Vect2(7, 1))];
    this.projectileSprites[EProjectileType.Grenade] = [new Sprite(bulletTex, new Rect(0, 0, 6, 6), new Vect2(3, 3)),
                                                       new Sprite(bulletTex, new Rect(0, 6, 6, 6), new Vect2(3, 3))];
  }

  static loadSprites(engine: Engine, uriOrTex: string | Texture, 
                     width: number, height: number,
                     nx: number, ny: number,
                     offset: Vect2,
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