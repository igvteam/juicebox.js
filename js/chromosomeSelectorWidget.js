/**
 * Created by dat on 3/22/17.
 */
var hic = (function (hic) {

    hic.ChromosomeSelectorWidget = function (browser) {

        var self = this,
            $label,
            $selector_container,
            $doit,
            config;

        this.browser = browser;

        $label = $('<label>');
        $label.text('Chromosomes');

        this.$container = $('<div class="hic-chromosome-selector-widget-container">');

        this.$container.append($label);

        this.$x_axis_selector = $('<select name="x-axis-selector">');
        this.$y_axis_selector = $('<select name="y-axis-selector">');

        $selector_container = $('<div>');
        $selector_container.append(this.$x_axis_selector);
        $selector_container.append(this.$y_axis_selector);

        this.$container.append($selector_container);

        $doit = $('<div class="hic-chromosome-selector-widget-button">');

        $doit.on('click', function (e) {
            var chr1,
                chr2;

            chr1 = parseInt(self.$x_axis_selector.find('option:selected').val(), 10);
            chr2 = parseInt(self.$y_axis_selector.find('option:selected').val(), 10);

            self.browser.setChromosomes(chr1, chr2);
        });

        this.$container.append($doit);

        config = {
            receiveEvent: function (event) {
                if (event.type === "DataLoad") {
                    self.updateWithDataset(event.data);
                }
            }
        };

        hic.GlobalEventBus.subscribe("DataLoad", config);

        config = {
            receiveEvent: function (event) {
                var str,
                    state,
                    chr1,
                    chr2;

                if (event.type === "LocusChange") {
                    state = event.data;

                    chr1 = parseInt(self.$x_axis_selector.find("option:selected").val(), 10);
                    chr2 = parseInt(self.$y_axis_selector.find("option:selected").val(), 10);

                    if (chr1 !== state.chr1 || chr2 !== state.chr2) {

                        str = 'option[value=' + state.chr1.toString() + ']';
                        self.$x_axis_selector.find(str).attr('selected', 'selected');

                        str = 'option[value=' + state.chr2.toString() + ']';
                        self.$y_axis_selector.find(str).attr('selected', 'selected');

                    }

                }
            }
        };

        hic.GlobalEventBus.subscribe("LocusChange", config);

    };

    hic.ChromosomeSelectorWidget.prototype.updateWithDataset = function(dataset) {

        var elements,
            str,
            index;

        this.$x_axis_selector.empty();
        this.$y_axis_selector.empty();


        elements = _.map(dataset.chromosomes, function (chr, index){
            return '<option value=' + index.toString() + '>' + chr.name + '</option>';
        });

        this.$x_axis_selector.append(elements.join(''));
        this.$y_axis_selector.append(elements.join(''));

        str = 'option[value=' + this.browser.state.chr1.toString() + ']';
        this.$x_axis_selector.find(str).attr('selected', 'selected');

        str = 'option[value=' + this.browser.state.chr2.toString() + ']';
        this.$y_axis_selector.find(str).attr('selected', 'selected');

    };

    return hic;

}) (hic || {});

