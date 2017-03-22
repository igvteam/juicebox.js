/**
 * Created by dat on 3/22/17.
 */
var hic = (function (hic) {

    hic.ChromosomeSelectorWidget = function (browser) {

        var self = this,
            $label,
            $option,
            $selector_container;

        this.browser = browser;

        $label = $('<label>');
        $label.text('Chr X Y');

        // x-axis
        this.$x_axis_selector = $('<select name="x-axis-selector">');
        this.$x_axis_selector.on('change', function (e) {
            console.log('x-axis chr selected');
        });

        // y-axis
        this.$y_axis_selector = $('<select name="y-axis-selector">');
        this.$y_axis_selector.on('change', function (e) {
            console.log('y-axis chr selected');
        });

        this.$container = $('<div class="hic-chromosome-selector-widget-container">');

        this.$container.append($label);

        $selector_container = $('<div>');

        $option = $('<option value="">');
        $option.text('---');
        this.$x_axis_selector.append($option);
        $selector_container.append(this.$x_axis_selector);

        $option = $('<option value="">');
        $option.text('---');
        this.$y_axis_selector.append($option);
        $selector_container.append(this.$y_axis_selector);

        this.$container.append($selector_container);


    };

    return hic;

}) (hic || {});

