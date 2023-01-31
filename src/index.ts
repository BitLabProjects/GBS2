import { DefaultEventsSystem } from "./engine/defaultEventsSystem";
import { Engine } from "./engine/engine";
import { InputSystem } from "./engine/inputSystem";
import { SpriteSystem } from "./engine/spritesystem";
import { UISystem } from "./engine/uisystem";
import { FlockingScene } from "./experiments/flocking/scene";
import { SpritePerfScene } from "./experiments/spriteperf/scene";
import { UIScene } from "./experiments/ui/scene";
import { WebRTCScene as WebRTCSceneClient, WebRTCSceneHost } from "./experiments/webrtc/scene";

function launchExperiment(sceneFactory: (engine: Engine) => any) {
  document.body.innerHTML = "";
  let engine = Engine.createWithNewCanvas();
  engine.addSystem(new DefaultEventsSystem(engine));
  engine.addSystem(new InputSystem(engine));
  engine.addSystem(new SpriteSystem(engine));
  engine.addSystem(new UISystem(engine));
  engine.init();
  engine.scene = sceneFactory(engine);
  engine.render();
}

function addExperimentButton(text: string, sceneFactory: (engine: Engine) => any) {
  let btn = document.createElement("button");
  btn.innerText = text;
  btn.style.padding = "10px";
  btn.style.margin = "10px";
  btn.style.display = "block";
  btn.onclick = () => { launchExperiment(sceneFactory); }
  document.body.appendChild(btn);
}

addExperimentButton("Flocking", (engine: Engine) => new FlockingScene(engine));
addExperimentButton("Sprite Perf", (engine: Engine) => new SpritePerfScene(engine));
addExperimentButton("UI", (engine: Engine) => new UIScene(engine));

let txtRoomName = document.createElement("input");
txtRoomName.value = "MyAwesomeRoomName16";
document.body.appendChild(txtRoomName);
function getRoomName() {
  return txtRoomName.value;
}
addExperimentButton("WebRTC Host", (engine: Engine) => new WebRTCSceneHost(engine, getRoomName()) );
addExperimentButton("WebRTC Client", (engine: Engine) => new WebRTCSceneClient(engine, getRoomName()) );

