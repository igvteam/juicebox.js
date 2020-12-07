/**
 * Created by dat on 4/5/17.
 */

import { DOMUtils } from '../node_modules/igv-utils/src/index.js'
import { ColorPicker  } from '../node_modules/igv-ui/dist/igv-ui.js'
import igv from '../node_modules/igv/dist/igv.esm.js'
import  * as hic from './hicUtils.js'
import $ from '../vendor/jquery-3.3.1.slim.js'

const TrackRenderer = function (browser, size, $container, trackRenderPair, trackPair, axis, order) {

    this.browser = browser;

    this.trackRenderPair = trackRenderPair;

    this.track = trackPair[axis];

    this.id = `trackRender_${ DOMUtils.guid() }`;
    this.axis = axis;
    this.initializationHelper($container, size, order);
};

TrackRenderer.prototype.initializationHelper = function ($container, size, order) {

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
    }

    // track spinner container
    this.$spinner = ('x' === this.axis) ? $('<div class="x-track-spinner">') : $('<div class="y-track-spinner">');
    this.$viewport.append(this.$spinner);


    this.stopSpinner();

    // color picker
    if ('x' === this.axis) {
        this.colorPicker = createColorPicker_ColorScaleWidget_version(this.$viewport, () => {
            this.colorPicker.hide();
        }, (color) => {
            this.setColor(color);
        });
        this.colorPicker.hide();
    }

    if ('x' === this.axis) {

        // igvjs compatibility
        this.track.trackView = this;
        this.track.trackView.trackDiv = this.$viewport.get(0);

        appendRightHandGutter(this, this.$viewport);

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
        });

    }

    this.configTrackTransforms();

};

TrackRenderer.prototype.configTrackTransforms = function () {

    this.canvasTransform = ('y' === this.axis) ? hic.reflectionRotationWithContext : hic.identityTransformWithContext;

    this.labelReflectionTransform = ('y' === this.axis) ? hic.reflectionAboutYAxisAtOffsetWithContext : function (context, exe) { /* nuthin */
    };

};

TrackRenderer.prototype.syncCanvas = function () {

    this.$canvas.width(this.$viewport.width());
    this.$canvas.attr('width', this.$viewport.width());

    this.$canvas.height(this.$viewport.height());
    this.$canvas.attr('height', this.$viewport.height());

};

TrackRenderer.prototype.presentColorPicker = function () {
    const bbox = this.trackDiv.getBoundingClientRect();
    this.colorPicker.origin = {x: bbox.x, y: 0};
    this.colorPicker.$container.offset({left: this.colorPicker.origin.x, top: this.colorPicker.origin.y});
    this.colorPicker.$container.show();
};

TrackRenderer.prototype.setTrackName = function (name) {

    if ('x' === this.axis) {
        this.track.name = name;
        this.$label.text(name);
    }
};

TrackRenderer.prototype.setColor = function (color) {

    setColor(this.trackRenderPair.x);
    setColor(this.trackRenderPair.y);

    function setColor(trackRenderer) {
        trackRenderer.tile = undefined;
        trackRenderer.track.color = color;
    }

    this.browser.renderTrackXY(this.trackRenderPair);

};

TrackRenderer.prototype.setTrackHeight = function (height) {
    // TODO fix me -- height should apply to both axes.  This method called by gear menu list item
    console.error("setTrackHeight not implemented")
};



TrackRenderer.prototype.dataRange = function () {
    return this.track.dataRange ? this.track.dataRange : undefined;
};

TrackRenderer.prototype.setDataRange = function (min, max, autoscale) {
    if (min !== undefined) {
        this.track.dataRange.min = min;
        this.track.config.min = min;
    }
    if (max !== undefined) {
        this.track.dataRange.max = max;
        this.track.config.max = max;
    }
    this.track.autoscale = autoscale;
    this.track.config.autoScale = autoscale
    this.repaintViews();
};


/**
 * Return a promise to get the renderer ready to paint,  that is with a valid tile, loading features
 * and drawing tile if neccessary.
 *
 * @returns {*}
 */
