/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

/**
 * Created by dat on 3/7/17.
 */
import $ from "../vendor/jquery-1.12.4.js"
import _ from "../vendor/underscore.js"

const ScrollbarWidget = function (browser) {

    var self = this,
        id;

    this.browser = browser;
    this.isDragging = false;

    // x-axis
    id = browser.id + '_' + 'x-axis-scrollbar-container';
    this.$x_axis_scrollbar_container = $("<div>", {id: id});

    id = browser.id + '_' + 'x-axis-scrollbar';
    this.$x_axis_scrollbar = $("<div>", {id: id});
    this.$x_axis_scrollbar_container.append(this.$x_axis_scrollbar);

    this.$x_label = $('<div>');
    this.$x_label.text('');
    this.$x_axis_scrollbar.append(this.$x_label);

    // y-axis
    id = browser.id + '_' + 'y-axis-scrollbar-container';
    this.$y_axis_scrollbar_container = $("<div>", {id: id});

    id = browser.id + '_' + 'y-axis-scrollbar';
    this.$y_axis_scrollbar = $("<div>", {id: id});
    this.$y_axis_scrollbar_container.append(this.$y_axis_scrollbar);

    this.$y_label = $('<div class="scrollbar-label-rotation-in-place">');
    this.$y_label.text('');
    this.$y_axis_scrollbar.append(this.$y_label);

    // this.$x_axis_scrollbar_container.hide();
    // this.$y_axis_scrollbar_container.hide();

    // this.$x_axis_scrollbar.draggable({
    //     containment: 'parent',
    //     start: function() {
    //         self.isDragging = true;
    //     },
    //     drag: hic.throttle(xAxisDragger, 250),
    //     stop: function() {
    //         self.isDragging = false;
    //     }
    // });

    // this.$y_axis_scrollbar.draggable({
    //
    //     containment: 'parent',
    //     start: function() {
    //         self.isDragging = true;
    //     },
    //     drag: hic.throttle(yAxisDragger, 250),
    //     stop: function() {
    //         self.isDragging = false;
    //     }
    // });

    this.browser.eventBus.subscribe("LocusChange", this);

    // function xAxisDragger () {
    //     var bin,
    //         st = self.browser.state;
    //
    //     bin = self.css2Bin(self.browser.hicReader.chromosomes[ self.browser.state.chr1 ], self.$x_axis_scrollbar, 'left');
    //     self.browser.setState( new hic.State(st.chr1, st.chr2, st.zoom, bin, st.y, st.pixelSize) );
    // }

    // function yAxisDragger () {
    //     var bin,
    //         st = self.browser.state;
    //
    //     bin = self.css2Bin(self.browser.hicReader.chromosomes[ self.browser.state.chr2 ], self.$y_axis_scrollbar, 'top');
    //     self.browser.setState( new hic.State(st.chr1, st.chr2, st.zoom, st.x, bin, st.pixelSize) );
    // }
};

ScrollbarWidget.prototype.css2Bin = function (chromosome, $element, attribute) {
    var numer,
        denom,
        percentage;

    numer = $element.css(attribute).slice(0, -2);
    denom = $element.parent().css('left' === attribute ? 'width' : 'height').slice(0, -2);
    percentage = parseInt(numer, 10) / parseInt(denom, 10);

    return percentage * chromosome.size / this.browser.dataset.bpResolutions[this.browser.state.zoom];
};

ScrollbarWidget.prototype.receiveEvent = function (event) {
    var self = this,
        chromosomeLengthsBin,
        chromosomeLengthsPixel,
        width,
        height,
        pixels,
        widthBin,
        heightBin,
        bins,
        percentage,
        percentages,
        str;

    if (!this.isDragging && event.type === "LocusChange") {

        var state = event.data.state,
            dataset = self.browser.dataset;

        if (0 === state.chr1) {
            this.$x_axis_scrollbar.hide();
            this.$y_axis_scrollbar.hide();
        } else {

            this.$x_axis_scrollbar.show();
            this.$y_axis_scrollbar.show();

            this.$x_axis_scrollbar_container.show();
            this.$y_axis_scrollbar_container.show();

            chromosomeLengthsBin = _.map([state.chr1, state.chr2], function (index) {
                // bp / bp-per-bin -> bin
                return dataset.chromosomes[index].size / dataset.bpResolutions[state.zoom];
            });

            chromosomeLengthsPixel = _.map(chromosomeLengthsBin, function (bin) {
                // bin * pixel-per-bin -> pixel
                return bin * state.pixelSize;
            });

            pixels = [this.browser.contactMatrixView.getViewDimensions().width, this.browser.contactMatrixView.getViewDimensions().height];

            // pixel / pixel-per-bin -> bin
            bins = [_.first(pixels) / state.pixelSize, _.last(pixels) / state.pixelSize];

            // bin / bin -> percentage
            percentages = _.map(bins, function (bin, i) {
                var binPercentage,
                    pixelPercentage;

                binPercentage = Math.min(bin, chromosomeLengthsBin[i]) / chromosomeLengthsBin[i];
                pixelPercentage = Math.min(chromosomeLengthsPixel[i], pixels[i]) / pixels[i];
                return Math.max(1, Math.round(100 * binPercentage * pixelPercentage));
            });
            this.$x_axis_scrollbar.css('width', (_.first(percentages).toString() + '%'));
            this.$y_axis_scrollbar.css('height', (_.last(percentages).toString() + '%'));


            // bin / bin -> percentage
            percentage = Math.round(100 * state.x / _.first(chromosomeLengthsBin));
            percentage = percentage.toString() + '%';
            this.$x_axis_scrollbar.css('left', percentage);

            // bin / bin -> percentage
            percentage = Math.round(100 * state.y / _.last(chromosomeLengthsBin));
            percentage = percentage.toString() + '%';
            this.$y_axis_scrollbar.css('top', percentage);

            this.$x_label.text(dataset.chromosomes[state.chr1].name);
            this.$y_label.text(dataset.chromosomes[state.chr2].name);

        }

    }
};

export default ScrollbarWidget