import { Material } from './material'
import { Node } from './node'
import { Scene } from './scene';

export class FullScreenQuad implements Node {
  material: Material;

  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;

  constructor(public readonly scene: Scene) {
    scene.addNode(this);
    this.material = new Material(scene.engine, `
    precision lowp float;
    attribute vec2 a_position; 
    varying vec2 v_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_position = gl_Position.xy;
    }
    `,
      `
    precision lowp float;
    varying vec2 v_position;
    uniform vec2 u_viewport;

    vec2 modI(float a, float b) {
      float grid = floor((a+0.5)/b)*b;
      float m=a-grid;
      return vec2(grid, floor(m+0.5));
    }

    void main() {
      vec2 pixelPosCenter = gl_FragCoord.xy - u_viewport * 0.5;

      vec2 modX = modI(pixelPosCenter.x, 10.0);
      vec2 modY = modI(pixelPosCenter.y, 10.0);
      if (modX.y == 0.0 || modY.y == 0.0) {
        if ((modX.x == 0.0 && modX.y == 0.0) || (modY.x == 0.0 && modY.y == 0.0)) {
          gl_FragColor = vec4(0.3, 0.3, 0.3, 1.0);
        } else {
          gl_FragColor = vec4(0.25, 0.25, 0.25, 1.0);
        }
      } else {
        gl_FragColor = vec4(0.2, 0.2, 0.23, 1.0);
      }
    }
`);
  }

  onCreated(): void {
    this.material.maybeCreate();
    let gl = this.scene.engine.gl;

    // Create the arrays of inputs for the vertex shaders
    const quadVertices = new Float32Array(2 * 4);
    const indices = new Uint16Array(3 * 2);

    // Arrow Coordinates
    quadVertices[0 * 2 + 0] = -1.0;
    quadVertices[0 * 2 + 1] = -1.0;
    quadVertices[1 * 2 + 0] = -1.0;
    quadVertices[1 * 2 + 1] = +1.0;
    quadVertices[2 * 2 + 0] = +1.0;
    quadVertices[2 * 2 + 1] = +1.0;
    quadVertices[3 * 2 + 0] = +1.0;
    quadVertices[3 * 2 + 1] = -1.0;

    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 2;
    indices[3] = 2;
    indices[4] = 0;
    indices[5] = 3;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    const posLocation = gl.getAttribLocation(this.material.shaderProgram, "a_position");
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.enableVertexAttribArray(posLocation);

    this.elementBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  onUpdate(time: number, deltaTime: number): void {
    let gl = this.scene.engine.gl;

    this.bindBuffers(gl);

    this.scene.engine.useMaterial(this.material);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  private bindBuffers(gl: WebGLRenderingContext) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const posLocation = gl.getAttribLocation(this.material.shaderProgram, "a_position");
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.enableVertexAttribArray(posLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
  }
}