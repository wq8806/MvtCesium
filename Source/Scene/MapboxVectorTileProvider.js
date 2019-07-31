//TS-GIS
define(['../Core/defaultValue','../Core/defined','../Core/DeveloperError','../Core/WebMercatorTilingScheme','../Core/GeographicTilingScheme','../ThirdParty/when','../ThirdParty/ol-debug','../ThirdParty/mapbox-style','../Scene/TileReplacementQueue','../Core/defineProperties','../Core/Resource'],
    function (defaultValue,defined,DeveloperError,WebMercatorTilingScheme,GeographicTilingScheme,when,ol,createMapboxStyle,TileReplacementQueue,defineProperties,Resource) {
    var MVTProvider = function (options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._tileWidth = defaultValue(options.tileWidth, 512);
        this._tileHeight = defaultValue(options.tileHeight, 512);
        this._readyPromise = when.resolve(true);
        this._ol = ol;
        this._mvtParser = new this._ol.format.MVT();

        this._stFun = createMapboxStyle;
        this._key = defaultValue(options.key, "");
        if (!defined(options.url)) {
            throw new DeveloperError('mapbox vectortile service url is required.');
        }
        this._url = options.url;    //https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v6/{z}/{x}/{y}.vector.pbf?access_token={k}

        var mapExtent;
        if(options.projection.indexOf('3857') > -1){
            this._tilingScheme = new WebMercatorTilingScheme();
            var sw = this._tilingScheme._rectangleSouthwestInMeters;
            var ne = this._tilingScheme._rectangleNortheastInMeters;
            mapExtent = [sw.x,sw.y,ne.x,ne.y];
        }else{
            this._tilingScheme = new GeographicTilingScheme();
            var rectangle = this._tilingScheme.rectangle;
            mapExtent = [rectangle.west,rectangle.south,rectangle.east,rectangle.north];
        }
        // this._resolutions = defaultValue(options.resolutions, ol.tilegrid.resolutionsFromExtent(mapExtent, 22, this._tileWidth));
        this._resolutions = options.resolutions;


        this._glStyle = options.glStyle;
        this._styleFun = options.styleFun;

        this._pixelRatio = 1;
        this._transform = [0.125,0,0,0.125,0,0];
        this._replays =  ["Default","Image","Polygon", "LineString","Text","Circle"];

        this._tileQueue = new TileReplacementQueue();
        this._cacheSize = defaultValue(options.cacheSize, 1000);

        var projection = ol.proj.get('EPSG:4326');
        projection.setExtent([-180,-90,180,90]);
        this._vectorLayer = new ol.layer.VectorTile({
            declutter:true,
            source: new ol.source.VectorTile({
                format: new ol.format.MVT(),
                url : "http://10.18.1.139:8089/egis/base/v1/wvts/tiles/11/{z}/{x}/{y}.pbf",
                projection: projection,
                //wrapX: false,
                tileGrid: new ol.tilegrid.TileGrid({
                    origin: [-180,90],
                    resolutions: this._resolutions,
                    extent:[-180,-90,180,90]
                }),
            }),
        })
        this._layerRenderer = new ol.renderer.canvas.VectorTileLayer(this._vectorLayer);
        /*this._map = new ol.Map({
            layers: [
                this._vectorLayer
            ],
            target: 'map',
            view: new ol.View({
                projection: 'EPSG:4326',
                center: [90, 42.525564],
                zoom: 2
            })
        })*/
    }

    defineProperties(MVTProvider.prototype, {
        proxy : {
            get : function() {
                return undefined;
            }
        },

        tileWidth : {
            get : function() {
                return this._tileWidth;
            }
        },

        tileHeight: {
            get : function() {
                return this._tileHeight;
            }
        },

        maximumLevel : {
            get : function() {
                return undefined;
            }
        },

        minimumLevel : {
            get : function() {
                return undefined;
            }
        },

        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        rectangle : {
            get : function() {
                return this._tilingScheme.rectangle;
            }
        },

        tileDiscardPolicy : {
            get : function() {
                return undefined;
            }
        },

        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        ready : {
            get : function() {
                return true;
            }
        },

        readyPromise : {
            get : function() {
                return this._readyPromise;
            }
        },

        credit : {
            get : function() {
                return undefined;
            }
        },

        hasAlphaChannel : {
            get : function() {
                return true;
            }
        },

        cacheSize : {
            get : function() {
                return this._cacheSize;
            },
            set : function(value) {
                if (this._cacheSize !== value) {
                    this._cacheSize = value;
                    // this.reload();
                }
            }
        },

        styleFun:{
            get : function() {
                return this._styleFun;
            },
            set : function(value) {
                if (this._styleFun !== value) {
                    this._styleFun = value;
                    this.reload();
                }
            }
        }
    });

        MVTProvider.prototype.getTileCredits = function(x, y, level) {
            return undefined;
        };

        function findTileInQueue(x, y, level,tileQueue){
            var item = tileQueue.head;
            while(item != undefined && !(item.xMvt == x && item.yMvt ==y && item.zMvt == level)){
                item = item.replacementNext;
            }
            return item;
        };

        function remove(tileReplacementQueue, item) {
            var previous = item.replacementPrevious;
            var next = item.replacementNext;

            if (item === tileReplacementQueue._lastBeforeStartOfFrame) {
                tileReplacementQueue._lastBeforeStartOfFrame = next;
            }

            if (item === tileReplacementQueue.head) {
                tileReplacementQueue.head = next;
            } else {
                previous.replacementNext = next;
            }

            if (item === tileReplacementQueue.tail) {
                tileReplacementQueue.tail = previous;
            } else {
                next.replacementPrevious = previous;
            }

            item.replacementPrevious = undefined;
            item.replacementNext = undefined;

            --tileReplacementQueue.count;
        }

        function trimTiles(tileQueue,maximumTiles) {
            var tileToTrim = tileQueue.tail;
            while (tileQueue.count > maximumTiles &&
            defined(tileToTrim)) {
                var previous = tileToTrim.replacementPrevious;

                remove(tileQueue, tileToTrim);
                delete tileToTrim;
                tileToTrim = null;

                tileToTrim = previous;
            }
        };

        MVTProvider.prototype.requestImage = function(x, y, level, request) {
            var cacheTile = findTileInQueue(x, y, level,this._tileQueue);
            if(cacheTile != undefined){
                return cacheTile;
            }
            else{
                var that = this;
                var url = this._url;
                url = url.replace('{x}', x).replace('{y}', y).replace('{z}', level).replace('{k}', this._key);
                var tilerequest = function(x,y,z){
                    var resource = Resource.createIfNeeded(url);

                    return resource.fetchArrayBuffer().then(function(arrayBuffer) {
                        var canvas = document.createElement('canvas');
                        canvas.width = 512;
                        canvas.height = 512;
                        var vectorContext = canvas.getContext('2d');

                        var features = that._mvtParser.readFeatures(arrayBuffer);

                        var styleFun = that._stFun(that._glStyle);

                        var extent = [0,0,4096,4096];
                        // var extent = [90,0,180,90];
                        // var _replayGroup = new ol.render.canvas.ReplayGroup(0, extent, 8,true,100);
                        //避让方法
                        // var _replayGroup = new ol.render.canvas.ReplayGroup(0,extent,8,window.devicePixelRatio,true,that._layerRenderer.declutterTree_,100);
                        //不避让方法
                        var _replayGroup = new ol.render.canvas.ReplayGroup(0,extent,8,window.devicePixelRatio,true,null,100);
                        var squaredTolerance = ol.renderer.vector.getSquaredTolerance(8, window.devicePixelRatio);

                        for(var i=0;i<features.length;i++){
                            var feature = features[i];
                            var styles;
                            if(!that._styleFun){
                                styles = styleFun(features[i],that._resolutions[level]);
                            }else{
                                var style_olms = that._styleFun(features[i],that._resolutions[level]);
                                styles = styleFun(features[i],that._resolutions[level],style_olms);
                            }
                            var declutterReplays = that._vectorLayer.getDeclutter() ? {} : null;
                            for(var j=0;j<styles.length;j++)
                            {
                                // ol.renderer.vector.renderFeature_(_replayGroup, feature, styles[j],16);
                                ol.renderer.vector.renderFeature(_replayGroup, feature, styles[j],squaredTolerance);
                            }
                        }
                        _replayGroup.finish();

                        var declutterReplays = {};
                        // _replayGroup.replay(vectorContext, that._pixelRatio, that._transform, 0, {}, that._replays, true);
                        _replayGroup.replay(vectorContext,that._transform, 0, {}, true,that._replays, declutterReplays);
                        if(Object.keys(declutterReplays).length / 2 > 0){
                            /*var decluterReplayArr = [];
                            for(var i in declutterReplays) {
                                decluterReplayArr = decluterReplayArr.concat(declutterReplays[i]);
                            }
                            console.log(decluterReplayArr);*/
                            ol.render.canvas.ReplayGroup.replayDeclutter(declutterReplays, vectorContext, 0, true)
                        }
                        if(that._tileQueue.count>that._cacheSize){
                            trimTiles(that._tileQueue,that._cacheSize/2);
                        }

                        canvas.xMvt = x;
                        canvas.yMvt = y;
                        canvas.zMvt = z;
                        that._tileQueue.markTileRendered(canvas);

                        delete _replayGroup;
                        _replayGroup = null;

                        return canvas;
                    }).otherwise(function(error) {
                    });

                }(x,y,level);
            }
        };

        MVTProvider.prototype.pickFeatures = function(x, y, level, longitude, latitude) {
            return undefined;
        };

        MVTProvider.prototype.reload = function(){
            if (defined(this._reload)) {
                this._tileQueue = new TileReplacementQueue();
                this._reload();
            }
        }

        MVTProvider.prototype.setStyleFun = function (value) {
            this._styleFun = value;
            this.reload();
        }

    return MVTProvider;
});
