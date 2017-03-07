/**
 * Created by dat on 3/6/17.
 */
/**
 * Created by dat on 3/3/17.
 */
var hic = (function (hic) {

    hic.ColorScaleWidget = function(browser) {

        var $label;

        this.browser = browser;

        $label = $('<label class="hic-colorscale-widget-label">');
        $label.text('Color Scale');

        // this.$low_colorscale_input = $('<input class="hic-colorscale-widget-input" type="text" placeholder="low">');
        // this.$low_colorscale_input.on('change', function(e){
        //     var value = $(this).val();
        //     console.log('$low_colorscale_input.onChange ' + value);
        // });

        this.$high_colorscale_input = $('<input class="hic-colorscale-widget-input" type="text" placeholder="high">');
        this.$high_colorscale_input.on('change', function(e){
            var value = $(this).val(),
                numeric = value.replace(/\,/g, '');
            if (isNaN(numeric)) {
   // Error message ?
            }
            else {
                browser.updateColorScale(parseInt(numeric, 10))
            }
        });

        this.$container = $('<div class="hic-colorscale-widget-container">');
        this.$container.append($label);
        this.$container.append(this.$low_colorscale_input);
        this.$container.append(this.$high_colorscale_input);

        hic.GlobalEventBus.subscribe("DataLoad", this);
    };

    hic.ColorScaleWidget.prototype.receiveEvent = function(event) {

        if (event.type === "DataLoad") {
            // do stuff
     //       this.$low_colorscale_input.val(igv.numberFormatter(this.browser.contactMatrixView.colorScale.scale.low));
            this.$high_colorscale_input.val(igv.numberFormatter(this.browser.getColorScale().scale.high));
        }

    };

    return hic;

})
(hic || {});
