import { Engine } from "./engine";

export class Geometry {
  public readonly vertexBuffer: WebGLBuffer;
  public readonly elementBuffer: WebGLBuffer;

  public constructor(public readonly engine: Engine, vertices: ArrayBufferView, indices: ArrayBufferView) {
    let gl = engine.gl;
    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.elementBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }
}