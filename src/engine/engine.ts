import { Geometry } from "./geometry";
import { GeometryInstances } from "./geometryinstances";
import { Material } from "./material";
import { Node, Component } from "./node";
import { Scene } from "./scene";
import { SpriteSystem } from "./spritesystem";
import { Texture } from "./texture";

export class Engine {
  public readonly gl: WebGL2RenderingContext;
  private material: Material;
  private materialShaderProgram: WebGLShader;
  private geometry: Geometry;

  private systems: EngineSystem[];
  private changedNodes: Node[];
  private removedNodes: Node[];

  public scene: Scene;
  private lastNodeID: number;

  private time: number;

  constructor(public readonly canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2", { antialias: false })!;
    this.lastNodeID = 0;
    this.systems = [];
    this.changedNodes = [];
    this.removedNodes = [];
  }

  static createWithNewCanvas(): Engine {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    let setCanvasSizeFromWindow = (canvas: HTMLCanvasElement) => {
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
    }
    setCanvasSizeFromWindow(canvas);
    document.body.appendChild(canvas);

    let engine = new Engine(canvas);
    // Attach the resize event here: a direct caller to Engine constructor might want to do differently
    window.onresize = (ev: UIEvent) => {
      setCanvasSizeFromWindow(canvas);
      engine.onResize();
    };

    return engine;
  }

  public get width(): number {
    return this.canvas.width;
  }
  public get height(): number {
    return this.canvas.height;
  }

  public genNodeID(): number {
    this.lastNodeID += 1;
    return this.lastNodeID;
  }

  addSystem(system: EngineSystem) {
    this.systems.push(system);
  }

  public init() {
    // Start the background colour as black
    this.gl.clearColor(0.0, 0.0, 0.0, 1);

    // Allow alpha channels on in the vertex shader
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    // Set the WebGL context to be the full size of the canvas
    this.onResize();
  }

  public onResize() {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  public render() {
    for (let system of this.systems) {
      system.onCreate();
    }

    // for(let node of this.scene.nodes) {
    //   for(let system of this.systems) {
    //     system.onNodeAddedOrModified(node);
    //   }
    // }

    let dateOrPerformance = (window.performance || Date);

    let firstSim = true;

    let prevTime = dateOrPerformance.now();

    // In chrome, when the window is not visible (Es: minimized or another window is maximized) the requestAnimationFrame
    // does not fire. It will fire again when the window becomes visible, resulting in a long deltaTime.
    // To prevent that, disable the playing status and reset prevTime when becoming visible
    let isPlaying = true;
    addEventListener('visibilitychange', (event) => {
      if (document.visibilityState === "visible") {
        isPlaying = true;
        prevTime = dateOrPerformance.now();
        console.log("visible");
      } else {
        isPlaying = false;
        console.log("hidden");
      }
    });

    let onAnimationFrame = () => {
      if (isPlaying) {
        let repCount = firstSim ? 1 : 1;
        firstSim = false;

        let curTime = dateOrPerformance.now();
        let deltaTime = (curTime - prevTime) / 1000;
        prevTime = curTime;

        if (deltaTime > 0) {
          this.time += deltaTime;
          for (let i = 0; i < repCount; i++) {
            this.onUpdate(deltaTime);
          }
        }
      }
      // Request anyway
      requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
  }

  public addChangedNode(node: Node) {
    this.changedNodes.push(node);
  }
  public addRemovedNode(node: Node) {
    this.removedNodes.push(node);
  }

  private onUpdate(deltaTime: number) {
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.scene.onUpdate(deltaTime);

    for (let node of this.removedNodes) {
      for (let system of this.systems) {
        system.onNodeRemoved(node);
      }
    }
    this.removedNodes.length = 0;

    for (let node of this.changedNodes) {
      for (let system of this.systems) {
        system.onNodeAddedOrModified(node);
      }
    }
    this.changedNodes.length = 0;

    for (let system of this.systems) {
      system.onUpdate(deltaTime);
    }
  }

  public useMaterial(material: Material) {
    this.material = material;
    this.materialShaderProgram = material.maybeCreate();
    this.gl.useProgram(this.materialShaderProgram);

    const timeUniformLocation = this.gl.getUniformLocation(this.materialShaderProgram, "u_time");
    if (timeUniformLocation) {
      this.gl.uniform1f(timeUniformLocation, this.time);
    }
    const viewportUniformLocation = this.gl.getUniformLocation(this.materialShaderProgram, "u_viewport");
    if (viewportUniformLocation) {
      this.gl.uniform2f(viewportUniformLocation, this.canvas.width, this.canvas.height);
    }
  }

  useTexture(texture: Texture, samplerName: string) {
    // Tell WebGL we want to affect texture unit 0
    this.gl.activeTexture(this.gl.TEXTURE0);

    // Bind the texture to texture unit 0
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture.texture);

    // Tell the shader we bound the texture to texture unit 0
    let samplerLocation = this.gl.getUniformLocation(this.materialShaderProgram, samplerName);
    this.gl.uniform1i(samplerLocation, 0);
  }

  public useGeometry(geometry: Geometry, geometryInstances?: GeometryInstances) {
    this.geometry = geometry;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometry.vertexBuffer);
    const posLocation = this.gl.getAttribLocation(this.materialShaderProgram, "a_position");
    this.gl.vertexAttribPointer(posLocation, 2, this.gl.FLOAT, false, 2 * 4, 0);
    this.gl.enableVertexAttribArray(posLocation);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, geometry.elementBuffer);

