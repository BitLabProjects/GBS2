import { Engine } from './engine';
import { Node } from './node'

export class Scene {
  nodes: Node[];

  constructor(public readonly engine: Engine) {
    this.nodes = [];
  }

  addNode(node: Node) {
    this.nodes.push(node);
  }

  removeNode(node: Node) {
    const index = this.nodes.indexOf(node);
    if (index > -1) {
      this.nodes.splice(index, 1); 
      this.engine.addRemovedNode(node);
    }
  }

  onUpdate(deltaTime: number) {
  }
}