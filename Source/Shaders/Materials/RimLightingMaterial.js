//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "uniform vec4 color;\n\
uniform vec4 rimColor;\n\
uniform float width;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
float d = 1.0 - dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC));\n\
float s = smoothstep(1.0 - width, 1.0, d);\n\
vec4 outColor = czm_gammaCorrect(color);\n\
vec4 outRimColor = czm_gammaCorrect(rimColor);\n\
material.diffuse = outColor.rgb;\n\
material.emission = outRimColor.rgb * s;\n\
material.alpha = mix(outColor.a, outRimColor.a, s);\n\
return material;\n\
}\n\
";
});