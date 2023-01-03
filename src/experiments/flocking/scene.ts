import { Engine } from "../../engine/engine";
import { Scene } from "../../engine/scene";
import { FullScreenQuad } from "./fullscreenquad";
import { ParticleSystem } from "./particlesystem";

export class FlockingScene extends Scene {
  constructor(engine: Engine) {
    super(engine);

    new FullScreenQuad(this);
    new ParticleSystem(this, 1);
    new ParticleSystem(this, 2);
  }
}