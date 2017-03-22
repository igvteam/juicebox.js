/**
 * Created by dat on 3/22/17.
 */
var hic = (function (hic) {

    hic.ChromosomeSelectorWidget = function (browser) {
        var self = this,
            $label,
            $option;

        this.browser = browser;

        $label = $('<label for="chromosome_selector">');
        $label.text('Select Chromosomes');

        this.$chromosome_selector = $('<select name="select">');
        this.$chromosome_selector.on('change', function (e) {
            console.log('chr selected');
        });

        this.$chromosome_selector.attr('name', 'chromosome_selector');

        $option = $('<option value="">');
        $option.text('---');

        this.$container = $('<div class="hic-chromosome-selector-widget-container">');

        this.$container.append($label);
        this.$chromosome_selector.append($option);
        this.$container.append(this.$chromosome_selector);

    };

}) (hic || {});

