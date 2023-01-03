import { Material } from "./material";
import { Scene } from "./scene";
import { Texture } from "./texture";

export class Engine {
  public readonly gl: WebGL2RenderingContext;
  private material: Material;
  public scene: Scene;
  private time: number;

  constructor(public readonly canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2", {antialias: false});
  }

  static createWithNewCanvas(): Engine {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    document.body.appendChild(canvas);
    return new Engine(canvas);
  }

  public get width(): number {
    return this.canvas.width;
  }
  public get height(): number {
    return this.canvas.height;
  }

  public init() {
    // Start the background colour as black
    this.gl.clearColor(0.0, 0.0, 0.0, 1);

    // Allow alpha channels on in the vertex shader
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Set the WebGL context to be the full size of the canvas
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  public render() {
    for(var x of this.scene.nodes) {
      x.onCreated();
    }

    let dateOrPerformance = (window.performance || Date);

    let firstSim = true;

    let prevTime = dateOrPerformance.now();

    // In chrome, when the window is not visible (Es: minimized or another window is maximized) the requestAnimationFrame
    // does not fire. It will fire again when the window becomes visible, resulting in a long deltaTime.
    // To prevent that, disable the playing status and reset prevTime when becoming visible
    let isPlaying = true;
    addEventListener('visibilitychange', (event) => {
      if (document.visibilityState === "visible") {
        isPlaying = true;
        prevTime = dateOrPerformance.now();
        console.log("visible");
      } else {
        isPlaying = false;
        console.log("hidden");
      }
     });

    let onAnimationFrame = () => {
      if (isPlaying) {
        let repCount = firstSim ? 1 : 1;
        firstSim = false;
  
        let curTime = dateOrPerformance.now();
        let deltaTime = (curTime - prevTime) / 1000;
        prevTime = curTime;

        if (deltaTime > 0) {
          this.time += deltaTime;
          for(let i=0; i<repCount; i++) {
            this.onUpdate(this.time, deltaTime);
          }
        }
      }
      // Request anyway
      requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
  }

  private onUpdate(time: number, deltaTime: number) {
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    for(var x of this.scene.nodes) {
      x.onUpdate(time, deltaTime);
    }
  }

  public useMaterial(material: Material) {
    this.material = material;
    material.maybeCreate();
    this.gl.useProgram(material.shaderProgram);

    const timeUniformLocation = this.gl.getUniformLocation(material.shaderProgram, "u_time");
    if (timeUniformLocation) {
      this.gl.uniform1f(timeUniformLocation, this.time);
    }
    const viewportUniformLocation = this.gl.getUniformLocation(material.shaderProgram, "u_viewport");
    if (viewportUniformLocation) {
      this.gl.uniform2f(viewportUniformLocation, this.canvas.width, this.canvas.height);
    }
  }

  useTexture(texture: Texture, samplerName: string) {
    // Tell WebGL we want to affect texture unit 0
    this.gl.activeTexture(this.gl.TEXTURE0);

    // Bind the texture to texture unit 0
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.texture);

    // Tell the shader we bound the texture to texture unit 0
    let samplerLocation = this.gl.getUniformLocation(this.material.shaderProgram, samplerName);
    this.gl.uniform1i(samplerLocation, 0);
  }
}