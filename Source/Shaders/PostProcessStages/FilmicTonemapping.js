//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform sampler2D colorTexture;\n\
varying vec2 v_textureCoordinates;\n\
#ifdef AUTO_EXPOSURE\n\
uniform sampler2D autoExposure;\n\
#endif\n\
void main()\n\
{\n\
vec4 fragmentColor = texture2D(colorTexture, v_textureCoordinates);\n\
vec3 color = fragmentColor.rgb;\n\
#ifdef AUTO_EXPOSURE\n\
float exposure = texture2D(autoExposure, vec2(0.5)).r;\n\
color /= exposure;\n\
#endif\n\
const float A = 0.22;\n\
const float B = 0.30;\n\
const float C = 0.10;\n\
const float D = 0.20;\n\
const float E = 0.01;\n\
const float F = 0.30;\n\
const float white = 11.2;\n\
vec3 c = ((color * (A * color + C * B) + D * E) / (color * ( A * color + B) + D * F)) - E / F;\n\
float w = ((white * (A * white + C * B) + D * E) / (white * ( A * white + B) + D * F)) - E / F;\n\
c = czm_inverseGamma(c / w);\n\
gl_FragColor = vec4(c, fragmentColor.a);\n\
}\n\
";
});