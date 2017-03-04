/**
 * Created by dat on 3/4/17.
 */
var hic = (function (hic) {

    hic.ResolutionSelector = function (browser) {
        var self = this,
            elements;

        this.browser = browser;

        this.$resolution_widget = $('<select name="select">');
        this.$resolution_widget.on('change', function(e){
            var number = parseInt($(this).val());
            self.browser.state.zoom = _.indexOf(self.browser.hicReader.bpResolutions, number);
            self.browser.update();
        });

        elements = _.map(browser.hicReader.bpResolutions, function(resolution){
            return '<option' + ' value=' + resolution + '>' + igv.numberFormatter(resolution) + '</option>';
        });

        this.$resolution_widget.append(elements.join(''));

        this.$container = $('<div class="hic-resolution-selector-container">');
        this.$container.append(this.$resolution_widget);

        hic.GlobalEventBus.subscribe("LocusChange", this);
    };

    hic.ResolutionSelector.prototype.receiveEvent = function(event) {
        var $option;

        if (event.payload && event.payload instanceof hic.State) {

            // this.$resolution_widget.find('option:selected').each(function (index) {
            //     console.log('option ' + index + ' ' + $(this).attr('value'));
            // });



            this.$resolution_widget.find('option').filter(function(index) {
                return index === event.payload.zoom;
            }).prop('selected', true);
        }

    };

    return hic;

})
(hic || {});
