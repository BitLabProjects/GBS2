import { Engine } from "./engine";

export class Material {
  public shaderProgram: WebGLProgram | undefined;

  constructor(public readonly engine: Engine,
    private readonly vertexShaderSource: string,
    private readonly fragmentShaderSource: string) {
  }

  public maybeCreate() {
    if (!this.shaderProgram) {
      this.create();
    }
  }

  private create() {
    let gl = this.engine.gl;
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(
      vertexShader,
      this.vertexShaderSource
    );
    gl.compileShader(vertexShader);

    const vertexMessage = gl.getShaderInfoLog(vertexShader);
    if (vertexMessage.length > 0) {
      console.error("Vertex shader error: " + vertexMessage);
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(
      fragmentShader,
      this.fragmentShaderSource
    );
    gl.compileShader(fragmentShader);

    const fragmentMessage = gl.getShaderInfoLog(fragmentShader);
    if (fragmentMessage.length > 0) {
      console.error("Fragment shader error: " + fragmentMessage);
    }

    this.shaderProgram = gl.createProgram();
    gl.attachShader(this.shaderProgram, vertexShader);
    gl.attachShader(this.shaderProgram, fragmentShader);
    gl.linkProgram(this.shaderProgram);
  }
}