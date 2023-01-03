import { Engine } from "../../engine/engine";
import { Material } from "../../engine/material";

export class ParticleMaterial extends Material {
  constructor(public readonly engine: Engine) {
    super(engine, 
      `#version 300 es
       precision lowp float;
       
       in vec2 a_position; 
       in vec2 a_pos;
       in vec2 a_vel;
       
       // uniforms automatically filled by engine, if present
       uniform float u_time; 
       uniform vec2 u_viewport;
       
       out vec2 v_uv;
   
       uniform sampler2D uSampler;
       
       void main() {
         float angle = atan(a_vel.y, a_vel.x) * 0.0;
         mat3 LcsToWcsMatrix = mat3(
           +cos(angle), +sin(angle),   0.0, //first column
           -sin(angle), +cos(angle),   0.0,
               a_pos.x,     a_pos.y,   1.0
         );
   
         // Scale position from [0, 1] to [0, sprite_width] and [0, sprite_height]
         vec2 texSize = vec2(textureSize(uSampler, 0));
         vec2 pos_Lcs = vec2(a_position.x * texSize.x,
                             a_position.y * texSize.y);
                             
         // Apply pixel offset to center the sprite relative to its reference point
         vec2 pixel_offset = vec2(4.0, 0.0);
         pos_Lcs -= pixel_offset;
       
         // Apply Lcs To Wcs matrix
         vec2 pos_Wcs = (LcsToWcsMatrix * vec3(pos_Lcs, 1.0)).xy;
   
         // Vcs coordinates are equal to Wcs coordinates: the view is fixed and centered on the origin, for now
         vec2 pos_Vcs = pos_Wcs;
   
         // Round to integer pixel
         pos_Vcs = floor(pos_Vcs);
   
         // Scale to homogeneous coordinates in the [-1, +1] range
         vec2 viewport_scale = vec2(1.0 / (u_viewport.x * 0.5), 1.0 / (u_viewport.y * 0.5));
         vec2 pos_Hcs = pos_Vcs * viewport_scale;
   
         gl_Position = vec4(pos_Hcs, 0.0, 1.0);
         
         v_uv = a_position;
       }
      `,
      `#version 300 es
       precision lowp float;

       in vec2 v_uv;
       out vec4 color;

       uniform sampler2D uSampler;

       void main() {
         color = texture(uSampler, v_uv);
       }
      `)
  }
}