import { Material } from './material'
import { Node } from './node'
import { Scene } from './scene';

export class FullScreenQuad implements Node {
  material: Material;

  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;

  constructor(public readonly scene: Scene) {
    scene.addNode(this);
    this.material = new Material(scene.engine, 
      `#version 300 es
       precision lowp float;
       in vec2 a_position; 
       out vec2 v_position;
       void main() {
         gl_Position = vec4(a_position, 0.0, 1.0);
         v_position = gl_Position.xy;
       }
      `,
      `#version 300 es
       precision lowp float;
       in vec2 v_position;
       out vec4 color;
       uniform vec2 u_viewport;
 
       /* Noise function from https://github.com/stegu/webgl-noise */
       vec3 mod289(vec3 x) { 
         return x - floor(x * (1.0 / 289.0)) * 289.0;
       }
 
       vec2 mod289(vec2 x) {
         return x - floor(x * (1.0 / 289.0)) * 289.0;
       }
 
       vec3 permute(vec3 x) {
         return mod289(((x*34.0)+10.0)*x);
       }
 
       float snoise(vec2 v) {
         const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                             0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                            -0.577350269189626,  // -1.0 + 2.0 * C.x
                             0.024390243902439); // 1.0 / 41.0
         // First corner
         vec2 i  = floor(v + dot(v, C.yy) );
         vec2 x0 = v -   i + dot(i, C.xx);
 
         // Other corners
         vec2 i1;
         //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
         //i1.y = 1.0 - i1.x;
         i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
         // x0 = x0 - 0.0 + 0.0 * C.xx ;
         // x1 = x0 - i1 + 1.0 * C.xx ;
         // x2 = x0 - 1.0 + 2.0 * C.xx ;
         vec4 x12 = x0.xyxy + C.xxzz;
         x12.xy -= i1;
 
         // Permutations
         i = mod289(i); // Avoid truncation effects in permutation
         vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) 
                                  + i.x + vec3(0.0, i1.x, 1.0 ));
 
         vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
         m = m*m ;
         m = m*m ;
 
         // Gradients: 41 points uniformly over a line, mapped onto a diamond.
         // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
         vec3 x = 2.0 * fract(p * C.www) - 1.0;
         vec3 h = abs(x) - 0.5;
         vec3 ox = floor(x + 0.5);
         vec3 a0 = x - ox;
 
         // Normalise gradients implicitly by scaling m
         // Approximation of: m *= inversesqrt( a0*a0 + h*h );
         m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
 
         // Compute final noise value at P
         vec3 g;
         g.x  = a0.x  * x0.x  + h.x  * x0.y;
         g.yz = a0.yz * x12.xz + h.yz * x12.yw;
         return 130.0 * dot(m, g);
       }
 
       vec2 modI(float a, float b) {
         float grid = floor((a+0.5)/b)*b;
         float m=a-grid;
         return vec2(grid, floor(m+0.5));
       }
 
       void main() {
         vec2 pixelPosCenter = gl_FragCoord.xy - u_viewport * 0.5;
 
         color = vec4(0.2, 0.5, 0.2, 1.0);
 
         vec2 mod16X = modI(pixelPosCenter.x, 16.0);
         vec2 mod16Y = modI(pixelPosCenter.y, 16.0);
         vec2 mod8X = modI(pixelPosCenter.x, 8.0);
         vec2 mod8Y = modI(pixelPosCenter.y, 8.0);
         if (mod16X.y == 0.0 || mod16Y.y == 0.0) {
           if ((mod16X.x == 0.0 && mod16X.y == 0.0) || (mod16Y.x == 0.0 && mod16Y.y == 0.0)) {
             // Axis line
             color += vec4(0.1, 0.1, 0.1, 0.0);
           } else {
            color += vec4(0.05, 0.05, 0.05, 0.0);
           }
         } else if (mod8X.y == 0.0 || mod8Y.y == 0.0) {
            color += vec4(0.02, 0.02, 0.02, 0.0);
         } else {
           // Inner pixel
           vec2 p = (gl_FragCoord.xy/u_viewport.y) * 2.0 - 1.0;
           float n = snoise(p.xy * 256.0);
           n = 0.5 + 0.5 * n;
           color -= vec4(vec3(n * 0.05), 0.0);
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

    // Rectangle Coordinates
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

  private bindBuffers(gl: WebGL2RenderingContext) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const posLocation = gl.getAttribLocation(this.material.shaderProgram, "a_position");
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.enableVertexAttribArray(posLocation);
    gl.vertexAttribDivisor(posLocation, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
  }
}