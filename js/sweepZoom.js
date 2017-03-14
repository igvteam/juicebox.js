/**
 * Created by dat on 3/14/17.
 */
var hic = (function (hic) {

    hic.SweepZoom = function (browser, $rulerSweeper) {
        this.browser = browser;
        this.$rulerSweeper = $rulerSweeper;
        this.$rulerSweeper.hide();
    };

    hic.SweepZoom.prototype.reset = function(xy) {

        this.$rulerSweeper.css({ left: xy.x + "px", top: xy.y + "px", width: 1 + "px" , height: 1 + "px" });
        this.$rulerSweeper.show();

        this.originBin = this.browser.toBin(xy.x, xy.y);

    };

    hic.SweepZoom.prototype.update = function(mouseDown, coords) {
        var dx,
            dy;
        dx = coords.x - mouseDown.x;
        dy = coords.y - mouseDown.y;

        this.dimensionPixel = Math.max(Math.abs(dx), Math.abs(dy));

        this.$rulerSweeper.css({ width: this.dimensionPixel + "px", height: this.dimensionPixel + "px" });

        if (dx < 0) {
            this.$rulerSweeper.css({ left: (mouseDown.x + dx) + "px" });
        }

        if (dy < 0) {
            this.$rulerSweeper.css({ top: (mouseDown.y + dy) + "px" });
        }

    };

    hic.SweepZoom.prototype.dismiss = function () {
        var scaleFactor;

        this.$rulerSweeper.hide();
        scaleFactor = this.dimensionPixel / this.browser.contactMatrixView.getViewDimensions().width;

        this.browser.sweepZoom( _.first(this.originBin), _.last(this.originBin), this.browser.hicReader.indexOfNearestZoom(scaleFactor * this.browser.resolution()) );

    };


    return hic;
})(hic || {});