TrackRenderer.prototype.readyToPaint = async function () {

    const genomicState = this.browser.genomicState(this.axis);
    const chrName = genomicState.chromosome.name;

    const bpPerPixel = "all" === chrName.toLowerCase() ? this.browser.genome.getGenomeLength() / Math.max(this.$canvas.height(), this.$canvas.width()) : genomicState.bpp

    if (this.tile && this.tile.containsRange(chrName, genomicState.startBP, genomicState.endBP, bpPerPixel)) {

    } else if (bpPerPixel * Math.max(this.$canvas.width(), this.$canvas.height()) > this.track.visibilityWindow) {

    } else {

        // Expand the requested range so we can pan a bit without reloading
        const pixelWidth = 3 * Math.max(this.$canvas.width(), this.$canvas.height());
        const lengthBP = Math.round(bpPerPixel * pixelWidth);
        const bpStart = Math.max(0, Math.round(genomicState.startBP - lengthBP / 3));
        const bpEnd = bpStart + lengthBP;

        const features = await this.track.getFeatures(genomicState.chromosome.name, bpStart, bpEnd, bpPerPixel)

        const buffer = document.createElement('canvas');
        buffer.width = 'x' === this.axis ? pixelWidth : this.$canvas.width();
        buffer.height = 'x' === this.axis ? this.$canvas.height() : pixelWidth;

        const context = buffer.getContext("2d");

        if (features) {

            if(this.track.autoscale || !this.track.dataRange) {
                if (typeof this.track.doAutoscale === 'function') {
                    this.track.doAutoscale(features);
                } else {
                    this.track.dataRange = igv.doAutoscale(features);
                }
            }

            this.canvasTransform(context);

            const width = Math.max(this.$canvas.width(), this.$canvas.height())

            this.drawConfiguration =
                {
                    features,
                    context,
                    pixelWidth,
                    bpStart,
                    bpEnd,
                    bpPerPixel,
                    genomicState,
                    pixelHeight: Math.min(buffer.width, buffer.height),
                    viewportContainerX: (genomicState.startBP - bpStart) / bpPerPixel,
                    viewportContainerWidth: width,
                    viewportWidth: width,
                    labelTransform: this.labelReflectionTransform,
                    referenceFrame: {}
                };

            this.track.draw(this.drawConfiguration);


        } else {
            context.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
        }

        this.tile = new Tile(chrName, bpStart, bpEnd, bpPerPixel, buffer);
        return this.tile
    }
}

/**
 *
 */
TrackRenderer.prototype.repaint = async function (force) {

    const genomicState = this.browser.genomicState(this.axis);
    if (!this.checkZoomIn()) {
        this.tile = undefined;
        this.ctx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
    }

    const chrName = genomicState.chromosome.name;
    const bpp = "all" === chrName.toLowerCase() ?
        this.browser.genome.getGenomeLength() / Math.max(this.$canvas.height(), this.$canvas.width()) :
        genomicState.bpp

    if(force) {
        this.tile = undefined;
    }
    if (!(this.tile && this.tile.containsRange(chrName, genomicState.startBP, genomicState.endBP, bpp))) {
        await this.readyToPaint()
    }
    this.drawTileWithGenomicState(this.tile, genomicState);
};

TrackRenderer.prototype.checkZoomIn = function () {

    if (this.track.visibilityWindow && this.track.visibilityWindow > 0) {

        if ((genomicState.bpp * Math.max(this.$canvas.width(), this.$canvas.height()) > this.track.visibilityWindow)) {
            return false;
        }
    }
    return true;
}

TrackRenderer.prototype.drawTileWithGenomicState = function (tile, genomicState) {

    if (tile) {

        this.ctx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());

        this.offsetPixel = Math.round((tile.startBP - genomicState.startBP) / genomicState.bpp);
        if ('x' === this.axis) {
            this.ctx.drawImage(tile.buffer, this.offsetPixel, 0);
        } else {
            this.ctx.drawImage(tile.buffer, 0, this.offsetPixel);
        }

        // this.ctx.save();
        // this.ctx.restore();
    }
};

TrackRenderer.prototype.startSpinner = function () {
    this.browser.startSpinner();
};

TrackRenderer.prototype.stopSpinner = function () {
    this.browser.stopSpinner();
};

TrackRenderer.prototype.isLoading = function () {
    return !(undefined === this.loading);
};

/**
 * No-op but needed for igv menu compatibility
 */
TrackRenderer.prototype.checkContentHeight = function () {
}

/**
 * Needed for igv menu compatibility
 */
TrackRenderer.prototype.repaintViews = function () {
    this.browser.renderTrackXY(this.trackRenderPair, true);
}

function appendRightHandGutter(trackView, $parent) {
    const $div = $('<div class="hic-igv-right-hand-gutter">');
    $parent.append($div);
    igv.createTrackGearPopover(trackView, $div);

}

// ColorScaleWidget version of color picker
function createColorPicker_ColorScaleWidget_version($parent, closeHandler, colorHandler) {

    const config =
        {
            parent: $parent[0],
            width: 456,
            height: undefined,
            colorHandler: colorHandler
        };

    return new ColorPicker(config);
}


const Tile = function (chr, startBP, endBP, bpp, buffer) {
    this.chr = chr;
    this.startBP = startBP;
    this.endBP = endBP;
    this.bpp = bpp;
    this.buffer = buffer;
};

Tile.prototype.containsRange = function (chr, startBP, endBP, bpp) {
    return chr === this.chr && this.bpp === bpp && this.startBP <= startBP && this.endBP >= endBP;
};

export default TrackRenderer
