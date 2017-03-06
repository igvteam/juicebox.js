/**
 * Created by dat on 3/6/17.
 */
/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.ColorScaleWidget = function(browser) {

        this.browser = browser;
        this.$resolution_selector = $('<input class="hic-chromosome-goto-input" type="text" placeholder="chr-x-axis chr-y-axis">');
        this.$resolution_selector.on('change', function(e){
            var value = $(this).val();
            browser.parseGotoInput( value );
        });

        // chromosome goto container
        this.$container = $('<div class="hic-chromosome-goto-container">');
        this.$container.append(this.$resolution_selector);

        hic.GlobalEventBus.subscribe("DidLoadDataset", this);
    };

    hic.ColorScaleWidget.prototype.receiveEvent = function(event) {

        if (event.payload && event.payload instanceof hic.State) {
            // do stuff
            console.log('ColorScaleWidget.receiveEvent-ing');
        }

    };

    return hic;

})
(hic || {});
