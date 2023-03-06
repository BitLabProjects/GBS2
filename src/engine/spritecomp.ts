import { Color } from "../utils/color";
import { ObjUtils, TypeDescriptor } from "../utils/objutils";
import { Rect } from "../utils/rect";
import { Vect2 } from "../utils/vect2";
import { Component } from "./node";
import { Texture } from "./texture";

export class Sprite {
  _texture: Texture;
  textureRect: Rect;
  offset: Vect2;

  constructor(texture: Texture, textureRect: Rect, offset?: Vect2) {
    this._texture = texture;
    this.textureRect = textureRect;
    this.offset = offset ?? new Vect2(0, 0);
  }

  clone(): Sprite {
    return new Sprite(this._texture, this.textureRect.clone(), this.offset.clone());
  }

  // TODO Allow changing texture at runtime by signalling a change to the SpriteSystem inside the texture setter
  public get texture(): Texture { return this._texture };

  public get spriteRect(): Rect {
    return new Rect(-this.offset.x, -this.offset.y, this.textureRect.width, this.textureRect.height);
  }
}

export class SpriteComp extends Component {
  color: Color;
  sprite: Sprite;
  depth: number;

  constructor(sprite: Sprite, color?: Color, depth: number = 0) {
    super();
    this.sprite = sprite;
    this.color = color ?? new Color(1, 1, 1, 1);
    this.depth = depth;
  }

  clone(): SpriteComp {
    return new SpriteComp(this.sprite, this.color.clone());
  }
}