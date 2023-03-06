import { Vect2 } from "../utils/vect2";
import { CameraComp } from "./cameracomp";
import { ComponentTracker, Engine, EngineSystemWithTrackers } from "./engine";
import { Geometry } from "./geometry";
import { GeometryInstances } from "./geometryinstances";
import { Material } from "./material";
import { Component, Transform2D } from "./node";
import { SpriteComp } from "./spritecomp";
import { Texture } from "./texture";

export class SpriteSystem extends EngineSystemWithTrackers {
  constructor(engine: Engine) {
    super(engine);
    this.addTracker(new ComponentTracker(
      engine.genTrackerId(),
      SpriteComp,
      this.componentFilter,
      undefined,
      this.onComponentChangedOrRemoved));
    this.addTracker(new ComponentTracker(
      engine.genTrackerId(),
      CameraComp));

    this.materialSprite = new SpriteMaterial(engine, false);
    this.materialShadow = new SpriteMaterial(engine, true);
    this.textures = []
    this.componentsForTexture = [];
    this.geometryInstancesForTexture = [];
  }

  private materialSprite: Material;
  private materialShadow: Material;
  private geometry: Geometry;

  private textures: Texture[];
  private componentsForTexture: SpriteComp[][];
  private geometryInstancesForTexture: GeometryInstances[];

  onCreate(): void {
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

    this.geometry = new Geometry(this.engine, vertices, indices);
  }

  protected componentFilter = (comp: Component) => {
    return comp.node!.transform instanceof Transform2D;
  }

  protected onComponentChangedOrRemoved = (comp: Component, isDelete: boolean) => {
    let spriteComp = comp as SpriteComp;
    let idxTex = this.textures.indexOf(spriteComp.sprite.texture);
    if (idxTex < 0) {
      // Not found, if this is a delete it's ok, just exit
      if (isDelete) return;
      // Otherwise add it
      this.textures.push(spriteComp.sprite.texture);
      idxTex = this.textures.length - 1;
      this.componentsForTexture[idxTex] = [];
      // Will be filled on each update
      this.geometryInstancesForTexture[idxTex] = new GeometryInstances(this.engine, [
        { name: "a_pos", length: 2 },
        { name: "a_angle", length: 1 },
        { name: "a_color", length: 4 },
        { name: "a_scale", length: 2 },
        { name: "a_offset", length: 2 },
        { name: "a_texrect", length: 4 },
        { name: "a_depth", length: 1 },
      ]);
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
      if (components.indexOf(spriteComp) < 0) {
        components.push(spriteComp);
      }
    }
  }

