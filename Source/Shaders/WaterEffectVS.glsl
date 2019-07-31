//TS-GIS
attribute vec3 position;
attribute vec2 st;
uniform mat4 u_modelViewProjectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform mat4 u_invWorldViewMatrix;
uniform vec2 u_texCoordOffset;
uniform vec2 u_texCoordScale;
uniform float u_frameTime;
uniform int u_clampToGroud;
uniform vec3 u_camPos;
uniform vec3 u_scale;
varying vec3 eyeDir;
varying vec2 texCoord;
varying float myTime;
varying vec4 projectionCoord;
void main(void)
{
    //gl_Position = ftransform();
    gl_Position = u_modelViewProjectionMatrix * vec4(position.xyz,1.0);
    if (u_clampToGroud == 1)
    {
      eyeDir = (u_camPos - position.xyz) * u_scale;
    }
    else {
      vec4 pos = u_modelViewMatrix * vec4(position.xyz,1.0);
      eyeDir = vec3(u_invWorldViewMatrix*vec4(pos.xyz,0.0));
      projectionCoord = gl_Position;
    }
    texCoord = (st+u_texCoordOffset)*u_texCoordScale;
    myTime = 0.01 * u_frameTime;
}
