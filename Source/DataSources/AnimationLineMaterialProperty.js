//TS-GIS
define(['../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/Event',
    './createPropertyDescriptor',
    './Property',
    '../Scene/Material',
    '../Core/Cartesian2'
], function (Color,
             defaultValue,
             defined,
             defineProperties,
             Event,
             createPropertyDescriptor,
             Property,
             Material,
             Cartesian2) {
    'use strict';
    var defaultColor = new Color(0, 0, 0, 0);

    function AnimationLineMaterialProperty(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this._definitionChanged = new Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.color = options.color || defaultColor;
        this._duration = options.duration || 1e3;
        var result = AnimationLineMaterialProperty.getImageMaterial(options.url, options.repeat);
        this._materialType = result.type;
        this._materialImage = result.image;
        this._time = undefined;
    }

    defineProperties(AnimationLineMaterialProperty.prototype, {
        isConstant: {
            get: function () {
                return !1;
            }
        },
        definitionChanged: {
            get: function () {
                return this._definitionChanged;
            }
        },
        color: createPropertyDescriptor('color')
    });

    AnimationLineMaterialProperty.prototype.getType = function (time) {
        return this._materialType;
    };

    AnimationLineMaterialProperty.prototype.getValue = function (time, result) {
        if (!defined(result)) {
            result = {};
        }
        result.color = Property.getValueOrClonedDefault(this._color, time, defaultColor, result.color);
        result.image = this._materialImage;
        this._time = this._time === undefined ? time.secondsOfDay : this._time;
        result.time = 1e3 * (time.secondsOfDay - this._time) / this._duration;
        return result;
    };

    AnimationLineMaterialProperty.prototype.equals = function (other) {
        return this === other || //
            (other instanceof AnimationLineMaterialProperty &&
                Property.equals(this._color, other._color)
            );
    };

    var g = 0;
    AnimationLineMaterialProperty.getImageMaterial = function (url, repeat) {
        g++;
        var i = "AnimationLine" + g + "Type";
        var n = "AnimationLine" + g + "Image";
        Material[i] = i;
        Material[n] = url;
        Material._materialCache.addMaterial(Material[i], {
            fabric: {
                type: Material.PolylineArrowLinkType,
                uniforms: {
                    color: new Color(1, 0, 0, 1),
                    image: Material[n],
                    time: 0,
                    repeat: repeat || new Cartesian2(1, 1)
                },
                source: "czm_material czm_getMaterial(czm_materialInput materialInput)" +
                "  {" +
                " czm_material material = czm_getDefaultMaterial(materialInput);" +
                "                           vec2 st = repeat * materialInput.st;" +
                "                           vec4 colorImage = texture2D(image, vec2(fract(st.s - time), st.t));" +
                "                            if(color.a == 0.0)" +
                "                            {" +
                "                                material.alpha = colorImage.a;" +
                "                                material.diffuse = colorImage.rgb; " +
                "                            }" +
                "                            else" +
                "                            {" +
                "                                material.alpha = colorImage.a * color.a;" +
                "                                material.diffuse = max(color.rgb * material.alpha * 3.0, color.rgb); " +
                "                            }" +
                "                            return material;" +
                "                        }"
            },
            translucent: function () {
                return !0
            }
        });
        return {
            type: Material[i],
            image: Material[n]
        }
    }

    return AnimationLineMaterialProperty;
})