import { Rect } from "../utils/rect";
import { Vect } from "../utils/vect";
import { Scene } from "./scene";

export class Component {
  private compIdxForTracker: number[];
  public node: Node | null;
  constructor() {
    this.compIdxForTracker = [];
    this.node = null;
  }

  public get scene(): Scene {
    return this.node!.scene;
  }

  public getCompIdxForTracker(trackerId: number): number {
    let idx = this.compIdxForTracker[trackerId];
    if (idx === undefined) idx = -1;
    return idx;
  }
  public setCompIdxForTracker(trackerId: number, value: number): void {
    if (value < 0) {
      delete this.compIdxForTracker[trackerId];
    } else {
      this.compIdxForTracker[trackerId] = value;
    }
  }

  // define on derived classes and it will be called by the StandardEventsSystem
  // onUpdate(deltaTime: number): void;
  // onCreate(): void;
};

export interface Transform {
}

export class Transform2D implements Transform {
  constructor(
    public x: number,
    public y: number,
    public angle: number,
    public scaleX: number,
    public scaleY: number) {
  }

  static default(): Transform2D {
    return new Transform2D(0, 0, 0, 1, 1);
  }
}

export enum Align {
  Begin,
  Middle,
  End,
  Stretch,
}
export class TransformUI implements Transform {
  public bounds: Rect;
  constructor(
    public width: number,
    public height: number,
    public alignH: Align,
    public alignV: Align,
    public renderTransform: Vect) {
    this.bounds = new Rect(0, 0, 0, 0);
  }

  static default(): TransformUI {
    return new TransformUI(-1, -1, Align.Stretch, Align.Stretch, new Vect(0, 0));
  }
}

export class Node {
  public readonly id: number;
  private readonly _components: Component[];
  private readonly _transform: Transform;
  private _parent: Node | null;
  private _children: Node[];

  constructor(public readonly scene: Scene,
    transform: Transform,
    parent?: Node) {
    this.id = scene.engine.genNodeID();
    scene.addNode(this); // TODO Review subscription and invalidation point for systems
    this._components = [];
    this._transform = transform;
    this._parent = parent ?? null;
    this._children = [];
    if (parent) {
      parent._children.push(this);
    }
  }

  static createFromComp(scene: Scene, comp: Component) {
    let node = new Node(scene, Transform2D.default());
    node.addComponent(comp);
    return node;
  }

  public get components(): IterableIterator<[number, Component]> {
    return this._components.entries();
  }
  public get transform(): Transform {
    return this._transform;
  }
  public get children(): IterableIterator<[number, Node]> {
    return this._children.entries();
  }
  public get parent(): Node | null {
    return this._parent;
  }

  public addComponent(comp: Component) {
    this._components.push(comp);
    comp.node = this;
    this.scene.engine.addChangedNode(this);
  }

  public getComponent(type: any): any {
    for (let c of this._components) {
      if (c instanceof type) {
        return c;
      }
    }
    return undefined;
  }
}

export class Node2D extends Node {
  constructor(public readonly scene: Scene,
    transform: Transform2D,
    parent?: Node2D) {
    super(scene, transform, parent);
  }

  static createFromComp(scene: Scene, comp: Component, parent?: Node2D) {
    let node = new Node2D(scene, Transform2D.default(), parent);
    node.addComponent(comp);
    return node;
  }

  public get transform2D(): Transform2D {
    return this.transform as Transform2D;
  }
  public get children2D(): IterableIterator<[number, Node2D]> {
    // Force-cast without checks, assume they are added correctly
    return this.children as IterableIterator<[number, Node2D]>;
  }
}

export class NodeUI extends Node {
  constructor(public readonly scene: Scene,
    transform: TransformUI,
    parent?: NodeUI) {
    super(scene, transform, parent);
  }

  static createFromComp(scene: Scene, comp: Component, parent?: NodeUI) {
    let node = new NodeUI(scene, TransformUI.default(), parent);
    node.addComponent(comp);
    return node;
  }

  public get transformUI(): TransformUI {
    return this.transform as TransformUI;
  }
  public get childrenUI(): IterableIterator<[number, NodeUI]> {
    // Force-cast without checks, assume they are added correctly
    return this.children as IterableIterator<[number, NodeUI]>;
  }
}