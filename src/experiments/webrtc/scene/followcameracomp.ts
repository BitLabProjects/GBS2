import { CameraComp } from "../../../engine/cameracomp";
import { Vect } from "../../../utils/vect";

export class FollowCameraComp extends CameraComp {
  updateFollow(dstPos: Vect) {
    this.pos.copy(dstPos);
  }
}