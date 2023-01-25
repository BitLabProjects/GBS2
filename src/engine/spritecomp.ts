import { Rect } from "../utils/rect";
import { Component } from "./node";
import { Texture } from "./texture";

export class SpriteComp extends Component {
  color: { r: number, g: number, b: number, a: number };
  _texture: Texture;
  textureRect: Rect;

  constructor(texture: Texture) {
    super();
    this.color = { r: 1, g: 1, b: 1, a: 1 };
    this._texture = texture;
    this.textureRect = new Rect(0, 0, -1, -1);
  }

  // TODO Allow changing texture at runtime by signalling a change to the SpriteSystem inside the texture setter
  public get texture(): Texture { return this._texture };
}