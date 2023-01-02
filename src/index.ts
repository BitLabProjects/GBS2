// This example creates an HTML canvas which uses WebGL to
// render spinning confetti using JavaScript. We're going
// to walk through the code to understand how it works, and
// see how TypeScript's tooling provides useful insight.

import { Engine } from "./engine";
import { FullScreenQuad } from "./fullscreenquad";
import { ParticleSystem } from "./particlesystem";
import { Scene } from "./scene";

// This example builds off: example:working-with-the-dom

// First up, we need to create an HTML canvas element, which
// we do via the DOM API and set some inline style attributes:

const canvas = document.createElement("canvas");
canvas.id = "spinning-canvas";
canvas.style.backgroundColor = "#0078D4";
canvas.style.position = "fixed";
canvas.style.left = "0px";
canvas.style.top = "0px";
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
canvas.style.zIndex = "100";
document.body.appendChild(canvas);

let engine = new Engine(canvas);
engine.init();

let scene = new Scene(engine);

let fullScrenQuad = new FullScreenQuad(scene);
let particleSystem = new ParticleSystem(scene);
engine.scene = scene;

engine.render();
