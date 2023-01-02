import { Material } from "./material";
import { Scene } from "./scene";

export class Engine {
  public readonly gl: WebGLRenderingContext;
  public readonly ext: ANGLE_instanced_arrays;
  public scene: Scene;
  private time: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl");

    this.ext = this.gl.getExtension('ANGLE_instanced_arrays');
    if (!this.ext) {
      console.error("Extension not supported: ANGLE_instanced_arrays");
    }
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

    const startTime = (window.performance || Date).now();

    let firstSim = true;

    let prevTime = startTime / 1000;
    let onAnimationFrame = () => {
      let repCount = firstSim ? 1 : 1;
      firstSim = false;

      this.time = ((window.performance || Date).now() - startTime) / 1000;
      let deltaTime = this.time - prevTime;
      prevTime = this.time;
      for(let i=0; i<repCount; i++) {
        this.onUpdate(this.time, deltaTime);
      }
      requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
  }

  private onUpdate(time: number, deltaTime: number) {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    for(var x of this.scene.nodes) {
      x.onUpdate(time, deltaTime);
    }
  }

  public useMaterial(material: Material) {
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
}