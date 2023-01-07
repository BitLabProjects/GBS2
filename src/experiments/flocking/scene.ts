import { Engine } from "../../engine/engine";
import { Node } from "../../engine/node";
import { Scene } from "../../engine/scene";
import { FullScreenQuad } from "./fullscreenquad";
import { ParticleSystem } from "./particlesystem";

export class FlockingScene extends Scene {
  constructor(engine: Engine) {
    super(engine);

    let fsqNode = new Node(this);
    fsqNode.addComponent(new FullScreenQuad());

    let ps1Node = new Node(this);
    ps1Node.addComponent(new ParticleSystem(1));
    let ps2Node = new Node(this);
    ps2Node.addComponent(new ParticleSystem(2));
  }
}