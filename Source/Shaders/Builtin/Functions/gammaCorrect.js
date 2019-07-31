//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "vec3 czm_gammaCorrect(vec3 color) {\n\
#ifdef HDR\n\
color = pow(color, vec3(czm_gamma));\n\
#endif\n\
return color;\n\
}\n\
vec4 czm_gammaCorrect(vec4 color) {\n\
#ifdef HDR\n\
color.rgb = pow(color.rgb, vec3(czm_gamma));\n\
#endif\n\
return color;\n\
}\n\
";
});