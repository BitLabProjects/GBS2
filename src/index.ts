import { Engine } from "./engine/engine";
import { FlockingScene } from "./experiments/flocking/scene";
import { WebRTCScene } from "./experiments/webrtc/scene";

function launchExperiment(sceneClass: any) {
  document.body.innerHTML = "";
  let engine = Engine.createWithNewCanvas();
  engine.init();
  engine.scene = new sceneClass(engine);
  engine.render();
}

function addExperimentButton(text: string, sceneClass: any) {
  let btn = document.createElement("button");
  btn.innerText = text;
  btn.style.padding = "10px";
  btn.style.margin = "10px";
  btn.style.display = "block";
  btn.onclick = () => { launchExperiment(sceneClass); }
  document.body.appendChild(btn);
}

addExperimentButton("Flocking", FlockingScene);
addExperimentButton("WebRTC", WebRTCScene);