    if (geometryInstances) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, geometryInstances.instanceBuffer);
      let descriptors = geometryInstances.descriptors;
      let offset = 0;
      for (var i = 0; i < descriptors.length; i++) {
        const name = descriptors[i].name;
        const length = descriptors[i].length;
        const attribLocation = this.gl.getAttribLocation(this.materialShaderProgram, name);
        this.gl.vertexAttribPointer(attribLocation, length, this.gl.FLOAT, false, geometryInstances.entriesPerInstance * 4, offset * 4);
        this.gl.enableVertexAttribArray(attribLocation);
        this.gl.vertexAttribDivisor(attribLocation, 1);
        offset += length;
      }
    }
  }
}

export abstract class EngineSystem {
  abstract onCreate(): void;
  abstract onUpdate(deltaTime: number): void;
  // TODO Reset systems on scene change
  // abstract onSceneChange(): void;
  abstract onNodeAddedOrModified(node: Node): void;
  abstract onNodeRemoved(node: Node): void;
}

export class ComponentTracker {
  public readonly components: Component[];

  constructor(
    private readonly compType: any,
    private readonly componentFilter?: (comp: Component) => boolean,
    private readonly onComponentAdded?: (comp: Component) => void,
    private readonly onComponentChangedOrRemoved?: (comp: Component, isDelete: boolean) => void) {
    this.components = [];
  }

  onNodeAddedOrModified(node: Node): void {
    // TODO Handle removed components, they no longer are on the node!

    // Search specific component
    let comp = this.findComponent(node);
    if (comp) {
      if (comp.idxInCompSystem < 0) {
        this.components.push(comp);
        comp.idxInCompSystem = this.components.length - 1;
        if (this.onComponentAdded) {
          this.onComponentAdded(comp);
        }
      }
      if (this.onComponentChangedOrRemoved) {
        this.onComponentChangedOrRemoved(comp, false);
      }
    }
  }

  onNodeRemoved(node: Node) {
    let comp = this.findComponent(node);
    if (comp) {
      if (comp.idxInCompSystem >= 0) {
        // Remove entry from array without scaling
        // TODO maybe moving the last here and changing its pointer is better?
        // If the removed component is not the last, replace it with the last relinking its index
        if (comp.idxInCompSystem < this.components.length - 1) {
          let replaceComp = this.components[this.components.length - 1];
          replaceComp.idxInCompSystem = comp.idxInCompSystem;
          this.components[replaceComp.idxInCompSystem] = replaceComp;
        }
        this.components.length -= 1;
        comp.idxInCompSystem = -1;
        if (this.onComponentChangedOrRemoved) {
          this.onComponentChangedOrRemoved(comp, true);
        }
      }
    }
  }

  private findComponent(node: Node): Component | null {
    for (let [i, comp] of node.components) {
      if (comp instanceof this.compType) {
        if (this.componentFilter && !this.componentFilter(comp)) {
          continue;
        }
        // Allow only one for node
        return comp;
      }
    }
    return null;
  }
}

export abstract class EngineSystemWithTrackers extends EngineSystem {
  protected trackers: ComponentTracker[];

  constructor(public readonly engine: Engine) {
    super();
    this.trackers = [];
  }

  protected addTracker(tracker: ComponentTracker) {
    this.trackers.push(tracker);
  }

  onNodeAddedOrModified(node: Node): void {
    for(let tracker of this.trackers) {
      tracker.onNodeAddedOrModified(node);
    }
  }

  onNodeRemoved(node: Node) {
    for(let tracker of this.trackers) {
      tracker.onNodeRemoved(node);
    }
  }
}