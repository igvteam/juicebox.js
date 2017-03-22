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

        this.dataLoadConfig = {
            receiveEvent: function (event) {
                if (event.type === "DataLoad") {
                    self.respondToDataLoadWithDataset(event.data);
                }
            }
        };
        hic.GlobalEventBus.subscribe("DataLoad", this.dataLoadConfig);

        this.locusChangeConfig = {
            receiveEvent: function (event) {
                if (event.type === "LocusChange") {
                    self.respondToLocusChangeWithState(event.data);
                }
            }
        };
        hic.GlobalEventBus.subscribe("LocusChange", this.locusChangeConfig);

    };

    hic.ChromosomeSelectorWidget.prototype.respondToDataLoadWithDataset = function(dataset) {

        var elements,
            str,
            foundX,
            foundY;

        this.$x_axis_selector.empty();
        this.$y_axis_selector.empty();

        elements = _.map(dataset.chromosomes, function (chr, index){
            return '<option value=' + index.toString() + '>' + chr.name + '</option>';
        });

        this.$x_axis_selector.append(elements.join(''));
        this.$y_axis_selector.append(elements.join(''));

        str = 'option[value=' + this.browser.state.chr1.toString() + ']';
        foundX = this.$x_axis_selector.find(str);
        foundX.attr('selected', 'selected');

        str = 'option[value=' + this.browser.state.chr2.toString() + ']';
        foundY = this.$y_axis_selector.find(str);
        foundY.attr('selected', 'selected');
    };

    hic.ChromosomeSelectorWidget.prototype.respondToLocusChangeWithState = function(state) {
        var self = this,
            str,
            findX,
            findY;


        findX = this.$x_axis_selector.find('option');
        findY = this.$y_axis_selector.find('option');

        // this happens when the first dataset is loaded.
        if (0 === _.size(findX) || 0 === _.size(findY)) {
            return;
        }

        // rebuildChromosomeSelect();

        str = 'option[value=' + state.chr1.toString() + ']';
        this.$x_axis_selector.find(str).attr('selected', 'selected');

        str = 'option[value=' + state.chr2.toString() + ']';
        this.$y_axis_selector.find(str).attr('selected', 'selected');


        function rebuildChromosomeSelect() {

            var elements,
                chromosomes = self.browser.hicReader.chromosomes;

            self.$x_axis_selector.empty();
            self.$y_axis_selector.empty();

            elements = _.map(chromosomes, function (chr, index){
                return '<option value=' + index.toString() + '>' + chr.name + '</option>';
            });

            self.$x_axis_selector.append(elements.join(''));
            self.$y_axis_selector.append(elements.join(''));

        }

    };

    return hic;

}) (hic || {});

