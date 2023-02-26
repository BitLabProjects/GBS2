import { Color } from "../utils/color";
import { ObjUtils } from "../utils/objutils";
import { Rect } from "../utils/rect";
import { ComponentTracker, Engine, EngineSystemWithTrackers } from "./engine";
import { Geometry } from "./geometry";
import { GeometryInstances } from "./geometryinstances";
import { Material } from "./material";
import { Align, Component, NodeUI, TransformUI } from "./node";
import { SpriteComp } from "./spritecomp";
import { Texture } from "./texture";
import { UIRootComp } from "./uirootcomp";
import { UITextComp } from "./uitextcomp";

export class UISystem extends EngineSystemWithTrackers {
  constructor(engine: Engine) {
    super(engine);
    this.addTracker(new ComponentTracker(
      engine.genTrackerId(),
      UIRootComp,
      undefined,
      this.onComponentAdded_UIRootComp));
    this.addTracker(new ComponentTracker(
      engine.genTrackerId(),
      SpriteComp,
      this.componentFilter_SpriteComp,
      undefined,
      this.onComponentChangedOrRemoved_SpriteComp));
    this.addTracker(new ComponentTracker(
      engine.genTrackerId(),
      UITextComp,
      undefined,
      undefined,
      this.onComponentChangedOrRemoved_UITextComp));
    this.material = new UIMaterial(engine);
    this.spriteGeometryInstancesForUIRootComp = [];
    this.spriteCompsForUIRootComp = [];
    this.uiTextCompsForUIRootComp = [];
  }

  private material: Material;
  private geometry: Geometry;

  private spriteCompsForUIRootComp: SpriteComp[][];
  private uiTextCompsForUIRootComp: UITextComp[][];
  private spriteGeometryInstancesForUIRootComp: GeometryInstances[];

  onComponentAdded_UIRootComp = (comp: Component) => {
    //TODO Handle remove
    this.spriteCompsForUIRootComp.push([]);
    this.uiTextCompsForUIRootComp.push([]);
    this.spriteGeometryInstancesForUIRootComp.push(new GeometryInstances(this.engine, [
      { name: "a_pos", length: 2 },
      { name: "a_angle", length: 1 },
      { name: "a_color", length: 4 },
      { name: "a_scale", length: 2 },
      { name: "a_texrect", length: 4 },
    ]));
  }

  componentFilter_SpriteComp = (comp: Component): boolean => {
    return comp.node!.transform instanceof TransformUI
  }

  protected onComponentChangedOrRemoved_SpriteComp = (comp: Component, isDelete: boolean) => {
    let spriteComp = comp as SpriteComp;

    // Add/Remove to/from its UIRootComp
    let uiRootComp = this.findUIRootComp(comp);
    if (uiRootComp) {
      let idxForTracker = uiRootComp.getCompIdxForTracker(this.trackers[0].trackerId);
      let compsForUIRootComp = this.spriteCompsForUIRootComp[idxForTracker];
      if (isDelete) {
        ObjUtils.arrayRemoveReplacingWithLast(compsForUIRootComp, spriteComp);
      } else {
        compsForUIRootComp.push(spriteComp);
      }
    }
  }

  protected onComponentChangedOrRemoved_UITextComp = (comp: Component, isDelete: boolean) => {
    let uiTextComp = comp as UITextComp;

    // Add/Remove to/from its UIRootComp
    let uiRootComp = this.findUIRootComp(comp);
    if (uiRootComp) {
      let idxForTracker = uiRootComp.getCompIdxForTracker(this.trackers[0].trackerId);
      let compsForUIRootComp = this.uiTextCompsForUIRootComp[idxForTracker];
      if (isDelete) {
        ObjUtils.arrayRemoveReplacingWithLast(compsForUIRootComp, uiTextComp);
      } else {
        compsForUIRootComp.push(uiTextComp);
      }
    }
  }

  findUIRootComp = (comp: Component) => {
    // Find the parent with UIRootComp
    let node = comp.node;
    while (node) {
      let uiRootComp = node.getComponent(UIRootComp);
      if (uiRootComp instanceof UIRootComp) {
        return uiRootComp;
      }
      node = node.parent;
    }
    return null;
  }

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

