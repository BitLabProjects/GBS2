import { CameraComp } from "../../../engine/cameracomp";
import { Vect2 } from "../../../utils/vect2";
import { Vect3 } from "../../../utils/vect3";

export class FollowCameraComp extends CameraComp {
  updateFollow(dstPos: Vect3) {
    this.pos.set(dstPos.x, dstPos.y);
  }
}