//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "attribute vec3 position;\n\
attribute vec2 st;\n\
uniform mat4 u_modelViewProjectionMatrix;\n\
uniform mat4 u_modelViewMatrix;\n\
uniform mat4 u_invWorldViewMatrix;\n\
uniform vec2 u_texCoordOffset;\n\
uniform vec2 u_texCoordScale;\n\
uniform float u_frameTime;\n\
uniform int u_clampToGroud;\n\
uniform vec3 u_camPos;\n\
uniform vec3 u_scale;\n\
varying vec3 eyeDir;\n\
varying vec2 texCoord;\n\
varying float myTime;\n\
varying vec4 projectionCoord;\n\
void main(void)\n\
{\n\
gl_Position = u_modelViewProjectionMatrix * vec4(position.xyz,1.0);\n\
if (u_clampToGroud == 1)\n\
{\n\
eyeDir = (u_camPos - position.xyz) * u_scale;\n\
}\n\
else {\n\
vec4 pos = u_modelViewMatrix * vec4(position.xyz,1.0);\n\
eyeDir = vec3(u_invWorldViewMatrix*vec4(pos.xyz,0.0));\n\
projectionCoord = gl_Position;\n\
}\n\
texCoord = (st+u_texCoordOffset)*u_texCoordScale;\n\
myTime = 0.01 * u_frameTime;\n\
}\n\
";
});