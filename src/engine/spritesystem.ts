import { Engine, EngineSystemForComp } from "./engine";
import { Material } from "./material";
import { Component } from "./node";
import { SpriteComp } from "./spritecomp";
import { Texture } from "./texture";

export class SpriteSystem extends EngineSystemForComp {
  constructor(engine: Engine) {
    super(engine, SpriteComp);
    this.material = new SpriteMaterial(engine);
    this.textures = []
    this.componentsForTexture = [];
    this.instanceDataForTexture = [];
    this.instanceBufferForTexture = [];
  }
  
  private material: Material;
  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;
  
  private textures: Texture[];
  private componentsForTexture: SpriteComp[][];
  private instanceDataForTexture: Float32Array[];
  private instanceBufferForTexture: WebGLBuffer[];
  private readonly floatsPerInstance = 2 + 1 + 4;

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

  protected onComponentChanged(comp: Component, isDelete: boolean): void {
    let spriteComp = comp as SpriteComp;
    let idxTex = this.textures.indexOf(spriteComp.texture);
    if (idxTex < 0) {
      // Not found, if this is a delete it's ok, just exit
      if (isDelete) return;
      // Otherwise add it
      this.textures.push(spriteComp.texture);
      idxTex = this.textures.length - 1;
      this.componentsForTexture[idxTex] = [];
      // Will be filled on each update
      this.instanceBufferForTexture[idxTex] = this.engine.gl.createBuffer()!;
    }

    let components = this.componentsForTexture[idxTex];
    if (isDelete) {
      // Remove the component
      // TODO Extract this logic
      let idxComp = components.indexOf(spriteComp);
      if (idxComp >= 0) {
        // Replace it with the last, and reduce length by one
        if (idxComp < components.length - 1) {
          components[idxComp] = components[components.length - 1];
        }
        components.length -= 1;
        // TODO remove texture if no more components use it
      }
    } else {
      components.push(comp as SpriteComp);
    }
  }

  onUpdate(deltaTime: number): void {
    let gl = this.engine.gl;
    
    for(let idxTex = 0; idxTex < this.textures.length; idxTex += 1) {
      let components = this.componentsForTexture[idxTex];
      // Fill instance data
      let instancesCount = components.length;
      if (instancesCount === 0) {
        return;
      }
      let desiredLength = instancesCount * this.floatsPerInstance;
      let instanceData = this.instanceDataForTexture[idxTex];
      if (!instanceData || instanceData.length < desiredLength) {
        instanceData = new Float32Array(desiredLength);
        this.instanceDataForTexture[idxTex] = instanceData;
      }
      
      for(let [i, comp] of components.entries()) {
        let spriteComp = comp as SpriteComp;
        
        const offset = i * this.floatsPerInstance;
        instanceData[offset + 0] = spriteComp.pos.x;
        instanceData[offset + 1] = spriteComp.pos.y;
        instanceData[offset + 2] = spriteComp.angle;
        instanceData[offset + 3] = spriteComp.color.r;
        instanceData[offset + 4] = spriteComp.color.g;
        instanceData[offset + 5] = spriteComp.color.b;
        instanceData[offset + 6] = spriteComp.color.a;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBufferForTexture[idxTex]);
      gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW, 0, desiredLength);
  
      this.bindBuffers(gl, this.floatsPerInstance);
  
      this.engine.useMaterial(this.material);
      this.engine.useTexture(this.textures[idxTex], "uSampler");
      gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, instancesCount);
    }
  }

  private bindBuffers(gl: WebGL2RenderingContext, floatsPerInstance: number) {
    const attrs_per_inst = [
      { name: "a_pos", length: 2, offset: 0 },
      { name: "a_angle", length: 1, offset: 2 },
      { name: "a_color", length: 4, offset: 3 },
    ];

    for (var i = 0; i < attrs_per_inst.length; i++) {
      const name = attrs_per_inst[i].name;
      const length = attrs_per_inst[i].length;
      const offset = attrs_per_inst[i].offset;
      const attribLocation = gl.getAttribLocation(this.material.maybeCreate(), name);
      gl.vertexAttribPointer(attribLocation, length, gl.FLOAT, false, floatsPerInstance * 4, offset * 4);
      gl.enableVertexAttribArray(attribLocation);
      gl.vertexAttribDivisor(attribLocation, 1);
    }

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
       in vec2 a_pos;
       in float a_angle;
       in vec4 a_color;
       
       // uniforms automatically filled by engine, if present
       uniform vec2 u_viewport;
       
       out vec2 v_uv;
       out vec4 v_color;
   
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
         v_color = a_color;
       }
      `,
      `#version 300 es
       precision lowp float;

       in vec2 v_uv;
       in vec4 v_color;
       out vec4 color;

       uniform sampler2D uSampler;

       void main() {
         color = texture(uSampler, v_uv) * v_color;
       }
      `);
  }
}