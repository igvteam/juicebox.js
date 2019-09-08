/**
 * Created by dat on 4/5/17.
 */
import $ from "../vendor/jquery-1.12.4.js";
import _ from "../vendor/underscore.js";
import  * as hic from './hic.js';
import igv from '../node_modules/igv/dist/igv.esm.min.js';

const TrackRenderer = function (browser, size, $container, trackRenderPair, trackPair, axis, order) {

    this.browser = browser;

    this.trackRenderPair = trackRenderPair;

    this.track = trackPair[axis];

    this.id = _.uniqueId('trackRenderer_');
    this.axis = axis;
    this.initializationHelper($container, size, order);
};

TrackRenderer.prototype.initializationHelper = function ($container, size, order) {

    var self = this,
        str,
        doShowLabelAndGear,
        $x_track_label;

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
        str = this.track.name || 'untitled';
        this.$label.text(str);

        // note the pre-existing state of track labels/gear. hide/show accordingly.
        $x_track_label = $container.find(this.$label);
        doShowLabelAndGear = (0 === _.size($x_track_label)) ? true : $x_track_label.is(':visible');

        this.$viewport.append(this.$label);
    }

    // track spinner container
    this.$spinner = ('x' === this.axis) ? $('<div class="x-track-spinner">') : $('<div class="y-track-spinner">');
    this.$viewport.append(this.$spinner);


    this.stopSpinner();

    // color picker
    if ('x' === this.axis) {
        this.colorPicker = createColorPicker_ColorScaleWidget_version(this.$viewport, () => {
            this.colorPicker.$container.hide();
        }, (color) => {
            this.setColor(color);
        });
        this.colorPicker.$container.hide();
    }

    if ('x' === this.axis) {

        // igvjs compatibility
        this.track.trackView = this;
        this.track.trackView.trackDiv = this.$viewport.get(0);

        igv.appendRightHandGutter.call(this, this.$viewport);

        this.$viewport.on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            $container.find('.x-track-label').toggle();
            $container.find('.igv-right-hand-gutter').toggle();
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
    this.track.config.autoScale = autoscale;

    this.repaint();
};


/**
 * Return a promise to get the renderer ready to paint,  that is with a valid tile, loading features
 * and drawing tile if neccessary.
 *
 * @returns {*}
 */
TrackRenderer.prototype.readyToPaint = async function () {

    var self = this,
        lengthPixel, lengthBP, startBP, endBP;

    const genomicState = self.browser.genomicState(self.axis);
    const chrName = genomicState.chromosome.name;

    const bpp = "all" === chrName.toLowerCase() ?
        this.browser.genome.getGenomeLength() / Math.max(this.$canvas.height(), this.$canvas.width()) :
        genomicState.bpp

    if (self.tile && self.tile.containsRange(chrName, genomicState.startBP, genomicState.endBP, bpp)) {

        return;

    } else if (bpp * Math.max(self.$canvas.width(), self.$canvas.height()) > self.track.visibilityWindow) {

        return;

    } else {

        // Expand the requested range so we can pan a bit without reloading
        lengthPixel = 3 * Math.max(self.$canvas.width(), self.$canvas.height());
        lengthBP = Math.round(bpp * lengthPixel);
        startBP = Math.max(0, Math.round(genomicState.startBP - lengthBP / 3));
        endBP = startBP + lengthBP;

        const features = await self.track.getFeatures(genomicState.chromosome.name, startBP, endBP, bpp)


        var buffer, ctx;
        buffer = document.createElement('canvas');
        buffer.width = 'x' === self.axis ? lengthPixel : self.$canvas.width();
        buffer.height = 'x' === self.axis ? self.$canvas.height() : lengthPixel;
        ctx = buffer.getContext("2d");
        if (features) {

            if (typeof self.track.doAutoscale === 'function') {
                self.track.doAutoscale(features);
            } else {
                self.track.dataRange = igv.doAutoscale(features);
            }

            self.canvasTransform(ctx);

            self.drawConfiguration =
                {
                    features: features,
                    context: ctx,
                    pixelWidth: lengthPixel,
                    pixelHeight: Math.min(buffer.width, buffer.height),
                    bpStart: startBP,
                    bpEnd: endBP,
                    bpPerPixel: bpp,
                    genomicState: genomicState,
                    viewportContainerX: (genomicState.startBP - startBP) / bpp,
                    viewportContainerWidth: Math.max(self.$canvas.width(), self.$canvas.height()),
                    labelTransform: self.labelReflectionTransform
                };

            self.track.draw(self.drawConfiguration);


        } else {
            ctx.clearRect(0, 0, self.$canvas.width(), self.$canvas.height());
        }

        self.tile = new Tile(chrName, startBP, endBP, bpp, buffer);

        return self.tile
    }
}

/**
 *
 */
TrackRenderer.prototype.repaint = async function () {

    const genomicState = this.browser.genomicState(this.axis);
    if (!this.checkZoomIn()) {
        this.tile = undefined;
        this.ctx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());
    }

    const chrName = genomicState.chromosome.name;
    const bpp = "all" === chrName.toLowerCase() ?
        this.browser.genome.getGenomeLength() / Math.max(this.$canvas.height(), this.$canvas.width()) :
        genomicState.bpp

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

// ColorScaleWidget version of color picker
function createColorPicker_ColorScaleWidget_version($parent, closeHandler, colorHandler) {

    const config =
        {
            $parent: $parent,
            width: 456,
            height: undefined,
            closeHandler: closeHandler
        };

    let genericContainer = new igv.GenericContainer(config);

    igv.createColorSwatchSelector(genericContainer.$container, colorHandler);

    return genericContainer;
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
