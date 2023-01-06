import { Engine } from "./engine";
import { Material } from "./material";
import { Node } from "./node";
import { Scene } from "./scene";
import { Texture } from "./texture";

export class SpriteNode implements Node {
  pos: {x: number, y: number};
  material: Material;
  texture: Texture;

  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;

  constructor(public readonly scene: Scene, spriteUrl: string) {
    scene.addNode(this);
    this.material = new SpriteMaterial(scene.engine);
    this.texture = Texture.createFromUrl(scene.engine, spriteUrl);
    this.pos = {x: 0, y: 0};
  }

  onCreated(): void {
    this.material.maybeCreate();
    let gl = this.scene.engine.gl;

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

  onUpdate(time: number, deltaTime: number): void {
    // TODO Batching
    let gl = this.scene.engine.gl;

    this.scene.engine.useMaterial(this.material);
    this.scene.engine.useTexture(this.texture, "uSampler");
    this.bindBuffers(gl, this.pos.x, this.pos.y);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  private bindBuffers(gl: WebGL2RenderingContext, x: number, y: number) {
    const posUniformLocation = gl.getUniformLocation(this.material.maybeCreate(), "a_pos");
    gl.uniform2f(posUniformLocation, x, y);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const posLocation = gl.getAttribLocation(this.material.maybeCreate(), "a_position");
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
       uniform vec2 a_pos;
       
       // uniforms automatically filled by engine, if present
       uniform vec2 u_viewport;
       
       out vec2 v_uv;
   
       uniform sampler2D uSampler;
       
       void main() {
         float angle = 0.0;
         mat3 LcsToWcsMatrix = mat3(
           +cos(angle), +sin(angle),   0.0, //first column
           -sin(angle), +cos(angle),   0.0,
               a_pos.x,     a_pos.y,   1.0
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
         pos_Vcs = floor(pos_Vcs);
   
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
       out vec4 color;

       uniform sampler2D uSampler;

       void main() {
         color = texture(uSampler, v_uv);
       }
      `);
  }
}