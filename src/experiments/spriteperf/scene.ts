import { Engine } from "../../engine/engine";
import { Node } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { SpriteComp } from "../../engine/spritecomp";
import { Texture } from "../../engine/texture";
import StatCounter from "../../utils/statcounter";

export class SpritePerfScene extends Scene {
  sprites: SpriteComp[];
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
      let node = new Node(this);
      let comp = new SpriteComp(
        Math.random() * engine.width * 0.8 + engine.width * 0.1 - engine.width / 2,
        Math.random() * engine.height * 0.8 + engine.height * 0.1 - engine.height / 2,
        textures[i % 2]);
      node.addComponent(comp);
      this.sprites.push(comp);

      this.angleSpeeds.push(Math.random() * Math.PI + Math.PI / 50);
    }

    this.fpsMeasure = new StatCounter(0.1);
    this.label = document.createElement("span");
    document.body.appendChild(this.label);
    this.statUpdateAccumulator = 0;
  }

  onUpdate(deltaTime: number) {
    for (let [i, sprite] of this.sprites.entries()) {
      sprite.angle += this.angleSpeeds[i] * deltaTime;
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