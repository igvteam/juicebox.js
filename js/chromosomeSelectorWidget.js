/**
 * Created by dat on 3/22/17.
 */
var hic = (function (hic) {

    hic.ChromosomeSelectorWidget = function (browser) {

        var self = this,
            $label,
            $option,
            $selector_container,
            $doit,
            config;

        this.browser = browser;

        $label = $('<label>');
        $label.text('Chromosomes');

        // x-axis
        this.$x_axis_selector = $('<select name="x-axis-selector">');
        this.$x_axis_selector.on('change', function (e) {
            // console.log('x-axis chr is', $(this).val());
        });

        // y-axis
        this.$y_axis_selector = $('<select name="y-axis-selector">');
        this.$y_axis_selector.on('change', function (e) {
            // console.log('y-axis chr is', $(this).val());
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

        $doit = $('<div class="hic-chromosome-selector-widget-button">');

        $doit.on('click', function (e) {
            var chr1,
                chr2,
                chromosomes = self.browser.hicReader.chromosomes,
                strx,
                stry;

            chr1 = parseInt(self.$x_axis_selector.find('option:selected').val(), 10);
            chr2 = parseInt(self.$y_axis_selector.find('option:selected').val(), 10);

            strx = 'chr x (' + chromosomes[ chr1 ].name + ', ' + igv.numberFormatter(chromosomes[ chr1 ].size) + ')';
            stry = 'chr y (' + chromosomes[ chr2 ].name + ', ' + igv.numberFormatter(chromosomes[ chr2 ].size) + ')';
            console.log(strx + ' ' + stry);
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
                    state;
                if (event.type === "LocusChange") {
                    state = event.data;

                    str = 'option[value=' + state.chr1.toString() + ']';
                    self.$x_axis_selector.find(str).attr('selected', 'selected');

                    str = 'option[value=' + state.chr2.toString() + ']';
                    self.$y_axis_selector.find(str).attr('selected', 'selected');
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

