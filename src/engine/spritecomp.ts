import { Color } from "../utils/color";
import { ObjUtils, TypeDescriptor } from "../utils/objutils";
import { Rect } from "../utils/rect";
import { Vect } from "../utils/vect";
import { Component } from "./node";
import { Texture } from "./texture";

export class SpriteComp extends Component {
  color: Color;
  _texture: Texture;
  textureRect: Rect;
  offset: Vect;

  constructor(texture: Texture, color?: Color, offset?: Vect) {
    super();
    this.color = color ?? new Color(1, 1, 1, 1);
    this._texture = texture;
    this.textureRect = new Rect(0, 0, -1, -1);
    this.offset = offset ?? new Vect(0, 0);
  }

  clone(): SpriteComp {
    let result = new SpriteComp(this._texture, this.color.clone());
    result.textureRect = this.textureRect.clone();
    result.offset = this.offset.clone();
    return result;
  }

  // TODO Allow changing texture at runtime by signalling a change to the SpriteSystem inside the texture setter
  public get texture(): Texture { return this._texture };

  public get spriteRect(): Rect {
    let offX = 4;
    let offY = 0;
    return new Rect(-offX, -offY, this.texture.width, this.texture.height);
  }
}