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
};

export class Node {
  public readonly id: number;
  private readonly _components: Component[];

  constructor(public readonly scene: Scene) {
    this.id = scene.engine.genNodeID();
    scene.addNode(this); // TODO Review subscription and invalidation point for systems
    this._components = [];
  }

  public get components(): IterableIterator<[number, Component]> {
    return this._components.entries();
  }

  public addComponent(comp: Component) {
    this._components.push(comp);
    comp.node = this;
    this.scene.engine.addChangedNode(this);
  }
}
