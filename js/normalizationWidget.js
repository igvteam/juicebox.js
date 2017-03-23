/**
 * Created by dat on 3/21/17.
 */
var hic = (function (hic) {

    var labels = {
        VC: "Coverage",
        VC_SQRT: "Coverage (Sqrt)",
        KR: "Balanced",
        INTER_VC: "Interchromosomal Coverage",
        INTER_VC_SQRT: "Interchromosomal Coverage (Sqrt)",
        INTER_KR: "Interchromosomal Balanced",
        GW_VC: "Genome-wide Coverage",
        GW_VC_SQRT: "Genome-wide Coverage (Sqrt)",
        GW_KR: "Genome-wide Balanced",

    }

    hic.NormalizationWidget = function (browser) {
        var self = this,
            $label,
            $option,
            config;

        this.browser = browser;

        $label = $('<label for="normalization_selector">');
        $label.text('Normalization');

        this.$normalization_selector = $('<select name="select">');
        this.$normalization_selector.on('change', function (e) {
            self.browser.setNormalization($(this).val());
        });

        this.$normalization_selector.attr('name', 'dataset_selector');

        $option = $('<option value="">');
        $option.text('None');

        this.$container = $('<div class="hic-normalization-selector-container">');

        this.$container.append($label);
        this.$normalization_selector.append($option);
        this.$container.append(this.$normalization_selector);

        config = {
            receiveEvent: function (event) {
                if (event.type === "DataLoad") {
                    self.respondToDataLoadWithDataset(event.data);
                }
            }
        };

        hic.GlobalEventBus.subscribe("DataLoad", config);

    };

    hic.NormalizationWidget.prototype.respondToDataLoadWithDataset = function (dataset) {

        var selected,
            normalizationTypes,
            elements;

        selected = false;
        normalizationTypes = dataset.normalizationTypes;
        elements = _.map(normalizationTypes, function (normalization) {
            var label = labels[normalization];
            return '<option' +
                (label === undefined ? '' : ' title = "' + label + '" ') +
                ' value=' + normalization + (selected ? ' selected' : '') + '>' + normalization + '</option>';
        });

        this.$normalization_selector.empty();
        this.$normalization_selector.append(elements.join(''));

    };

    return hic;

})
(hic || {});
