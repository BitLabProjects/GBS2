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
}