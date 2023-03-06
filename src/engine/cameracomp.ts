import { Vect2 } from "../utils/vect2";
import { Component } from "./node";

export class CameraComp extends Component {
  public pos: Vect2;
  constructor() {
    super();
    this.pos = new Vect2(0, 0);
  }
}