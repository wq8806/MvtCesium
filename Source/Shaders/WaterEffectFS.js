//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D u_normalMap;\n\
uniform sampler2D u_refractMap;\n\
uniform sampler2D u_reflectMap;\n\
uniform vec4 u_waterColor;\n\
uniform vec4 u_refractColor;\n\
uniform int u_useRefractTex;\n\
uniform vec4 u_reflectColor;\n\
uniform int u_reflection;\n\
uniform vec2 u_flowDir;\n\
varying vec3 eyeDir;\n\
varying vec2 texCoord;\n\
varying float myTime;\n\
varying vec4 projectionCoord;\n\
uniform vec4 czm_pickColor;\n\
void main (void)\n\
{\n\
float texScale = 35.0;\n\
float texScale2 = 10.0;\n\
float myangle;\n\
float transp;\n\
vec3 myNormal;\n\
vec2 mytexFlowCoord = texCoord * texScale;\n\
vec2 ff = abs(2.0*(fract(mytexFlowCoord)) - 1.0) -0.5;\n\
ff = 0.5-4.0*ff*ff*ff;\n\
vec2 ffscale = sqrt(ff*ff + (1.0-ff)*(1.0-ff));\n\
vec2 Tcoord = texCoord  * texScale2;\n\
vec2 offset = vec2(myTime,0.0);\n\
vec3 sample = vec3(u_flowDir, 1.0);\n\
vec2 flowdir = sample.xy -0.5;\n\
flowdir *= sample.b;\n\
mat2 rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);\n\
vec2 NormalT0 = texture2D(u_normalMap, rotmat * Tcoord - offset).rg;\n\
sample = vec3(u_flowDir, 1.0);\n\
flowdir = sample.b * (sample.xy - 0.5);\n\
rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);\n\
vec2 NormalT1 = texture2D(u_normalMap, rotmat * Tcoord - offset*1.06+0.62).rg;\n\
vec2 NormalTAB = ff.x * NormalT0 + (1.0-ff.x) * NormalT1;\n\
sample = vec3(u_flowDir, 1.0);\n\
flowdir = sample.b * (sample.xy - 0.5);\n\
rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);\n\
NormalT0 = texture2D(u_normalMap, rotmat * Tcoord - offset*1.33+0.27).rg;\n\
sample = vec3(u_flowDir, 1.0);\n\
flowdir = sample.b * (sample.xy - 0.5);\n\
rotmat = mat2(flowdir.x, -flowdir.y, flowdir.y ,flowdir.x);\n\
NormalT1 = texture2D(u_normalMap, rotmat * Tcoord - offset*1.24).rg ;\n\
vec2 NormalTCD = ff.x * NormalT0 + (1.0-ff.x) * NormalT1;\n\
vec2 NormalT = ff.y * NormalTAB + (1.0-ff.y) * NormalTCD;\n\
NormalT = (NormalT - 0.5) / (ffscale.y * ffscale.x);\n\
NormalT *= 0.3;\n\
transp = 1.0;\n\
NormalT *= transp*transp;\n\
myNormal = vec3(NormalT,sqrt(1.0-NormalT.x*NormalT.x - NormalT.y*NormalT.y));\n\
vec3 envColor = u_reflectColor.rgb;\n\
if (u_reflection == 1)    {\n\
vec2 final = projectionCoord.xy / projectionCoord.w;\n\
final = final * 0.5 + 0.5;\n\
final.y = 1.0 - final.y;\n\
envColor = texture2D(u_reflectMap, final + myNormal.xy/texScale2*transp).rgb;\n\
}\n\
myangle = dot(myNormal,normalize(eyeDir));\n\
myangle = 0.95-0.6*myangle*myangle;\n\
vec3 base = u_refractColor.rgb;\n\
if (u_useRefractTex == 1)\n\
base = texture2D(u_refractMap,(texCoord + myNormal.xy/texScale2*0.03*transp)*32.0).rgb;\n\
base = mix(base, u_waterColor.rgb, u_waterColor.a);\n\
gl_FragColor = vec4(mix(base, envColor, myangle*transp), 1.0);\n\
}\n\
";
});