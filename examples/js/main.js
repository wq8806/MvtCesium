var developMode = true;

if(developMode){
    require.config({
        baseUrl : '../Source',
        waitSeconds : 120,
    });
} else{
    require.config({
        paths: {
            'Cesium': '../../Build/Cesium/Cesium'
        },
        shim: {
            Cesium: {
                exports: 'Cesium'
            }
        }
    });
}

if (typeof Cesium !== "undefined") {
    onload(Cesium);
} else if (typeof require === "function") {
    require(["Cesium"], onload);
}
