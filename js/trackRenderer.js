import {DOMUtils} from '../node_modules/igv-utils/src/index.js'
import $ from '../vendor/jquery-3.3.1.slim.js'

class TrackRenderer {

    constructor(browser, size, $container, track, axis, order) {

        this.browser = browser;
        this.track = track;
        this.id = `trackRender_${DOMUtils.guid()}`;
        this.axis = axis;
        this.init($container, size, order);

    }

    init($container, size, order) {

        var self = this;

        // track canvas container
        this.$viewport = ('x' === this.axis) ? $('<div class="x-track-canvas-container">') : $('<div class="y-track-canvas-container">');
        if (size.width) {
            this.$viewport.width(size.width);
        }
        if (size.height) {
            this.$viewport.height(size.height);
        }
        $container.append(this.$viewport);
        this.$viewport.css({order: order});

        // canvas
        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);
        this.ctx = this.$canvas.get(0).getContext("2d");

        if ('x' === this.axis) {
            // label
            this.$label = $('<div class="x-track-label">');
            const str = this.track.name || 'untitled';
            this.$label.text(str);
            this.$viewport.append(this.$label);
            if (true === self.browser.showTrackLabelAndGutter) {
                this.$label.show();
            } else {
                this.$label.hide();
            }

            this.$viewport.on('click', function (e) {

                e.preventDefault();
                e.stopPropagation();

                self.browser.toggleTrackLabelAndGutterState();
                if (true === self.browser.showTrackLabelAndGutter) {
                    $('.x-track-label').show();
                    $('.hic-igv-right-hand-gutter').show();
                } else {
                    $('.x-track-label').hide();
                    $('.hic-igv-right-hand-gutter').hide();
                }
            })
        } else {
            // Context transform

            //this.ctx.rotate(Math.PI/2)
        }

        // track spinner container
        this.$spinner = ('x' === this.axis) ? $('<div class="x-track-spinner">') : $('<div class="y-track-spinner">');
        this.$viewport.append(this.$spinner);
        this.stopSpinner();

    }

    dispose($container, size, order) {
        this.tile = undefined;
        this.$viewport.remove();
    }

    syncCanvas() {
        this.$canvas.width(this.$viewport.width());
        this.$canvas.attr('width', this.$viewport.width());
        this.$canvas.height(this.$viewport.height());
        this.$canvas.attr('height', this.$viewport.height());
    }

    drawTile(tile, genomicState) {

        if (tile) {
            this.offsetPixel = Math.round((tile.startBP - genomicState.startBP) / genomicState.bpp);
            if ('x' === this.axis) {
                this.ctx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
                this.ctx.drawImage(tile.buffer, this.offsetPixel, 0);
            } else {
                this.ctx.setTransform(0, 1, 1, 0, 0, 0)
                this.ctx.clearRect(0, 0, this.$canvas.height(), this.$canvas.width());
                this.ctx.drawImage(tile.buffer, this.offsetPixel, 0);
            }
        }
    }

    startSpinner() {
        this.browser.startSpinner();
    }

    stopSpinner() {
        this.browser.stopSpinner();
    }

    isLoading() {
        return !(undefined === this.loading);
    }

}

export default TrackRenderer
