/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.LocusGoto = function(browser) {

        this.$chromosome_goto = $('<input class="hic-chromosome-goto-input" type="text" placeholder="chr-x-axis chr-y-axis">');
        this.$chromosome_goto.on('change', function(e){
            var value = $(this).val();
            browser.parseGotoInput( value );
        });

        // chromosome goto container
        this.$container = $('<div class="hic-chromosome-goto-container">');
        this.$container.append(this.$chromosome_goto);

        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.LocusGoto.prototype.receiveEvent = function(event) {

        if (event.payload && event.payload instanceof hic.State) {
            console.log('bin x y = ' + event.payload.x + ' ' + event.payload.y);
        }

    };

    return hic;

})
(hic || {});
