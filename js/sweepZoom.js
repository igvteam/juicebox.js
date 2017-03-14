/**
 * Created by dat on 3/14/17.
 */
var hic = (function (hic) {

    hic.SweepZoom = function ($rulerSweeper) {
        this.$rulerSweeper = $rulerSweeper;
        this.$rulerSweeper.hide();
    };

    hic.SweepZoom.prototype.reset = function(xy) {
        this.$rulerSweeper.css({ left: xy.x + "px", top: xy.y + "px", width: 1 + "px" , height: 1 + "px" });
        this.$rulerSweeper.show();

        // console.log('sweep zoom - reset ' + this.$rulerSweeper.css('left') + ' ' + this.$rulerSweeper.css('top'));
    };

    hic.SweepZoom.prototype.update = function(mouseDown, coords) {
        var dx, dy;
        dx = coords.x - mouseDown.x;
        dy = coords.y - mouseDown.y;

        this.$rulerSweeper.css({ width: Math.abs(dx) + "px", height: Math.abs(dy) + "px" });

        if (dx < 0) {
            this.$rulerSweeper.css({ left: (mouseDown.x + dx) + "px" });
        }

        if (dy < 0) {
            this.$rulerSweeper.css({ top: (mouseDown.y + dy) + "px" });
        }

        // console.log('sweep zoom - update ' + this.$rulerSweeper.css('width') + ' ' + this.$rulerSweeper.css('height'));

    };

    hic.SweepZoom.prototype.dismiss = function () {
        this.$rulerSweeper.hide();
    };


    return hic;
})(hic || {});
