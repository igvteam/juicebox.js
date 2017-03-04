/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.State = function(chr1, chr2, zoom, x, y, pixelSize) {
        this.chr1 = chr1;
        this.chr2 = chr2;
        this.zoom = zoom;
        this.x = x;
        this.y = y;
        this.pixelSize = pixelSize;
    };

    return hic;

})
(hic || {});
