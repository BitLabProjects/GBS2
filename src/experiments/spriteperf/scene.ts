import { Engine } from "../../engine/engine";
import { Node, Node2D } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import StatCounter from "../../utils/statcounter";

export class SpritePerfScene extends Scene {
  sprites: Node2D[];
  angleSpeeds: number[];
  xSpeeds: number[];
  ySpeeds: number[];
  fpsMeasure: StatCounter;
  label: HTMLSpanElement;
  statUpdateAccumulator: number;

  constructor(engine: Engine) {
    super(engine);

    this.sprites = [];
    this.angleSpeeds = [];
    this.xSpeeds = [];
    this.ySpeeds = [];
    let textures = [];
    textures.push(Texture.createFromUrl(engine, `flocking/unit1.png`));
    textures.push(Texture.createFromUrl(engine, `flocking/unit2.png`));
    for (let i = 0; i < 100 * 1000; i++) {
      let comp = new SpriteComp(textures[i % 2]);
      let node = Node2D.createFromComp(this, comp);
      node.transform2D.x = Math.random() * engine.width * 0.8 + engine.width * 0.1 - engine.width / 2;
      node.transform2D.y = Math.random() * engine.height * 0.8 + engine.height * 0.1 - engine.height / 2;
      this.sprites.push(node);

      this.angleSpeeds.push(Math.random() * Math.PI + Math.PI / 50);
    }

    this.fpsMeasure = new StatCounter(0.1);
    this.label = document.createElement("span");
    document.body.appendChild(this.label);
    this.statUpdateAccumulator = 0;
  }

  onUpdate(deltaTime: number) {
    for (let [i, sprite] of this.sprites.entries()) {
      sprite.transform2D.angle += this.angleSpeeds[i] * deltaTime;
    }

    let fps = 1 / deltaTime;
    this.fpsMeasure.update(fps);
    this.statUpdateAccumulator += deltaTime;
    if (this.statUpdateAccumulator > 1) {
      this.statUpdateAccumulator -= 0.25;
      this.label.innerText = `fps: ${this.fpsMeasure.average.toFixed(1)} fps +/- ${this.fpsMeasure.stddev.toFixed(1)} fps`;
    }
  }
}