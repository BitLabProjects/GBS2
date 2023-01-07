import { Engine, EngineSystemForComp } from "./engine";
import { Material } from "./material";
import { SpriteComp } from "./spritecomp";

export class SpriteSystem extends EngineSystemForComp {
  constructor(engine: Engine) {
    super(engine, SpriteComp);
    this.material = new SpriteMaterial(engine);
  }
  
  private material: Material;
  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;

  onCreated(): void {
    let gl = this.engine.gl;

    // Vertices for a rectangle in the [0, 1] range
    const vertices = new Float32Array(2 * 4);
    vertices[0 * 2 + 0] = 0.0;
    vertices[0 * 2 + 1] = 0.0;
    vertices[1 * 2 + 0] = 0.0;
    vertices[1 * 2 + 1] = 1.0;
    vertices[2 * 2 + 0] = 1.0;
    vertices[2 * 2 + 1] = 1.0;
    vertices[3 * 2 + 0] = 1.0;
    vertices[3 * 2 + 1] = 0.0;
    
    // Indices for the two triangles composing the rectangle
    const indices = new Uint16Array(6);
    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 2;
    indices[3] = 2;
    indices[4] = 0;
    indices[5] = 3;

    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.elementBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  onUpdate(deltaTime: number): void {
    let gl = this.engine.gl;
    // TODO Group by texture
    // TODO Batching
    for(let comp of this.components) {
      let spriteComp = comp as SpriteComp;
    
      this.engine.useMaterial(this.material);
      this.engine.useTexture(spriteComp.texture, "uSampler");
      this.bindBuffers(gl, spriteComp.pos.x, spriteComp.pos.y, spriteComp.angle, 
                           spriteComp.color.r, spriteComp.color.g, spriteComp.color.b, spriteComp.color.a);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
  }

  private bindBuffers(gl: WebGL2RenderingContext, x: number, y: number, angle: number, r: number, g: number, b: number, a: number) {
    let shaderProgram = this.material.maybeCreate();
    const posUniformLocation = gl.getUniformLocation(shaderProgram, "a_pos");
    gl.uniform2f(posUniformLocation, x, y);
    const angleUniformLocation = gl.getUniformLocation(shaderProgram, "a_angle");
    gl.uniform1f(angleUniformLocation, angle);
    const colorUniformLocation = gl.getUniformLocation(shaderProgram, "a_color");
    gl.uniform4f(colorUniformLocation, r, g, b, a);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const posLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.enableVertexAttribArray(posLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
  }
}

export class SpriteMaterial extends Material {
  constructor(public readonly engine: Engine) {
    super(engine, 
      `#version 300 es
       precision lowp float;
       
       in vec2 a_position; 
       uniform float a_angle;
       uniform vec2 a_pos;
       
       // uniforms automatically filled by engine, if present
       uniform vec2 u_viewport;
       
       out vec2 v_uv;
   
       uniform sampler2D uSampler;
       
       void main() {
         mat3 LcsToWcsMatrix = mat3(
           +cos(a_angle), +sin(a_angle),   0.0, //first column
           -sin(a_angle), +cos(a_angle),   0.0,
                 a_pos.x,       a_pos.y,   1.0
         );
   
         // Scale position from [0, 1] to [0, sprite_width] and [0, sprite_height]
         vec2 texSize = vec2(textureSize(uSampler, 0));
         vec2 pos_Lcs = vec2(a_position.x * texSize.x,
                             a_position.y * texSize.y);
                             
         // Apply pixel offset to center the sprite relative to its reference point
         vec2 pixel_offset = vec2(4.0, 0.0);
         pos_Lcs -= pixel_offset;
       
         // Apply Lcs To Wcs matrix
         vec2 pos_Wcs = (LcsToWcsMatrix * vec3(pos_Lcs, 1.0)).xy;
   
         // Vcs coordinates are equal to Wcs coordinates: the view is fixed and centered on the origin, for now
         vec2 pos_Vcs = pos_Wcs;
   
         // Round to integer pixel
         //pos_Vcs = floor(pos_Vcs);
   
         // Scale to homogeneous coordinates in the [-1, +1] range
         vec2 viewport_scale = vec2(1.0 / (u_viewport.x * 0.5), 1.0 / (u_viewport.y * 0.5));
         vec2 pos_Hcs = pos_Vcs * viewport_scale;
   
         gl_Position = vec4(pos_Hcs, 0.0, 1.0);
         
         v_uv = a_position;
       }
      `,
      `#version 300 es
       precision lowp float;

       in vec2 v_uv;
       uniform vec4 a_color;
       out vec4 color;

       uniform sampler2D uSampler;

       void main() {
         color = texture(uSampler, v_uv) * a_color;
       }
      `);
  }
}