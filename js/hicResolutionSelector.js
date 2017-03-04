/**
 * Created by dat on 3/4/17.
 */
var hic = (function (hic) {

    hic.ResolutionSelector = function (browser) {
        var elements;

        this.browser = browser;

        this.$resolution_widget = $('<select name="select">');
        this.$resolution_widget.on('change', function(e){
            console.log('resolutionWidget - did change');
        });

        elements = _.map(browser.hicReader.bpResolutions, function(resolution){
            return '<option' + 'value=' + resolution + '>' + igv.numberFormatter(resolution) + '</option>';
        });

        this.$resolution_widget.append(elements);

        this.$container = $('<div class="hic-chromosome-goto-container">');
        this.$container.append(this.$resolution_widget);

    };

    return hic;

})
(hic || {});
