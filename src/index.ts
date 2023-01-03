import { Engine } from "./engine/engine";
import { FlockingScene } from "./experiments/flocking/scene";

let engine = Engine.createWithNewCanvas();
engine.init();
engine.scene = new FlockingScene(engine);
engine.render();
