//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_sampleOctahedralProjectionWithFiltering(sampler2D projectedMap, vec2 textureSize, vec3 direction, float lod)\n\
{\n\
direction /= dot(vec3(1.0), abs(direction));\n\
vec2 rev = abs(direction.zx) - vec2(1.0);\n\
vec2 neg = vec2(direction.x < 0.0 ? rev.x : -rev.x,\n\
direction.z < 0.0 ? rev.y : -rev.y);\n\
vec2 uv = direction.y < 0.0 ? neg : direction.xz;\n\
vec2 coord = 0.5 * uv + vec2(0.5);\n\
vec2 pixel = 1.0 / textureSize;\n\
if (lod > 0.0)\n\
{\n\
float scale = 1.0 / pow(2.0, lod);\n\
float offset = ((textureSize.y + 1.0) / textureSize.x);\n\
coord.x *= offset;\n\
coord *= scale;\n\
coord.x += offset + pixel.x;\n\
coord.y += (1.0 - (1.0 / pow(2.0, lod - 1.0))) + pixel.y * (lod - 1.0) * 2.0;\n\
}\n\
else\n\
{\n\
coord.x *= (textureSize.y / textureSize.x);\n\
}\n\
#ifndef OES_texture_float_linear\n\
vec3 color1 = texture2D(projectedMap, coord + vec2(0.0, pixel.y)).rgb;\n\
vec3 color2 = texture2D(projectedMap, coord + vec2(pixel.x, 0.0)).rgb;\n\
vec3 color3 = texture2D(projectedMap, coord + pixel).rgb;\n\
vec3 color4 = texture2D(projectedMap, coord).rgb;\n\
vec2 texturePosition = coord * textureSize;\n\
float fu = fract(texturePosition.x);\n\
float fv = fract(texturePosition.y);\n\
vec3 average1 = mix(color4, color2, fu);\n\
vec3 average2 = mix(color1, color3, fu);\n\
vec3 color = mix(average1, average2, fv);\n\
#else\n\
vec3 color = texture2D(projectedMap, coord).rgb;\n\
#endif\n\
return color;\n\
}\n\
vec3 czm_sampleOctahedralProjection(sampler2D projectedMap, vec2 textureSize, vec3 direction, float lod, float maxLod) {\n\
float currentLod = floor(lod + 0.5);\n\
float nextLod = min(currentLod + 1.0, maxLod);\n\
vec3 colorCurrentLod = czm_sampleOctahedralProjectionWithFiltering(projectedMap, textureSize, direction, currentLod);\n\
vec3 colorNextLod = czm_sampleOctahedralProjectionWithFiltering(projectedMap, textureSize, direction, nextLod);\n\
return mix(colorNextLod, colorCurrentLod, nextLod - lod);\n\
}\n\
";
});