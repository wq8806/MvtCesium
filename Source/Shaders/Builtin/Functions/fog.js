//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor)\n\
{\n\
float scalar = distanceToCamera * czm_fogDensity;\n\
float fog = 1.0 - exp(-(scalar * scalar));\n\
return mix(color, fogColor, fog);\n\
}\n\
vec3 czm_fog(float distanceToCamera, vec3 color, vec3 fogColor, float fogModifierConstant)\n\
{\n\
float scalar = distanceToCamera * czm_fogDensity;\n\
float fog = 1.0 - exp(-((fogModifierConstant * scalar + fogModifierConstant) * (scalar * (1.0 + fogModifierConstant))));\n\
return mix(color, fogColor, fog);\n\
}\n\
";
});