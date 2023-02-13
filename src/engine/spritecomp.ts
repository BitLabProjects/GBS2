import { Color } from "../utils/color";
import { ObjUtils, TypeDescriptor } from "../utils/objutils";
import { Rect } from "../utils/rect";
import { Vect } from "../utils/vect";
import { Component } from "./node";
import { Texture } from "./texture";

export class Sprite {
  _texture: Texture;
  textureRect: Rect;
  offset: Vect;

  constructor(texture: Texture, textureRect: Rect, offset?: Vect) {
    this._texture = texture;
    this.textureRect = textureRect;
    this.offset = offset ?? new Vect(0, 0);
  }

  clone(): Sprite {
    return new Sprite(this._texture, this.textureRect.clone(), this.offset.clone());
  }

  // TODO Allow changing texture at runtime by signalling a change to the SpriteSystem inside the texture setter
  public get texture(): Texture { return this._texture };

  public get spriteRect(): Rect {
    let offX = 4;
    let offY = 0;
    return new Rect(-offX, -offY, this.textureRect.width, this.textureRect.height);
  }
}

export class SpriteComp extends Component {
  color: Color;
  sprite: Sprite;

  constructor(sprite: Sprite, color?: Color) {
    super();
    this.sprite = sprite;
    this.color = color ?? new Color(1, 1, 1, 1);
  }

  clone(): SpriteComp {
    return new SpriteComp(this.sprite, this.color.clone());
  }
}