import { Scene } from "./scene";

export class Component {
  public idxInCompSystem: number;
  public node: Node | null;
  constructor() {
    this.idxInCompSystem = -1;
    this.node = null;
  }

  public get scene(): Scene {
    return this.node!.scene;
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

export class Node {
  public readonly id: number;
  private readonly _components: Component[];
  private readonly _transform: Transform;

  constructor(public readonly scene: Scene, transform: Transform) {
    this.id = scene.engine.genNodeID();
    scene.addNode(this); // TODO Review subscription and invalidation point for systems
    this._components = [];
    this._transform = transform;
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

  public addComponent(comp: Component) {
    this._components.push(comp);
    comp.node = this;
    this.scene.engine.addChangedNode(this);
  }
}

export class Node2D extends Node {
  constructor(public readonly scene: Scene, transform: Transform2D) {
    super(scene, transform);
  }

  static createFromComp(scene: Scene, comp: Component) {
    let node = new Node2D(scene, Transform2D.default());
    node.addComponent(comp);
    return node;
  }

  public get transform2D(): Transform2D {
    return this.transform as Transform2D;
  }
}