/**
 * Created by dat on 3/7/17.
 */
var hic = (function (hic) {

    hic.ScrollbarWidget = function (browser) {

        var self = this;

        this.browser = browser;
        this.isDragging = false;

        this.$x_axis_scrollbar_container = $('<div class="hic-viewport-x-axis-scrollbar-container">');
        this.$x_axis_scrollbar = $('<div class="hic-viewport-x-axis-scrollbar">');

        this.$y_axis_scrollbar_container = $('<div class="hic-viewport-y-axis-scrollbar-container">');
        this.$y_axis_scrollbar = $('<div class="hic-viewport-y-axis-scrollbar">');

        this.$x_axis_scrollbar_container.append(this.$x_axis_scrollbar);
        this.$y_axis_scrollbar_container.append(this.$y_axis_scrollbar);

        this.$x_axis_scrollbar.draggable({
            containment: 'parent',
            start: function() {
                self.isDragging = true;
                console.log('drag - begin');
            },
            drag: function() {
                var bin,
                    st = self.browser.state;

                bin = self.css2Bin(self.browser.hicReader.chromosomes[ self.browser.state.chr1 ], self.$x_axis_scrollbar, 'left');
                self.browser.setState( new hic.State(st.chr1, st.chr2, st.zoom, bin, st.y, st.pixelSize) );

                // self.browser.shiftPixels(self.browser.state.x - bin, 0);
            },
            stop: function() {
                self.isDragging = false;
                console.log('drag - end');
            }
        });

        this.$y_axis_scrollbar.draggable({

            containment: 'parent',
            start: function() {
                self.isDragging = true;
                console.log('drag - begin');
            },
            drag: function() {
                var bin,
                    st = self.browser.state;

                bin = self.css2Bin(self.browser.hicReader.chromosomes[ self.browser.state.chr2 ], self.$y_axis_scrollbar, 'top');
                self.browser.setState( new hic.State(st.chr1, st.chr2, st.zoom, st.x, bin, st.pixelSize) );

                // self.browser.shiftPixels(0, self.browser.state.y - bin);
            },
            stop: function() {
                self.isDragging = false;
                console.log('drag - end');
            }
        });

        hic.GlobalEventBus.subscribe("LocusChange", this);

    };

    hic.ScrollbarWidget.prototype.css2Bin = function(chromosome, $element, attribute) {
        var numer,
            denom,
            percentage;

        numer = $element.css(attribute).slice(0, -2);
        denom = $element.parent().css('left' === attribute ? 'width' : 'height').slice(0, -2);
        percentage = parseInt(numer, 10)/parseInt(denom, 10);

        return percentage * chromosome.size / this.browser.hicReader.bpResolutions[ this.browser.state.zoom ];
    };

    hic.ScrollbarWidget.prototype.receiveEvent = function(event) {
        var self = this,
            chromosomeLengthsBin,
            widthBin,
            heightBin,
            percentage;

        if (false === this.isDragging && event.type === "LocusChange") {

            chromosomeLengthsBin = _.map([event.state.chr1, event.state.chr2], function (index) {
                // bp / bp-per-bin -> bin
                return self.browser.hicReader.chromosomes[index].size / self.browser.hicReader.bpResolutions[event.state.zoom];
            });

            // pixel / pixel-per-bin -> bin
            widthBin = this.browser.contactMatrixView.getViewDimensions().width  / event.state.pixelSize;
            heightBin = this.browser.contactMatrixView.getViewDimensions().height / event.state.pixelSize;

            // bin / bin -> percentage
            percentage = Math.round(100 * widthBin / _.first(chromosomeLengthsBin));
            percentage = percentage.toString() + '%';
            this.$x_axis_scrollbar.css('width', percentage);

            // bin / bin -> percentage
            percentage = Math.round(100 * heightBin / _.last(chromosomeLengthsBin));
            percentage = percentage.toString() + '%';
            this.$y_axis_scrollbar.css('height', percentage);

            // bin / bin -> percentage
            percentage = Math.round(100 * event.state.x / _.first(chromosomeLengthsBin));
            percentage = percentage.toString() + '%';
            this.$x_axis_scrollbar.css('left', percentage);

            // bin / bin -> percentage
            percentage = Math.round(100 * event.state.y / _.last(chromosomeLengthsBin));
            percentage = percentage.toString() + '%';
            this.$y_axis_scrollbar.css('top', percentage);

        }
    };

    return hic;
})(hic || {});