  onUpdate(deltaTime: number): void {
    let gl = this.engine.gl;

    let cameraPos = new Vect2(0, 0);
    let camera = this.trackers[1].components[0] as CameraComp;
    if (camera instanceof CameraComp) {
      // If a camera was found, use its position
      cameraPos = camera.pos.clone();
    }

    for (let idxTex = 0; idxTex < this.textures.length; idxTex += 1) {
      let components = this.componentsForTexture[idxTex];
      // Fill instance data
      let instancesCount = components.length;
      if (instancesCount === 0) {
        continue;
      }
      let geometryInstances = this.geometryInstancesForTexture[idxTex];
      let instanceData = geometryInstances.allocate(instancesCount);
      let offset = 0;
      for (let [_, comp] of components.entries()) {
        let spriteComp = comp as SpriteComp;
        let transform = comp.node!.transform as Transform2D;

        instanceData[offset + 0] = transform.x;
        instanceData[offset + 1] = transform.y;
        instanceData[offset + 2] = transform.angle;
        instanceData[offset + 3] = spriteComp.color.r;
        instanceData[offset + 4] = spriteComp.color.g;
        instanceData[offset + 5] = spriteComp.color.b;
        instanceData[offset + 6] = spriteComp.color.a;
        instanceData[offset + 7] = transform.scaleX;
        instanceData[offset + 8] = transform.scaleY;
        instanceData[offset + 9] = spriteComp.sprite.offset.x;
        instanceData[offset + 10] = spriteComp.sprite.offset.y;
        instanceData[offset + 11] = spriteComp.sprite.textureRect.x;
        instanceData[offset + 12] = spriteComp.sprite.textureRect.y;
        instanceData[offset + 13] = spriteComp.sprite.textureRect.width;
        instanceData[offset + 14] = spriteComp.sprite.textureRect.height;
        instanceData[offset + 15] = spriteComp.depth;
        offset += geometryInstances.entriesPerInstance;
      }
      geometryInstances.updateBuffer();

      this.engine.useMaterial(this.materialSprite, [
        { name: "u_cameraPos", value: cameraPos }
      ]);
      this.engine.useTexture(this.textures[idxTex], "uSampler");
      this.engine.useGeometry(this.geometry, geometryInstances);

      gl.enable(gl.DEPTH_TEST);
      gl.depthRange(-100000, +100000);
      gl.depthFunc(gl.LESS);
      gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, instancesCount);
      gl.disable(gl.DEPTH_TEST);

      // this.engine.useMaterial(this.materialShadow, [
      //   { name: "u_cameraPos", value: cameraPos }
      // ]);
      // // TODO put shadowed material upfront and draw only first N instances with shadows
      // gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, instancesCount);
    }
  }
}

export class SpriteMaterial extends Material {
  constructor(public readonly engine: Engine, isShadow: boolean) {
    super(engine,
      `#version 300 es
       precision lowp float;
       
       in vec2 a_position; 
       in vec3 a_pos;
       in float a_angle;
       in vec4 a_color;
       in vec2 a_scale;
       in vec2 a_offset;
       in vec4 a_texrect;
       in float a_depth;
       
       // uniforms automatically filled by engine, if present
       uniform vec2 u_viewport;
       uniform vec2 u_cameraPos;
       
       out vec2 v_uv;
       out vec4 v_color;
   
       uniform sampler2D uSampler;
       
       void main() {
         mat3 LcsToWcsMatrix = mat3(
           +cos(a_angle) * a_scale.x,             +sin(a_angle),   0.0, //first column
                       -sin(a_angle), +cos(a_angle) * a_scale.y,   0.0,
                             a_pos.x,                   a_pos.y,   1.0
         );
   
         // Scale position from [0, 1] to [0, width] and [0, height]
         vec2 pos_Lcs = vec2(a_position.x * a_texrect.z,
                             a_position.y * a_texrect.w);
                             
         // Apply pixel offset to center the sprite relative to its reference point
         pos_Lcs -= a_offset;
       
         // Apply Lcs To Wcs matrix
         vec2 pos_Wcs = (LcsToWcsMatrix * vec3(pos_Lcs, 1.0)).xy;
   
         // Vcs coordinates are Wcs coordinates transformed relative to camera (translation only, for now)
         vec2 pos_Vcs = pos_Wcs - u_cameraPos;
   
         // Round to integer pixel
         //pos_Vcs = floor(pos_Vcs);
   
         // Scale to homogeneous coordinates in the [-1, +1] range
         vec2 viewport_scale = vec2(1.0 / (u_viewport.x * 0.5), 1.0 / (u_viewport.y * 0.5));
         vec2 pos_Hcs = pos_Vcs * viewport_scale;
   
         gl_Position = vec4(pos_Hcs, a_depth / 100000.0, 1.0);
         
         vec2 texSize = vec2(textureSize(uSampler, 0));
         vec2 texelSize = 1.0 / texSize;
         v_uv = vec2(a_texrect.x, texSize.y - a_texrect.y - a_texrect.w) * texelSize + a_position * a_texrect.zw * texelSize;
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
         if (color.a < 0.0001) discard;
       }
      `);
  }
}