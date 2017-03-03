/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.LocusGoto = function($gotoWigit) {
        this.$gotoWigit = $gotoWigit;
        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.Ruler.prototype.receiveEvent = function(event) {

        if (event.payload && event.payload instanceof hic.State) {
            console.log('bin x y = ' + event.payload.x + ' ' + event.payload.y);
        }

    };

    return hic;

})
(hic || {});
