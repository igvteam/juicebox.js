import {DOMUtils} from '../node_modules/igv-ui/dist/igv-ui.js'
import $ from '../vendor/jquery-3.3.1.slim.js'

class TrackRenderer {

    constructor(browser, track, axis) {

        this.browser = browser;
        this.track = track;
        this.axis = axis;

        this.id = `trackRender_${DOMUtils.guid()}`;
    }

    init($container, size, order) {

        // track canvas container
        this.$viewport = ('x' === this.axis) ? $('<div class="x-track-canvas-container">') : $('<div class="y-track-canvas-container">');
        $container.append(this.$viewport)

        'x' === this.axis ? this.$viewport.height(size) : this.$viewport.width(size)

        this.$viewport.get(0).style.order = `${ order }`

        // canvas
        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);
        this.ctx = this.$canvas.get(0).getContext("2d");

        if ('x' === this.axis) {

            // track reorder handle
            this.$trackReorderHandle = $('<div class="x-track-reorder-handle">')
            this.$viewport.append(this.$trackReorderHandle)

            this.$trackReorderHandle.append(`<i class="fa fa-arrow-up"></i>`)
            this.$trackReorderHandle.append(`<i class="fa fa-arrow-down"></i>`)

            // label
            this.$label = $('<div class="x-track-label">')
            this.$viewport.append(this.$label)

            const str = this.track.name || ''
            this.$label.text(str)
            this.$label.get(0).title = str

            if (true === this.browser.showTrackLabelAndGutter) {
                this.$label.show();
            } else {
                this.$label.hide();
            }

            this.$viewport.on('click', e => {

                e.preventDefault();
                e.stopPropagation();

                this.browser.toggleTrackLabelAndGutterState();
                if (true === this.browser.showTrackLabelAndGutter) {
                    $('.x-track-label').show();
                    $('.hic-igv-right-hand-gutter').show();
                } else {
                    $('.x-track-label').hide();
                    $('.hic-igv-right-hand-gutter').hide();
                }
            })
        }

        // track spinner container
        this.$spinner = ('x' === this.axis) ? $('<div class="x-track-spinner">') : $('<div class="y-track-spinner">');
        this.$viewport.append(this.$spinner);
        this.stopSpinner();

    }

    dispose() {
        this.tile = undefined
        this.$viewport.remove()
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
