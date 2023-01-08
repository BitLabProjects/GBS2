import { Engine } from "./engine";

export interface InstanceDataEntryDescriptor {
  name: string;
  length: number;
}

export class GeometryInstances {
  public readonly instanceBuffer: WebGLBuffer;
  public readonly entriesPerInstance: number;
  private instanceData: Float32Array | null;
  private currentLength: number;

  public constructor(public readonly engine: Engine, public readonly descriptors: InstanceDataEntryDescriptor[]) {
    let gl = engine.gl;
    this.entriesPerInstance = 0;
    for(let descr of descriptors) {
      this.entriesPerInstance += descr.length;
    }
    this.instanceBuffer = gl.createBuffer()!;
    this.instanceData = null;
    this.currentLength = 0;
  }

  allocate(instancesCount: number): Float32Array {
    this.currentLength = instancesCount * this.entriesPerInstance;
    if (!this.instanceData || this.instanceData.length < this.currentLength) {
      this.instanceData = new Float32Array(this.currentLength);
    }
    return this.instanceData;
  }

  updateBuffer() {
    let gl = this.engine.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData!, gl.DYNAMIC_DRAW, 0, this.currentLength);
  }
}