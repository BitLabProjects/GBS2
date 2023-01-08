import { Engine } from "../../engine/engine";
import { Node } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { FullScreenQuad } from "./fullscreenquad";
import { ParticleSystem } from "./particlesystem";

export class FlockingScene extends Scene {
  constructor(engine: Engine) {
    super(engine);

    Node.createFromComp(this, new FullScreenQuad());
    Node.createFromComp(this, new ParticleSystem(1));
    Node.createFromComp(this, new ParticleSystem(2));
  }
}