  onUpdate(deltaTime: number): void {
    let calcCoordFromAlign = (size: number, availableSize: number, align: Align, marginBefore: number, marginAfter: number) => {
      switch (align) {
        case Align.Begin:
        case Align.Stretch:
          return marginBefore;
        case Align.Middle:
          return availableSize / 2 - size / 2 + marginBefore - marginAfter;
        case Align.End:
          return availableSize - size - marginAfter;
      }
    };
    let calcSizeFromAlign = (size: number, availableSize: number, align: Align, marginBefore: number, marginAfter: number) => {
      switch (align) {
        case Align.Stretch:
          return availableSize - marginBefore - marginAfter;
        default:
          return size;
      }
    };
    let updateAndRender = (node: NodeUI, x: number, y: number, availableWidth: number, availableHeight: number) => {
      let transform = node.transform as TransformUI;
      let margin = transform.margin;
      transform.bounds.x = x + calcCoordFromAlign(transform.width, availableWidth, transform.alignH, margin.left, margin.right) + transform.renderTransform.x;
      transform.bounds.y = y + calcCoordFromAlign(transform.height, availableHeight, transform.alignV, margin.top, margin.bottom) + transform.renderTransform.y;
      transform.bounds.width = calcSizeFromAlign(transform.width, availableWidth, transform.alignH, margin.left, margin.right);
      transform.bounds.height = calcSizeFromAlign(transform.height, availableHeight, transform.alignV, margin.top, margin.bottom);

      for (let [_, child] of node.childrenUI) {
        updateAndRender(child, transform.bounds.x, transform.bounds.y, transform.bounds.width, transform.bounds.height);
      }
    }

    let w = this.engine.width;
    let h = this.engine.height;
    for (let [idxUIRootComp, comp] of this.trackers[0].components.entries()) {
      updateAndRender(comp.node! as NodeUI, 0, 0, w, h)

      let uiTextCompRenderInfo = this.onUpdate_RecalcTextSprites(idxUIRootComp);
      this.onUpdate_RenderSprites(idxUIRootComp, uiTextCompRenderInfo, (comp as UIRootComp).uiTexture);
    }
  }

  onUpdate_RecalcTextSprites(idxUIRootComp: number): IUITextCompRenderInfo {
    let result: UITextCompCharInfo[][] = [];
    let totalSpriteCount = 0;
    let uiTextComps = this.uiTextCompsForUIRootComp[idxUIRootComp];
    let color = new Color(0.2, 0.2, 0.2, 1);
    let charW = 15;
    let charH = 20;

    let charMap: { [idx: string]: Rect } = {};
    for (let i = 0; i <= 9; i++) {
      charMap[i.toString()] = new Rect(charW * i, 512 - 20, charW, charH);
    }

    for (let [_, uiTextComp] of uiTextComps.entries()) {
      let transformUI = uiTextComp.node!.transform as TransformUI;
      // TODO update only when changed
      let charInfo: UITextCompCharInfo[] = [];
      let x = transformUI.bounds.x;
      let y = transformUI.bounds.y;
      for (let i = 0; i < uiTextComp.text.length; i++) {
        let charRect = charMap[uiTextComp.text[i]];
        if (charRect !== undefined) {
          charInfo.push(new UITextCompCharInfo(x, y, charW, charH, color, charRect));
          totalSpriteCount += 1;
        }
        x += charW;
      }

      result.push(charInfo);
    }
    return { infos: result, totalSpriteCount: totalSpriteCount };
  }

