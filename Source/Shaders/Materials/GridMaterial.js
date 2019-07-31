//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#ifdef GL_OES_standard_derivatives\n\
#extension GL_OES_standard_derivatives : enable\n\
#endif\n\
uniform vec4 color;\n\
uniform float cellAlpha;\n\
uniform vec2 lineCount;\n\
uniform vec2 lineThickness;\n\
uniform vec2 lineOffset;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
vec2 st = materialInput.st;\n\
float scaledWidth = fract(lineCount.s * st.s - lineOffset.s);\n\
scaledWidth = abs(scaledWidth - floor(scaledWidth + 0.5));\n\
float scaledHeight = fract(lineCount.t * st.t - lineOffset.t);\n\
scaledHeight = abs(scaledHeight - floor(scaledHeight + 0.5));\n\
float value;\n\
#ifdef GL_OES_standard_derivatives\n\
const float fuzz = 1.2;\n\
vec2 thickness = (lineThickness * czm_resolutionScale) - 1.0;\n\
vec2 dx = abs(dFdx(st));\n\
vec2 dy = abs(dFdy(st));\n\
vec2 dF = vec2(max(dx.s, dy.s), max(dx.t, dy.t)) * lineCount;\n\
value = min(\n\
smoothstep(dF.s * thickness.s, dF.s * (fuzz + thickness.s), scaledWidth),\n\
smoothstep(dF.t * thickness.t, dF.t * (fuzz + thickness.t), scaledHeight));\n\
#else\n\
const float fuzz = 0.05;\n\
vec2 range = 0.5 - (lineThickness * 0.05);\n\
value = min(\n\
1.0 - smoothstep(range.s, range.s + fuzz, scaledWidth),\n\
1.0 - smoothstep(range.t, range.t + fuzz, scaledHeight));\n\
#endif\n\
float dRim = 1.0 - abs(dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC)));\n\
float sRim = smoothstep(0.8, 1.0, dRim);\n\
value *= (1.0 - sRim);\n\
vec4 halfColor;\n\
halfColor.rgb = color.rgb * 0.5;\n\
halfColor.a = color.a * (1.0 - ((1.0 - cellAlpha) * value));\n\
halfColor = czm_gammaCorrect(halfColor);\n\
material.diffuse = halfColor.rgb;\n\
material.emission = halfColor.rgb;\n\
material.alpha = halfColor.a;\n\
return material;\n\
}\n\
";
});