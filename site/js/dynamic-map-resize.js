
$('#contact-map-resize').on('click', function (e) {
    var w,
        h,
        dimen;

    dimen = Math.floor(igv.random(300, 800));
    w = Math.floor(igv.random(300, 800));
    h = Math.floor(igv.random(200, 1024));
    window.browser.layoutController.doLayoutWithRootContainerSize({ width: w, height: h });
});