  onUpdate_RenderSprites(idxUIRootComp: number, uiTextCompRenderInfo: IUITextCompRenderInfo, uiTexture: Texture) {
    let gl = this.engine.gl;

    // Now layout is updated, draw the sprites
    let spriteComps = this.spriteCompsForUIRootComp[idxUIRootComp];
    // Fill instance data
    let instancesCount = spriteComps.length + uiTextCompRenderInfo.totalSpriteCount;
    if (instancesCount === 0) {
      return;
    }
    let geometryInstances = this.spriteGeometryInstancesForUIRootComp[idxUIRootComp];
    let instanceData = geometryInstances.allocate(instancesCount);
    let offset = 0;

    // Add instance data for sprites
    for (let [_, spriteComp] of spriteComps.entries()) {
      let transform = spriteComp.node!.transform as TransformUI;

      instanceData[offset + 0] = transform.bounds.x;
      instanceData[offset + 1] = transform.bounds.y;
      instanceData[offset + 2] = 0;
      instanceData[offset + 3] = spriteComp.color.r;
      instanceData[offset + 4] = spriteComp.color.g;
      instanceData[offset + 5] = spriteComp.color.b;
      instanceData[offset + 6] = spriteComp.color.a;
      instanceData[offset + 7] = transform.bounds.width;
      instanceData[offset + 8] = transform.bounds.height;
      instanceData[offset + 9] = spriteComp.sprite.textureRect.x;
      instanceData[offset + 10] = spriteComp.sprite.textureRect.y;
      instanceData[offset + 11] = spriteComp.sprite.textureRect.width;
      instanceData[offset + 12] = spriteComp.sprite.textureRect.height;
      offset += geometryInstances.entriesPerInstance;
    }

    for (let [_, charInfos] of uiTextCompRenderInfo.infos.entries()) {
      for (let charInfo of charInfos) {
  
        instanceData[offset + 0] = charInfo.x;
        instanceData[offset + 1] = charInfo.y;
        instanceData[offset + 2] = 0;
        instanceData[offset + 3] = charInfo.color.r;
        instanceData[offset + 4] = charInfo.color.g;
        instanceData[offset + 5] = charInfo.color.b;
        instanceData[offset + 6] = charInfo.color.a;
        instanceData[offset + 7] = charInfo.width;
        instanceData[offset + 8] = charInfo.height;
        instanceData[offset + 9] = charInfo.texRect.x;
        instanceData[offset + 10] = charInfo.texRect.y;
        instanceData[offset + 11] = charInfo.texRect.width;
        instanceData[offset + 12] = charInfo.texRect.height;
        offset += geometryInstances.entriesPerInstance;
      }
    }

    geometryInstances.updateBuffer();

    this.engine.useMaterial(this.material);

    // TODO Expand to more textures, for now only one atlas
    this.engine.useTexture(uiTexture, "uSampler");
    this.engine.useGeometry(this.geometry, geometryInstances);

    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, instancesCount);
  }
}

class UITextCompCharInfo {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public color: Color,
    public texRect: Rect) {

  }
}
type IUITextCompRenderInfo = { infos: UITextCompCharInfo[][], totalSpriteCount: number };

export class UIMaterial extends Material {
  constructor(public readonly engine: Engine) {
    super(engine,
      `#version 300 es
       precision lowp float;
       
       in vec2 a_position; 
       in vec2 a_pos;
       in float a_angle;
       in vec4 a_color;
       in vec2 a_scale;
       in vec4 a_texrect;
       
       // uniforms automatically filled by engine, if present
       uniform vec2 u_viewport;
       
       out vec2 v_uv;
       out vec4 v_color;
   
       uniform sampler2D uSampler;
       
       void main() {
         mat3 LcsToUIcsMatrix = mat3(
                 +cos(a_angle) * 1.0,             +sin(a_angle),   0.0, //first column
                       -sin(a_angle),       +cos(a_angle) * 1.0,   0.0,
                             a_pos.x,                   a_pos.y,   1.0
         );
   
         // Scale position from [0, 1] to [0, width] and [0, height]
         vec2 pos_Lcs = vec2(a_position.x * a_scale.x,
                             a_position.y * a_scale.y);
       
         // Apply Lcs To Wcs matrix
         vec2 pos_UIcs = (LcsToUIcsMatrix * vec3(pos_Lcs, 1.0)).xy;
   
         // Vcs coordinates are just a translation to move the origin from bottom-left to center
         vec2 pos_Vcs = vec2(pos_UIcs.x - u_viewport.x * 0.5,
                             (u_viewport.y - pos_UIcs.y) - u_viewport.y * 0.5);
   
         // Round to integer pixel
         //pos_Vcs = floor(pos_Vcs);
   
         // Scale to homogeneous coordinates in the [-1, +1] range
         vec2 viewport_scale = vec2(1.0 / (u_viewport.x * 0.5), 1.0 / (u_viewport.y * 0.5));
         vec2 pos_Hcs = pos_Vcs * viewport_scale;
   
         gl_Position = vec4(pos_Hcs, 0.0, 1.0);
         
         vec2 texelSize = 1.0 / vec2(textureSize(uSampler, 0));
         v_uv = a_texrect.xy * texelSize + a_position * a_texrect.zw * texelSize;
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
         //color = vec4(v_uv, 0.0, 1.0);
       }
      `);
  }
}