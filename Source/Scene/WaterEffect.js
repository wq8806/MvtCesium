//TS-GIS
define(["../Core/BoundingSphere",
        "../Core/buildModuleUrl",
        "../Core/Cartesian2",
        "../Core/Cartesian3",
        "../Core/Cartesian4",
        "../Core/Cartographic",
        "../Core/defineProperties",
        "../Core/JulianDate",
        "../Core/Math",
        "../Core/Matrix3",
        "../Core/Matrix4",
        "../Core/Color",
        "../Core/PrimitiveType",
        "../Core/IndexDatatype",
        "../Core/ComponentDatatype",
        "../Core/defined",
        "../Core/Geometry",
        "../Core/GeometryAttribute",
        "../Core/GeometryAttributes",
        "../Core/GeometryInstance",
        "../Core/PolygonGeometry",
        "../Core/PolygonHierarchy",
        "../Core/PixelFormat",
        "../Core/Plane",
        "../Core/BoundingRectangle",
        "../Core/Intersect",
        "../Core/Quaternion",
        "../Core/Resource",
        "../Scene/Appearance",
        "../Scene/Camera",
        "../Scene/BlendingState",
        "../Scene/Primitive",
        "../Renderer/ShaderProgram",
        "../Renderer/Buffer",
        "../Renderer/BufferUsage",
        "../Renderer/DrawCommand",
        "../Renderer/Pass",
        "../Renderer/Renderbuffer",
        "../Renderer/RenderbufferFormat",
        "../Renderer/RenderState",
        "../Renderer/VertexArray",
        "../Renderer/ShaderSource",
        "../Renderer/Texture",
        "../Renderer/PixelDatatype",
        "../Renderer/Framebuffer",
        "../Renderer/PassState",
        "../Renderer/ClearCommand",
        "../Renderer/Sampler",
        "../Renderer/TextureMinificationFilter",
        "../Renderer/TextureMagnificationFilter",
        "../Renderer/TextureWrap",
        "../Shaders/WaterEffectFS",
        "../Shaders/WaterEffectVS",
        "../ThirdParty/when",
        "../Core/combine",
        '../Core/createGuid'],
    function (BoundingSphere, BuildModuleUrl, Cartesian2, Cartesian3, Cartesian4, Cartographic, defineProperties, JulianDate, CesiumMath, Matrix3, Matrix4,
              Color, PrimitiveType, IndexDatatype, ComponentDatatype, defined, Geometry, GeometryAttribute, GeometryAttributes, GeometryInstance, PolygonGeometry, PolygonHierarchy, PixelFormat, Plane, BoundingRectangle, Intersect, Quaternion, Resource, Appearance, Camera, BlendingState, Primitive, ShaderProgram, Buffer, BufferUsage, DrawCommand, Pass, Renderbuffer, RenderbufferFormat, RenderState, VertexArray, ShaderSource, Texture, PixelDatatype, Framebuffer, PassState, ClearCommand, Sampler, TextureMinificationFilter, TextureMagnificationFilter, TextureWrap, WaterEffectFS, WaterEffectVS, when,combine,createGuid) {
        "use strict";
        var waterColor = new Color(.439, .564, .788, 0), refractColor = new Color(0, 0, 0, 0);
        var watereffect = function (options) {
            var opts = options || {};
            this._scene = opts.scene;
            this._pointsToCartographic = [];
            this._waterColor = waterColor;
            this._refractColor = refractColor;
            this._reflectColor = waterColor;
            this._waveWidth = opts.waveWidth || 5;
            this._flowDirection = opts.flowDirection === undefined ? 90 : opts.flowDirection;
            this._flowSpeed = opts.flowSpeed == undefined ? 7 : opts.flowSpeed;
            this.m_spNormalTexture = null;
            this._m_startTime = 0;
            this._reflectCamera = null;
            this._reflectPassState = null;
            this._initialized = false;
            this._drawCommand = null;
            this._ready = false;

            this._id = opts.id === undefined ? createGuid(): opts.id;
        }
        defineProperties(watereffect.prototype, {
            geometry: {
                get: function () {
                    return this._waterPolygon
                },
                set: function (value) {
                    this._waterPolygon = value
                }
            },
            flowSpeed: {
                get: function () {
                    return this._flowSpeed
                },
                set: function (value) {
                    this._flowSpeed = value
                }
            },
            flowDirection: {
                get: function () {
                    return this._flowDirection
                },
                set: function (value) {
                    this._flowDirection = value
                }
            },
            waveWidth: {
                get: function () {
                    return this._waveWidth
                },
                set: function (value) {
                    this._waveWidth = value
                }
            },
            waterColor: {
                get: function () {
                    return this._waterColor
                },
                set: function (value) {
                    this._waterColor = value
                }
            },
            normalTexture: {
                get: function () {
                    return this._texture;
                },
                set: function (value) {
                    if (typeof  value === 'string') {
                        var that = this;
                        var resource = new Resource({url:value});
                        resource.fetchImage().then(function (img) {
                            createTexture.call(that, img);
                        })
                        /*  loadImage(BuildModuleUrl(value)).then(function (img) {
                              createTexture.call(that, img);
                          })*/
                    }
                    else if (value instanceof Image) {
                        createTexture.call(this, value);
                    }
                }
            }
        })
        watereffect.prototype.computeBoundingRectangle = function () {
            var positions = this._waterPolygon._polygonHierarchy.positions;
            var position = Cartographic.fromCartesian(positions[0]);
            var lonMin = CesiumMath.toDegrees(position.longitude);
            var latMin = CesiumMath.toDegrees(position.latitude);
            var longitude = CesiumMath.toDegrees(position.longitude);
            var latitude = CesiumMath.toDegrees(position.latitude);
            this._zFactor = position.height;
            for (var i = 0; i < positions.length; i++) {
                var d = Cartographic.fromCartesian(positions[i]);
                longitude = CesiumMath.toDegrees(d.longitude);
                latitude = CesiumMath.toDegrees(d.latitude);
                var IndexDatatype = new Cartesian2(longitude, latitude);
                this._pointsToCartographic.push(IndexDatatype);
                longitude > longitude && (longitude = longitude);
                longitude < lonMin && (lonMin = longitude);
                latitude > latitude && (latitude = latitude);
                latitude < latMin && (latMin = latitude);
            }
            this._lonMin = lonMin;
            this._latMin = latMin;
            this._waterCenterPos = new Cartesian3.fromDegrees((lonMin + longitude) / 2, (latitude + latMin) / 2, this._zFactor);
        }

        function loadImage(url) {
            var img = new Image();
            var deferred = when.defer();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                deferred.resolve(img);
            }
            img.src = url;
            return deferred.promise;
        }

        function createTexture(image) {
            var scene = this._scene;
            var context = scene._context;
            var width = 512, height = 512;
            this.m_spNormalTexture = new Texture({
                context: context,
                width: image.width,
                height: image.height,
                source: image,
                sampler: new Sampler({
                    wrapS: TextureWrap.REPEAT,
                    wrapT: TextureWrap.REPEAT
                })
            })
            if (defined(this._reflectCamera) || (this._reflectCamera = new Camera(scene)),
                !defined(this._reflectPassState)) {
                var framebuffer = new Framebuffer({
                    context: context,
                    colorTextures: [new Texture({
                        context: context,
                        width: 512,
                        height: 512,
                        pixelFormat: PixelFormat.RGBA
                    })],
                    depthRenderbuffer: new Renderbuffer({
                        context: context,
                        format: RenderbufferFormat.DEPTH_COMPONENT16,
                        width: 512,
                        height: 512
                    })
                });
                this._reflectPassState = new PassState(context);
                    this._reflectPassState.viewport = new BoundingRectangle(0, 0, 512, 512);
                    this._reflectPassState.framebuffer = framebuffer;
            }
            this.computeBoundingRectangle();
            this._ready = true;
        }

        watereffect.prototype.update = function (e, t) {
            if (!this._ready) {
                return;
            }
            var n = this._scene;
            var a = n._context;
            if(n.camera.workingFrustums.length != 0){
                this._fScale = 1 / (.001 * this._waveWidth);
                var l = Matrix4.IDENTITY,
                    h = new Cartesian3(this._waterCenterPos.x, this._waterCenterPos.y, this._waterCenterPos.z),
                    _ = Cartographic.fromCartesian(this._waterCenterPos),
                    v = CesiumMath.toDegrees(_.longitude),
                    y = CesiumMath.toDegrees(_.latitude),
                    b = Cartesian3.fromDegrees(v, y, 0),
                    w = b;
                Cartesian3.normalize(w, w);
                var S = new Cartesian3(0, 1, 0)
                    , T = new Cartesian3(0, 1, 0);
                T = Cartesian3.cross(S, w, T),
                    Cartesian3.normalize(T, T),
                    S = Cartesian3.cross(w, T, S);
                var E = new Matrix3();
                Matrix3.setRow(E, 0, T, E),
                    Matrix3.setRow(E, 1, S, E),
                    Matrix3.setRow(E, 2, w, E);
                var x = new Matrix3();
                x = Matrix3.transpose(E, x);
                var P = new Cartesian3()
                    , A = new Cartesian3(-h.x, -h.y, -h.z);
                Matrix3.multiplyByVector(E, A, P);
                l = new Matrix4(E[0], E[3], E[6], P.x, E[1], E[4], E[7], P.y, E[2], E[5], E[8], P.z, 0, 0, 0, 1);
                this.invWorldViewMatrix = new Matrix4();
                Matrix4.multiply(l, e.camera.inverseViewMatrix, this.invWorldViewMatrix);
                this.modelMatrix = new Matrix4(1, 0, 0, h.x, 0, 1, 0, h.y, 0, 0, 1, h.z, 0, 0, 0, 1);
                this.modelViewMatrix = new Matrix4();
                this.modeiViewProjection = new Matrix4();
                this.modelViewMatrix = Matrix4.multiply(e.camera.viewMatrix, this.modelMatrix, this.modelViewMatrix);
                this.modeiViewProjection = Matrix4.multiply(e.camera.workingFrustums[0].projectionMatrix, this.modelViewMatrix, this.modeiViewProjection);
                defined(t) || (t = JulianDate.now()),
                0 == this._m_startTime && (this._m_startTime = t.secondsOfDay);
                var D = t.secondsOfDay;
                if (this._fElapse = (D - this._m_startTime) / 1,
                    this._frameTime = this._fElapse * this._flowSpeed,
                    this._flowAngle = this._flowDirection * Math.PI / 180,
                void 0 == this._drawCommand) {
                    var I = ShaderProgram.fromCache({
                        context: a,
                        vertexShaderSource: WaterEffectVS,
                        fragmentShaderSource: WaterEffectFS
                    })
                        , O = RenderState.fromCache({
                        depthTest: {
                            enabled: !0
                        }
                    })
                        , M = this;
                    this._uniformMap = {
                        u_bgColor: function () {
                            return M._waterColor
                        },
                        u_texCoordOffset: function () {
                            return new Cartesian2(-M._lonMin, -M._latMin)
                        },
                        u_texCoordScale: function () {
                            return new Cartesian2(M._fScale, M._fScale)
                        },
                        u_scale: function () {
                            return new Cartesian3(3, 3, 3)
                        },
                        u_camPos: function () {
                            return new Cartesian3(3, 3, 3)
                        },
                        u_modelViewProjectionMatrix: function () {
                            return M.modeiViewProjection
                        },
                        u_modelViewMatrix: function () {
                            return M.modelViewMatrix
                        },
                        u_clampToGroud: function () {
                            return 0
                        },
                        u_invWorldViewMatrix: function () {
                            return M.invWorldViewMatrix
                        },
                        u_frameTime: function () {
                            return M._frameTime
                        },
                        u_normalMap: function () {
                            return M.m_spNormalTexture
                        },
                        u_refractMap: function () {
                            return M.m_spNormalTexture
                        },
                        u_useRefractTex: function () {
                            return 0
                        },
                        u_reflectMap: function () {
                            return M._reflectPassState.framebuffer.getColorTexture(0)
                        },
                        u_reflection: function () {
                            return 1
                        },
                        u_waterColor: function () {
                            return M._waterColor
                        },
                        u_refractColor: function () {
                            return M._refractColor
                        },
                        u_reflectColor: function () {
                            return M._reflectColor
                        },
                        u_flowDir: function () {
                            return new Cartesian2(.5 * Math.sin(M._flowAngle) + .5, .5 * Math.cos(M._flowAngle) + .5)
                        }
                    };
                    this._waterGeometry = PolygonGeometry.createGeometry(this._waterPolygon);
                    if (!this._waterGeometry)
                        return;
                    for (var F = this._waterGeometry.indices, U = this._waterGeometry.attributes.position.values, G = 0; G < U.length; G++)
                        G % 3 == 0 && (U[G] = U[G] - h.x),
                        G % 3 == 1 && (U[G] = U[G] - h.y),
                        G % 3 == 2 && (U[G] = U[G] - h.z);
                    for (var W = [], G = 0; G < this._pointsToCartographic.length; G++)
                        W.push(this._pointsToCartographic[G].x, this._pointsToCartographic[G].y);
                    var H = new Float64Array(W)
                        , j = Buffer.createIndexBuffer({
                        context: a,
                        typedArray: new Uint32Array(F),
                        usage: BufferUsage.STATIC_DRAW,
                        indexDatatype: IndexDatatype.UNSIGNED_INT
                    })
                        , q = Buffer.createVertexBuffer({
                        context: a,
                        typedArray: ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, U),
                        usage: BufferUsage.STATIC_DRAW
                    })
                        , Y = Buffer.createVertexBuffer({
                        context: a,
                        typedArray: ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, H),
                        usage: BufferUsage.STATIC_DRAW
                    })
                        , X = [];
                    X.push({
                        index: 0,
                        vertexBuffer: q,
                        componentDatatype: ComponentDatatype.FLOAT,
                        componentsPerAttribute: 3,
                        normalize: !1
                    }),
                        X.push({
                            index: 1,
                            vertexBuffer: Y,
                            componentDatatype: ComponentDatatype.FLOAT,
                            componentsPerAttribute: 2,
                            normalize: !1
                        });
                    var Q = new VertexArray({
                        context: a,
                        attributes: X,
                        indexBuffer: j
                    });
                    var pickId = a.createPickId({
                        primitive : this,
                        id : this._id
                    });
                    var pickUniforms = {
                        czm_pickColor : createPickColorFunction(pickId.color)
                    };
                    var pickSP = ShaderProgram.fromCache({
                        context: a,
                        vertexShaderSource: WaterEffectVS,
                        fragmentShaderSource: WaterEffectFS.replace("gl_FragColor = vec4(mix(base, envColor, myangle*transp), 1.0)","gl_FragColor = czm_pickColor;")
                    })
                    this._uniformMap = combine(this._uniformMap, pickUniforms);
                    this._drawCommand = new DrawCommand({
                        boundingVolume: this._waterGeometry.boundingSphere,
                        primitiveType: PrimitiveType.TRIANGLES,
                        vertexArray: Q,
                        shaderProgram: I,
                        castShadows: !1,
                        receiveShadows: !1,
                        uniformMap: this._uniformMap,
                        renderState: O,
                        pass: Pass.OPAQUE
                    });
                    this._pickCommand = new DrawCommand({
                        boundingVolume: this._waterGeometry.boundingSphere,
                        primitiveType: PrimitiveType.TRIANGLES,
                        vertexArray: Q,
                        shaderProgram: pickSP,
                        castShadows: !1,
                        receiveShadows: !1,
                        uniformMap: this._uniformMap,
                        renderState: O,
                        pass: Pass.OPAQUE
                    });
                }
                e.water.push(this)
            }
        }

        watereffect.prototype.updateReflectTexture = function (scene) {
            if(scene.camera.workingFrustums.length != 0){
                var scene = this._scene;
                var context = scene._context;
                this.modelViewMatrix = Matrix4.multiply(scene.camera.viewMatrix, this.modelMatrix, this.modelViewMatrix),
                    this.modeiViewProjection = Matrix4.multiply(scene.camera.workingFrustums[0].projectionMatrix, this.modelViewMatrix, this.modeiViewProjection);
                var centerPos = new Cartesian3(this._waterCenterPos.x, this._waterCenterPos.y, this._waterCenterPos.z)
                    , o = new Cartesian3(centerPos.x, centerPos.y, centerPos.z);
                Cartesian3.normalize(o, o);
                var a = new Plane.fromPointNormal(centerPos, o)
                    , s = new Cartesian3(o.x, o.y, o.z)
                    , l = -Cartesian3.dot(o, centerPos)
                    ,
                    u = new Matrix4(-2 * s.x * s.x + 1, -2 * s.x * s.y, -2 * s.x * s.z, -2 * s.x * l, -2 * s.y * s.x, -2 * s.y * s.y + 1, -2 * s.y * s.z, -2 * s.y * l, -2 * s.z * s.x, -2 * s.z * s.y, -2 * s.z * s.z + 1, -2 * s.z * l, 0, 0, 0, 1)
                    , c = new Cartesian3();
                Cartesian3.clone(scene.camera.direction, c);
                var p = new Cartesian3()
                    , f = new Cartesian3();
                Cartesian3.multiplyByScalar(s, 2 * Cartesian3.dot(c, s), f),
                    Cartesian3.subtract(c, f, p),
                    Cartesian3.normalize(p, p);
                var m = new Cartesian3();
                Cartesian3.clone(scene.camera.up, m);
                var g = new Cartesian3()
                    , _ = new Cartesian3()
                    , v = Cartesian3.dot(m, s);
                Cartesian3.multiplyByScalar(s, 2 * v, _),
                    Cartesian3.add(m, _, g),
                    Cartesian3.normalize(g, g);
                var y = new Cartesian3(-g.x, -g.y, -g.z)
                    , b = new Cartesian3();
                Cartesian3.clone(scene.camera.position, b);
                var position = new Cartesian3(u[0] * b.x + u[4] * b.y + u[8] * b.z + u[12], u[1] * b.x + u[5] * b.y + u[9] * b.z + u[13], u[2] * b.x + u[6] * b.y + u[10] * b.z + u[14])
                    , w = new Matrix4();
                scene.camera.frustum.far = 1e8,
                    Matrix4.clone(scene.camera.frustum.projectionMatrix, w),
                    this._reflectCamera.direction = p,
                v < .5 && (this._reflectCamera.up = y),
                v >= .5 && (this._reflectCamera.up = g),
                    this._reflectCamera.position = position;
                var viewMatrix = new Matrix4();
                Matrix4.inverse(this._reflectCamera.viewMatrix, viewMatrix),
                    Matrix4.transpose(viewMatrix, viewMatrix);
                var E = new Cartesian4(a.normal.x, a.normal.y, a.normal.z, -Cartesian3.dot(o, centerPos));
                Matrix4.multiplyByVector(viewMatrix, E, E);
                var x = E.w / Math.sqrt(E.x * E.x + E.y * E.y + E.z * E.z)
                    , P = new Cartesian3(E.x, E.y, E.z);
                Cartesian3.normalize(P, P);
                var A = new Cartesian3(P.x, P.y, P.z)
                    , quaternion = new Cartesian4();
                quaternion.x = (Math.asin(A.x) + w[8]) / w[0],
                    quaternion.y = (Math.asin(A.y) + w[9]) / w[5],
                    quaternion.z = -1,
                    quaternion.w = (1 + w[10]) / w[14];
                quaternion.w = (1 + w[10]) / w[14];
                var left = new Cartesian4(A.x, A.y, A.z, x)
                    , right = new Cartesian4();
                Cartesian4.multiplyByScalar(left, 2 / Cartesian4.dot(left, quaternion), right),
                    w[2] = right.x,
                    w[6] = right.y,
                    w[10] = right.z + 1,
                    w[14] = right.w,
                    Matrix4.clone(w, this._reflectCamera.frustum.projectionMatrix);
                var clearCommand = new ClearCommand({
                    color: Color.fromBytes(14, 33, 60, 255),
                    depth: 1,
                    framebuffer: this._reflectPassState.framebuffer
                });
                clearCommand.execute(context, this._reflectPassState),
                    this._scene.renderColorTexture(clearCommand, this._reflectPassState, this._reflectCamera)
            }
        }

        watereffect.prototype.execute = function (context, passState) {
            if(this.m_spNormalTexture !== undefined){
                context.draw(this._drawCommand, passState)
            }
        }
        watereffect.prototype.executePick = function (context, passState) {
            context.draw(this._pickCommand, passState)
        }
        watereffect.prototype.isDestroyed = function () {
            return false;
        }
        watereffect.prototype.destroy = function () {
            if (!!this.m_spNormalTexture) {
                this.m_spNormalTexture = null;
            }
        }
        function createPickColorFunction(color) {
            return function() {
                return color;
            };
        }
        return watereffect;
    })
