/**
 * Created by dat on 3/4/17.
 */
var hic = (function (hic) {

    hic.ResolutionSelector = function (browser) {
        var self = this,
            elements,
            $label;

        this.browser = browser;

        this.$resolution_selector = $('<select name="select">');
        this.$resolution_selector.on('change', function (e) {
            var zoomIndex = parseInt($(this).val());
            self.browser.setZoom(zoomIndex);
        });

        // elements = _.map(browser.hicReader.bpResolutions, function (resolution) {
        //     return '<option' + ' value=' + resolution + '>' + igv.numberFormatter(Math.floor(resolution / 1e3)) + '</option>';
        // });
        //this.$resolution_selector.append(elements.join(''));

        this.$resolution_selector.attr('name', 'resolution_selector');

        $label = $('<label for="resolution_selector">');
        $label.text('Resolution (kb)');

        this.$container = $('<div class="hic-resolution-selector-container">');

        this.$container.append($label);
        this.$container.append(this.$resolution_selector);

        hic.GlobalEventBus.subscribe("LocusChange", this);
        hic.GlobalEventBus.subscribe("DataLoad", this);
    };

    hic.ResolutionSelector.prototype.receiveEvent = function (event) {

        if (event.type === "LocusChange") {
            var state = event.data;

            this.$resolution_selector
                .find('option')
                .filter(function (index) {
                    return index === state.zoom;
                })
                .prop('selected', true);
        } else if (event.type === "DataLoad") {

            var config = event.config,
                zoom =  (config === undefined || config.state === undefined ? -1 : config.state.zoom);

            var elements = _.map(this.browser.hicReader.bpResolutions, function (resolution, index) {
                var selected = zoom === index;

                return '<option' + ' value=' + index +  (selected ? ' selected': '') + '>' + igv.numberFormatter(Math.floor(resolution / 1e3)) + '</option>';
            });




            this.$resolution_selector.empty();
            this.$resolution_selector.append(elements.join(''));

        }

    };

    return hic;

})
(hic || {});
