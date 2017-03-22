/**
 * Created by dat on 3/21/17.
 */
var hic = (function (hic) {

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
            self.browser.setNormalization( $(this).val() );
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
                    self.updateWithDataset(event.data);
                }
            }
        };

        hic.GlobalEventBus.subscribe("DataLoad", config);

    };

    hic.NormalizationWidget.prototype.updateWithDataset = function(dataset) {

        var selected,
            normalizationTypes,
            elements;

        selected = false;
        normalizationTypes = dataset.normalizationTypes;
        elements = _.map(normalizationTypes, function (normalization) {
            return '<option' + ' value=' + normalization + (selected ? ' selected' : '') + '>' + normalization + '</option>';
        });

        this.$normalization_selector.empty();
        this.$normalization_selector.append(elements.join(''));

    };

    return hic;

})
(hic || {});
