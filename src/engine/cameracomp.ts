import { Vect } from "../utils/vect";
import { Component } from "./node";

export class CameraComp extends Component {
  public pos: Vect;
  constructor() {
    super();
    this.pos = new Vect(0, 0);
  }
}