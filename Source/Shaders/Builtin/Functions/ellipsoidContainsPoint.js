//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "bool czm_ellipsoidContainsPoint(vec3 ellipsoid_inverseRadii, vec3 point)\n\
{\n\
vec3 scaled = ellipsoid_inverseRadii * (czm_inverseModelView * vec4(point, 1.0)).xyz;\n\
return (dot(scaled, scaled) <= 1.0);\n\
}\n\
";
});