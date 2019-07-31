//TS-GIS
define([
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeographicTilingScheme',
        '../Core/Rectangle',
        '../Core/TileProviderError',
        '../Core/WebMercatorProjection',
        '../Core/WebMercatorTilingScheme',
        '../Core/Cartesian2',
        '../Core/Cartographic',
        '../Core/Cartesian3',
        '../ThirdParty/heatmap',
        './ImageryState',
        './QuadtreeTileLoadState',
        '../ThirdParty/when'
    ], function(
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        GeographicTilingScheme,
        Rectangle,
        TileProviderError,
        WebMercatorProjection,
        WebMercatorTilingScheme,
        Cartesian2,
        Cartographic,
        Cartesian3,
        h337,
        ImageryState,
        QuadtreeTileLoadState,
        when) {
    "use strict";

    /**
     * Provides a single, top-level imagery tile.  The single image is assumed to use a
     * {@link GeographicTilingScheme}.

     *
     * @alias HeatmapImageryProvider
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Object} [options.heatmapoptions] Optional heatmap.js options to be used (see http://www.patrick-wied.at/static/heatmapjs/docs.html#h337-create).
     * @param {Object} [options.bounds] The bounding box for the heatmap in WGS84 coordinates.
     * @param {Number} [options.bounds.north] The northernmost point of the heatmap.
     * @param {Number} [options.bounds.south] The southernmost point of the heatmap.
     * @param {Number} [options.bounds.west] The westernmost point of the heatmap.
     * @param {Number} [options.bounds.east] The easternmost point of the heatmap.
     * @param {Object} [options.data] Data to be used for the heatmap.
     * @param {Object} [options.data.min] Minimum allowed point value.
     * @param {Object} [options.data.max] Maximum allowed point value.
     * @param {Array} [options.data.points] The data points for the heatmap containing x=lon, y=lat and value=number.
     *
     * @see HeatmapImageryProvider
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     */
    var HeatmapImageryProvider = function(options){
        this._options = defaultValue(options.heatmapoptions, {});
        this._container = this._getContainer(10, 10,'heatmapdiv');
        this._options.container = this._container;
        this._heatmap = h337.create(this._options);
        this._canvas = this._container.children[0];

        this._currentData = {
            min:0,
            max:0,
            points:[]
        };

        this._wmp = new WebMercatorProjection();
        this._image = this._canvas;
        this._texture = undefined;
        this._ready = false;

    }



    defineProperties(HeatmapImageryProvider.prototype, {

        /**
         * Gets or sets the image of this tile
         * @memberof SingleTileImageryProvider.prototype
         * @type {String|Canvas|Image}
         * @readonly
         */
        image : {
            get : function() {
                return this._image;
            },
            set : function(value) {
                if (this._image !== value) {
                    this._image = value;
                    this.reload();
                }
            }
        },
        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileWidth : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tileWidth must not be called before the imagery provider is ready.');
                }

                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        tileHeight: {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tileHeight must not be called before the imagery provider is ready.');
                }

                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested.  This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        maximumLevel : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('maximumLevel must not be called before the imagery provider is ready.');
                }

                return 0;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Number}
         * @readonly
         */
        minimumLevel : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('minimumLevel must not be called before the imagery provider is ready.');
                }

                return 0;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tilingScheme must not be called before the imagery provider is ready.');
                }

                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : function() {
                return this._tilingScheme.rectangle;//TODO: change to custom rectangle?
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         */
        tileDiscardPolicy : {
            get : function() {
                if (!this._ready) {
                    throw new DeveloperError('tileDiscardPolicy must not be called before the imagery provider is ready.');
                }

                return undefined;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return this._ready;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link HeatmapImageryProvider#ready} returns true.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Credit}
         * @readonly
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof HeatmapImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        }
    });

    HeatmapImageryProvider.prototype._setWidthAndHeight = function(mbb) {
        var maxCanvasSize = 2000;
        var minCanvasSize = 700;
        this.width = ((mbb.east > 0 && mbb.west < 0) ? mbb.east + Math.abs(mbb.west) : Math.abs(mbb.east - mbb.west));
        this.height = ((mbb.north > 0 && mbb.south < 0) ? mbb.north + Math.abs(mbb.south) : Math.abs(mbb.north - mbb.south));
        this._factor = 1;

        if (this.width > this.height && this.width > maxCanvasSize) {
            this._factor = this.width / maxCanvasSize;

            if (this.height / this._factor < minCanvasSize) {
                this._factor = this.height / minCanvasSize;
            }
        } else if (this.height > this.width && this.height > maxCanvasSize) {
            this._factor = this.height / maxCanvasSize;

            if (this.width / this._factor < minCanvasSize) {
                this._factor = this.width / minCanvasSize;
            }
        } else if (this.width < this.height && this.width < minCanvasSize) {
            this._factor = this.width / minCanvasSize;

            if (this.height / this._factor > maxCanvasSize) {
                this._factor = this.height / maxCanvasSize;
            }
        } else if (this.height < this.width && this.height < minCanvasSize) {
            this._factor = this.height / minCanvasSize;

            if (this.width / this._factor > maxCanvasSize) {
                this._factor = this.width / maxCanvasSize;
            }
        }

        this.width = this.width / this._factor;
        this.height = this.height / this._factor;
    };

    HeatmapImageryProvider.prototype._getContainer = function(width, height, id) {
        //var c = document.createElement("div");
        this._heatmapdiv = document.createElement("div");
        if (id) { this._heatmapdiv.setAttribute("id", id); }
        this._heatmapdiv.setAttribute("style", "width: " + width + "px; height: " + width + "px; margin: 0px; display: none;");
        document.body.appendChild(this._heatmapdiv);
        return this._heatmapdiv;
    };

    /**
     * Convert a WGS84 location into a Mercator location.
     *
     * @param {Object} point The WGS84 location.
     * @param {Number} [point.x] The longitude of the location.
     * @param {Number} [point.y] The latitude of the location.
     * @returns {Cesium.Cartesian3} The Mercator location.
     */
    HeatmapImageryProvider.prototype.wgs84ToMercator = function(point) {
        return this._wmp.project(Cartographic.fromDegrees(point.x, point.y));
    };

    /**
     * Convert a WGS84 bounding box into a Mercator bounding box.
     *
     * @param {Object} bounds The WGS84 bounding box.
     * @param {Number} [bounds.north] The northernmost position.
     * @param {Number} [bounds.south] The southrnmost position.
     * @param {Number} [bounds.east] The easternmost position.
     * @param {Number} [bounds.west] The westernmost position.
     * @returns {Object} The Mercator bounding box containing north, south, east and west properties.
     */
    HeatmapImageryProvider.prototype.wgs84ToMercatorBB = function(bounds) {
        var ne = this._wmp.project(Cartographic.fromDegrees(bounds.east, bounds.north));
        var sw = this._wmp.project(Cartographic.fromDegrees(bounds.west, bounds.south));
        return {
            north: ne.y,
            south: sw.y,
            east: ne.x,
            west: sw.x
        };
    };

    /**
     * Convert a mercator location into a WGS84 location.
     *
     * @param {Object} point The Mercator lcation.
     * @param {Number} [point.x] The x of the location.
     * @param {Number} [point.y] The y of the location.
     * @returns {Object} The WGS84 location.
     */
    HeatmapImageryProvider.prototype.mercatorToWgs84 = function(p) {
        var wp = this._wmp.unproject(new Cartesian3(p.x, p.y));
        return {
            x: wp.longitude,
            y: wp.latitude
        };
    };

    /**
     * Convert a Mercator bounding box into a WGS84 bounding box.
     *
     * @param {Object} bounds The Mercator bounding box.
     * @param {Number} [bounds.north] The northernmost position.
     * @param {Number} [bounds.south] The southrnmost position.
     * @param {Number} [bounds.east] The easternmost position.
     * @param {Number} [bounds.west] The westernmost position.
     * @returns {Object} The WGS84 bounding box containing north, south, east and west properties.
     */
    HeatmapImageryProvider.prototype.mercatorToWgs84BB = function(bounds) {
        var sw = this._wmp.unproject(new Cartesian3(bounds.west, bounds.south));
        var ne = this._wmp.unproject(new Cartesian3(bounds.east, bounds.north));
        return {
            north: this.rad2deg(ne.latitude),
            east: this.rad2deg(ne.longitude),
            south: this.rad2deg(sw.latitude),
            west: this.rad2deg(sw.longitude)
        };
    };

    /**
     * Convert degrees into radians.
     *
     * @param {Number} degrees The degrees to be converted to radians.
     * @returns {Number} The converted radians.
     */
    HeatmapImageryProvider.prototype.deg2rad = function(degrees) {
        return (degrees * (Math.PI / 180.0));
    };

    /**
     * Convert radians into degrees.
     *
     * @param {Number} radians The radians to be converted to degrees.
     * @returns {Number} The converted degrees.
     */
    HeatmapImageryProvider.prototype.rad2deg = function(radians) {
        return (radians / (Math.PI / 180.0));
    };

    /**
     * Convert a WGS84 location to the corresponding heatmap location.
     *
     * @param {Object} point The WGS84 location.
     * @param {Number} [point.x] The longitude of the location.
     * @param {Number} [point.y] The latitude of the location.
     * @returns {Object} The corresponding heatmap location.
     */
    HeatmapImageryProvider.prototype.wgs84PointToHeatmapPoint = function(point) {
        return this.mercatorPointToHeatmapPoint(this.wgs84ToMercator(point));
    };

    /**
     * Convert a mercator location to the corresponding heatmap location.
     *
     * @param {Object} point The Mercator lcation.
     * @param {Number} [point.x] The x of the location.
     * @param {Number} [point.y] The y of the location.
     * @returns {Object} The corresponding heatmap location.
     */
    HeatmapImageryProvider.prototype.mercatorPointToHeatmapPoint = function(point) {
        var pn = {};

        pn.x = Math.round((point.x - this._xoffset) / this._factor + this._spacing);
        pn.y = Math.round((point.y - this._yoffset) / this._factor + this._spacing);
        pn.y = this.height - pn.y;

        return pn;
    };

    /**
     * Set an array of heatmap locations.
     *
     * @param {Number} min The minimum allowed value for the data points.
     * @param {Number} max The maximum allowed value for the data points.
     * @param {Array} data An array of data points with heatmap coordinates(x, y) and value
     * @returns {Boolean} Wheter or not the data was successfully added or failed.
     */
    HeatmapImageryProvider.prototype.setData = function(min, max, data) {
        if (data && data.length > 0 && min !== null && min !== false && max !== null && max !== false) {
            this._heatmap.setData({
                min: min,
                max: max,
                data: data
            });

            return true;
        }

        return false;
    };

    /**
     * Set an array of WGS84 locations.
     *
     * @param {Number} min The minimum allowed value for the data points.
     * @param {Number} max The maximum allowed value for the data points.
     * @param {Array} data An array of data points with WGS84 coordinates(x=lon, y=lat) and value
     * @returns {Boolean} Wheter or not the data was successfully added or failed.
     */
    HeatmapImageryProvider.prototype.setWGS84Data = function(min, max, data) {
        if (data && data.length > 0 && min !== null && min !== false && max !== null && max !== false) {
            var convdata = [];

            for (var i = 0; i < data.length; i++) {
                var gp = data[i];

                var hp = this.wgs84PointToHeatmapPoint(gp);
                if (gp.value || gp.value === 0) { hp.value = gp.value; }

                convdata.push(hp);
            }

            return this.setData(min, max, convdata);
        }

        return false;
    };

    HeatmapImageryProvider.prototype.updataWGS84Data = function () {
        var bounds = computeBoundsFromData(this._currentData);
        this._mbounds = this.wgs84ToMercatorBB(bounds);

        this._setWidthAndHeight(this._mbounds);
        this._options.radius = Math.round(defaultValue(this._options.radius, ((this.width > this.height) ? this.width / 60 : this.height / 60)));

        this._spacing = this._options.radius * 1.5;
        this._xoffset = this._mbounds.west;
        this._yoffset = this._mbounds.south;

        this.width = Math.round(this.width + this._spacing * 2);
        this.height = Math.round(this.height + this._spacing * 2);

        this._mbounds.west -= this._spacing * this._factor;
        this._mbounds.east += this._spacing * this._factor;
        this._mbounds.south -= this._spacing * this._factor;
        this._mbounds.north += this._spacing * this._factor;

        this.bounds = this.mercatorToWgs84BB(this._mbounds);

        this._tilingScheme = new WebMercatorTilingScheme({
            rectangleSouthwestInMeters: new Cartesian2(this._mbounds.west, this._mbounds.south),
            rectangleNortheastInMeters: new Cartesian2(this._mbounds.east, this._mbounds.north)
        });

        //this._heatmapdiv = document.getElementById("heatmapdiv");
        this._heatmapdiv.setAttribute("style", "width: " + this.width + "px; height: " + this.height +"px; margin: 0px; display: none;");


        this._heatmap.configure({
            width:this.width,
            height:this.height
        });

        if (this._currentData.points.length > 0) {
            this._ready = this.setWGS84Data(this._currentData.min, this._currentData.max, this._currentData.points);
        }
    }

    HeatmapImageryProvider.prototype.addData = function (heat) {
        if (!defined(heat.x) || !defined(heat.y) || !defined(heat.value)) {
            throw new DeveloperError('heat.x, heat.y and heat.value are required.');
        }
        this._currentData = this._addHeat(heat);
        this.updataWGS84Data();
        this.reload();
    }

    HeatmapImageryProvider.prototype.addDatas = function(data){
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        } else if (!defined(data.min) || !defined(data.max) || !defined(data.points)) {
            throw new DeveloperError('options.bounds.north, bounds.south, bounds.east and bounds.west are required.');
        }
        this._currentData = this._pushCurrentData(data);
        this.updataWGS84Data();
        this.reload();
    }

    HeatmapImageryProvider.prototype._addHeat = function(heat){
        this._currentData.min = this._currentData.min < heat.value ? this._currentData.min : heat.value;
        this._currentData.max = this._currentData.max > heat.value ? this._currentData.max : heat.value;
        this._currentData.points.push(heat);
        return this._currentData;
    }

    HeatmapImageryProvider.prototype._pushCurrentData = function(data){
        this._currentData.min = this._currentData.min < data.min ? this._currentData.min : data.min;
        this._currentData.max = this._currentData.max > data.max ? this._currentData.max : data.max;
        for(var i = 0;i< data.points.length; i++){
            this._currentData.points.push(data.points[i]);
        }
        return this._currentData;
    }

    HeatmapImageryProvider.prototype.getHeatData = function () {
        return this._currentData;
    }

    HeatmapImageryProvider.prototype.clearData = function () {
        this._currentData = {
            min:0,
            max:0,
            points:[]
        };
        this._heatmap.setData({
            max:0,
            min:0,
            data:[]
        });
        this.reload();
    }

    function computeBoundsFromData(data){
        var points = data.points;
        var longitudeArr = [];
        var latitudeArr = [];
        for(var i=0;i< points.length;i++){
            longitudeArr.push(points[i].x);
            latitudeArr.push(points[i].y);
        }
        var bounds = {
            west: 0,
            east: 0,
            south: 0,
            north: 0
        }
        bounds.west = Math.min.apply(null, longitudeArr);
        bounds.east = Math.max.apply(null, longitudeArr);
        bounds.south = Math.min.apply(null, latitudeArr);
        bounds.north = Math.max.apply(null, latitudeArr);
        return bounds;
    }

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    HeatmapImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link HeatmapImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    HeatmapImageryProvider.prototype.requestImage = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }

        return this._image;
    };

    /**
     * Picking features is not currently supported by this imagery provider, so this function simply returns
     * undefined.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    HeatmapImageryProvider.prototype.pickFeatures = function() {
        return undefined;
    };

    /*HeatmapImageryProvider.prototype.updateHeatmapEntire = function(nuConfig,layer){
        this._heatmap.configure(nuConfig);
        var imagery = layer.getImageryFromCache(0,0,0);
        imagery.state = ImageryState.UNLOADED;
    }*/

    HeatmapImageryProvider.prototype.updateHeatmap = function(nuConfig){
        this._heatmap.configure(nuConfig);
        //this.reload();
    };

    HeatmapImageryProvider.prototype.reload = function(){
        if (defined(this._reload)) {
            getImage(this, this._image)
                .then(this._reload);
        }
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
    function getImage(that, image) {
        function success(imageObj) {
            that._image = imageObj;
            that._tileWidth = imageObj.width;
            that._tileHeight = imageObj.height;
        }

        if (typeof image !== 'string') {
            success(image);
            return when(image);
        }

        var proxy = that._proxy;
        if (defined(proxy)) {
            image = proxy.getURL(image);
        }

        return loadImage(image)
            .then(function(imageObj) {
                success(imageObj);
                return imageObj;
            });
    }


    return HeatmapImageryProvider;
});

