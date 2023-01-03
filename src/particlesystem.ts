import { Material } from './material'
import { ParticleMaterial } from './materials/particlematerial';
import { Node } from './node'
import { Scene } from './scene';
import { Texture } from './texture';

export class ParticleSystem implements Node {
  material: Material;
  texture: Texture;

  static readonly STRIDE_INST = 4;
  static readonly NUM_PARTICLES = 200;
  static readonly NUM_VERTICES = 4;
  static readonly NUM_INDICES = 6;
  private vertexBuffer: WebGLBuffer;
  private elementBuffer: WebGLBuffer;
  private instanceData: Float32Array;
  private instanceBuffer: WebGLBuffer;

  private timeAccumulator: number;

  constructor(public readonly scene: Scene, unitId: number) {
    scene.addNode(this);
    this.material = new ParticleMaterial(scene.engine);
    this.texture = Texture.createFromUrl(scene.engine, `textures/unit${unitId}.png`);
    this.timeAccumulator = -1;
  }

  onCreated(): void {
    this.material.maybeCreate();
    let gl = this.scene.engine.gl;

    // Vertices for a rectangle in the [0, 1] range
    const vertices = new Float32Array(2 * ParticleSystem.NUM_VERTICES);
    vertices[0 * 2 + 0] = 0.0;
    vertices[0 * 2 + 1] = 0.0;
    vertices[1 * 2 + 0] = 0.0;
    vertices[1 * 2 + 1] = 1.0;
    vertices[2 * 2 + 0] = 1.0;
    vertices[2 * 2 + 1] = 1.0;
    vertices[3 * 2 + 0] = 1.0;
    vertices[3 * 2 + 1] = 0.0;
    
    // Indices for the two triangles composing the rectangle
    const indices = new Uint16Array(ParticleSystem.NUM_INDICES);
    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 2;
    indices[3] = 2;
    indices[4] = 0;
    indices[5] = 3;

    // Particle instance data
    this.instanceData = new Float32Array(ParticleSystem.NUM_PARTICLES * ParticleSystem.STRIDE_INST);
    for (let i = 0; i < ParticleSystem.NUM_PARTICLES; i++) {
      const instr_ptr = i * ParticleSystem.STRIDE_INST;
      this.instanceData[instr_ptr + 0] = (Math.random() - 0.5) * 2 * 100;
      this.instanceData[instr_ptr + 1] = (Math.random() - 0.5) * 2 * 100;

      let newAngle = Math.random() * Math.PI * 2;
      let newSpeed = 30; //Math.random() * 50 + 10;
      this.instanceData[instr_ptr + 2] = Math.cos(newAngle) * newSpeed;
      this.instanceData[instr_ptr + 3] = Math.sin(newAngle) * newSpeed;
    }

    // Create buffers to pass data to shaders
    this.instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData, gl.DYNAMIC_DRAW);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.elementBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  onUpdate(time: number, deltaTime: number): void {
    let gl = this.scene.engine.gl;

    let updateSpeed = false;
    if (this.timeAccumulator < 0) {
      this.timeAccumulator = 0;
      updateSpeed = true;
    }
    this.timeAccumulator += deltaTime;
    if (this.timeAccumulator > 1) {
      this.timeAccumulator -= 1;
      updateSpeed = true;
    }

    var LIM_X = this.scene.engine.width / 2;
    var LIM_Y = this.scene.engine.height / 2;

    for (let i = 0; i < ParticleSystem.NUM_PARTICLES; i++) {
      const instr_ptr = i * ParticleSystem.STRIDE_INST;

      let pos_x = this.instanceData[instr_ptr + 0];
      let pos_y = this.instanceData[instr_ptr + 1];
      let vel_x = this.instanceData[instr_ptr + 2];
      let vel_y = this.instanceData[instr_ptr + 3];

      // Calc average nehghbour velocity
      let avgvel_x = 0;
      let avgvel_y = 0;
      let avg_count = 0;

      let repvel_x = 0;
      let repvel_y = 0;
      let repvel_count = 0;

      for (let j = 0; j < ParticleSystem.NUM_PARTICLES; j++) {
        if (i == j) continue;

        const instr_ptr_j = j * ParticleSystem.STRIDE_INST;
        let n_pos_x = this.instanceData[instr_ptr_j + 0];
        let n_pos_y = this.instanceData[instr_ptr_j + 1];
        let dx = n_pos_x - pos_x;
        let dy = n_pos_y - pos_y;
        let distance_sq = dx * dx + dy * dy;
        if (distance_sq < 40 * 40) {
          let n_vel_x = this.instanceData[instr_ptr_j + 2];
          let n_vel_y = this.instanceData[instr_ptr_j + 3];

          // Calculate average velocity of neighbour particles, to generate a flocking behaviour
          avgvel_x += n_vel_x;
          avgvel_y += n_vel_y;
          avg_count += 1;

          // If too near, also repel
          if (distance_sq < 5 * 5 && distance_sq > 0) {
            // Divide by distance squared to avoid a sqrt and to repel strongly when near
            repvel_x -= dx / distance_sq;
            repvel_y -= dy / distance_sq;
            repvel_count += 1;
          }
        }
      }

      const BORDER_LIM = 30.0;
      if (pos_x < -LIM_X + BORDER_LIM) repvel_x += (BORDER_LIM - (pos_x - -LIM_X)) * 0.03;
      if (pos_y < -LIM_Y + BORDER_LIM) repvel_y += (BORDER_LIM - (pos_y - -LIM_Y)) * 0.03;
      if (pos_x > +LIM_X - BORDER_LIM) repvel_x -= (BORDER_LIM - (LIM_X - pos_x)) * 0.03;
      if (pos_y > +LIM_Y - BORDER_LIM) repvel_y -= (BORDER_LIM - (LIM_Y - pos_y)) * 0.03;


      // Steer
      if (avg_count > 0) {
        avgvel_x /= avg_count;
        avgvel_y /= avg_count;
        if (repvel_count > 0) {
          repvel_x /= repvel_count;
          repvel_y /= repvel_count;
        }
        // Compute current and desired versors
        let vel_mag = Math.sqrt(vel_x * vel_x + vel_y * vel_y);
        let avgvel_mag = Math.sqrt(avgvel_x * avgvel_x + avgvel_y * avgvel_y);
        avgvel_x /= avgvel_mag;
        avgvel_y /= avgvel_mag;
        let vel_nx = vel_x / vel_mag;
        let vel_ny = vel_y / vel_mag;
        vel_nx += avgvel_x * 0.01 + repvel_x * 0.1;
        vel_ny += avgvel_y * 0.01 + repvel_y * 0.1;
        let vel_n_mag = Math.sqrt(vel_nx * vel_nx + vel_ny * vel_ny);
        vel_nx /= vel_n_mag;
        vel_ny /= vel_n_mag;
        vel_x = vel_nx * vel_mag;
        vel_y = vel_ny * vel_mag;
      }

      pos_x += vel_x * deltaTime;
      pos_y += vel_y * deltaTime;

      if (pos_x < -LIM_X) { pos_x = -LIM_X + (-LIM_X - pos_x); vel_x = -vel_x; }
      if (pos_x > +LIM_X) { pos_x = +LIM_X + (pos_x - LIM_X); vel_x = -vel_x; }
      if (pos_y < -LIM_Y) { pos_y = -LIM_Y + (-LIM_Y - pos_y); vel_y = -vel_y; }
      if (pos_y > +LIM_Y) { pos_y = +LIM_Y + (pos_y - LIM_Y); vel_y = -vel_y; }

      this.instanceData[instr_ptr + 0] = pos_x;
      this.instanceData[instr_ptr + 1] = pos_y;

      this.instanceData[instr_ptr + 2] = vel_x;
      this.instanceData[instr_ptr + 3] = vel_y;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData, gl.DYNAMIC_DRAW);

    this.bindBuffers(gl);

    this.scene.engine.useMaterial(this.material);
    this.scene.engine.useTexture(this.texture, "uSampler");
    gl.drawElementsInstanced(gl.TRIANGLES, ParticleSystem.NUM_INDICES, gl.UNSIGNED_SHORT, 0, ParticleSystem.NUM_PARTICLES);
  }

  private bindBuffers(gl: WebGL2RenderingContext) {
    const attrs_per_inst = [
      { name: "a_pos", length: 2, offset: 0 },
      { name: "a_vel", length: 2, offset: 2 },
    ];

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    for (var i = 0; i < attrs_per_inst.length; i++) {
      const name = attrs_per_inst[i].name;
      const length = attrs_per_inst[i].length;
      const offset = attrs_per_inst[i].offset;
      const attribLocation = gl.getAttribLocation(this.material.shaderProgram, name);
      gl.vertexAttribPointer(attribLocation, length, gl.FLOAT, false, ParticleSystem.STRIDE_INST * 4, offset * 4);
      gl.enableVertexAttribArray(attribLocation);
      gl.vertexAttribDivisor(attribLocation, 1);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const posLocation = gl.getAttribLocation(this.material.shaderProgram, "a_position");
    gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 2 * 4, 0);
    gl.enableVertexAttribArray(posLocation);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.elementBuffer);
  }
}