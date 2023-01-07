import { Component } from "./node";
import { Texture } from "./texture";

export class SpriteComp extends Component {
  pos: {x: number, y: number};
  angle: number;
  color: {r: number, g: number, b: number, a: number};
  texture: Texture;

  constructor(x: number, y: number, texture: Texture) {
    super();
    this.pos = {x: x, y: y};
    this.angle = 0;
    this.color = {r: 1, g: 1, b: 1, a: 1};
    this.texture = texture;
  }
}