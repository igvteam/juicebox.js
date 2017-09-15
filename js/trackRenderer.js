/**
 * Created by dat on 4/5/17.
 */
var hic = (function (hic) {

    hic.TrackRenderer = function (browser, size, $container, trackRenderPair, trackPair, axis, order) {

        this.browser = browser;

        this.trackRenderPair = trackRenderPair;

        this.track = trackPair[axis];

        this.id = _.uniqueId('trackRenderer_');
        this.axis = axis;
        this.initializationHelper($container, size, order);
    };

    hic.TrackRenderer.prototype.initializationHelper = function ($container, size, order) {

        var self = this,
            str,
            doShowLabelAndGear,
            $x_track_label,
            $x_track_menu_container;

        // track canvas container
        this.$viewport = ('x' === this.axis) ? $('<div class="x-track-canvas-container">') : $('<div class="y-track-canvas-container">');
        if (size.width) {
            this.$viewport.width(size.width);
        }
        if (size.height) {
            this.$viewport.height(size.height);
        }
        $container.append(this.$viewport);
        this.$viewport.css( { order:order } );

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

        // throbber
        // size: see $hic-viewport-spinner-size in .scss files
        this.throbber = Throbber({color: 'rgb(64, 64, 64)', size: 32, padding: 7});
        this.throbber.appendTo(this.$spinner.get(0));
        this.stopSpinner();

        if ('x' === this.axis) {

            this.$menu_container = $('<div class="x-track-menu-container">');
            this.$viewport.append(this.$menu_container);

            this.$menu_button = $('<i class="fa fa-cog" aria-hidden="true">');
            this.$menu_container.append(this.$menu_button);

            this.$menu_button.click(function (e) {
                e.stopPropagation();
                igv.popover.presentTrackGearMenu(e.pageX, e.pageY, self);
            });

            this.$viewport.on('click', function (e) {

                e.stopPropagation();

                // self.$label.toggle();
                // self.$menu_container.toggle();

                $container.find('.x-track-label').toggle();
                $container.find('.x-track-menu-container').toggle();
            });

            if (doShowLabelAndGear) {
                this.$label.show();
                this.$menu_container.show();
            } else {
                this.$label.hide();
                this.$menu_container.hide();
            }

        }

        // compatibility with igv menus
        this.track.trackView = this;
        this.track.trackView.trackDiv = this.$viewport.get(0);

        this.configTrackTransforms();

    };

    hic.TrackRenderer.prototype.configTrackTransforms = function () {

        this.canvasTransform = ('y' === this.axis) ? hic.reflectionRotationWithContext : hic.identityTransformWithContext;

        this.labelReflectionTransform = ('y' === this.axis) ? hic.reflectionAboutYAxisAtOffsetWithContext : function (context, exe) { /* nuthin */
        };

    };

    hic.TrackRenderer.prototype.syncCanvas = function () {

        this.tile = null;

        this.$canvas.width(this.$viewport.width());
        this.$canvas.attr('width', this.$viewport.width());

        this.$canvas.height(this.$viewport.height());
        this.$canvas.attr('height', this.$viewport.height());

        igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.width(), this.$canvas.height(), {fillStyle: igv.rgbColor(255, 255, 255)});
    };

    hic.TrackRenderer.prototype.setColor = function (color) {

        _.each(this.trackRenderPair, function (trackRenderer) {
            trackRenderer.tile = undefined;
            trackRenderer.track.color = color;
        });

        this.browser.renderTrackXY(this.trackRenderPair);
    };

    hic.TrackRenderer.prototype.dataRange = function () {
        return this.track.dataRange ? this.track.dataRange : undefined;
    };

    hic.TrackRenderer.prototype.setDataRange = function (min, max, autoscale) {

        _.each(this.trackRenderPair, function (trackRenderer) {
            trackRenderer.tile = undefined;
            trackRenderer.track.dataRange = {min: min, max: max};
            trackRenderer.track.autscale = autoscale;
        });

        this.browser.renderTrackXY(this.trackRenderPair);

    };

    hic.TrackRenderer.prototype.repaint = function () {

        var self = this,
            lengthPixel,
            lengthBP,
            startBP,
            endBP,
            genomicState,
            chrName;

        genomicState = _.mapObject(self.browser.genomicState(), function (val) {
            return _.isObject(val) ? val[self.axis] : val;
        });

        if (/*this.$zoomInNotice &&*/ self.track.visibilityWindow && self.track.visibilityWindow > 0) {

            if ((genomicState.bpp * Math.max(self.$canvas.width(), self.$canvas.height()) > self.track.visibilityWindow) /*|| ('all' === genomicState.chromosome.name && !self.track.supportsWholeGenome)*/) {

                self.tile = undefined;
                self.ctx.clearRect(0, 0, self.$canvas.width(), self.$canvas.height());

                self.stopSpinner();
                // self.$zoomInNotice.show();

                return;

            } else {
                // self.$zoomInNotice.hide();
            }

        } // if (/*this.$zoomInNotice &&*/ self.track.visibilityWindow && self.track.visibilityWindow > 0)

        chrName = genomicState.chromosome.name;

        if (self.tile && self.tile.containsRange(chrName, genomicState.startBP, genomicState.endBP, genomicState.bpp)) {
            self.drawTileWithGenomicState(self.tile, genomicState);
            return;

        } else {

            // Expand the requested range so we can pan a bit without reloading
            lengthPixel = 3 * Math.max(self.$canvas.width(), self.$canvas.height());

            lengthBP = Math.round(genomicState.bpp * lengthPixel);

            startBP = Math.max(0, Math.round(genomicState.startBP - lengthBP / 3));

            endBP = startBP + lengthBP;

            if (self.loading) { //&& self.loading.start === startBP && self.loading.end === endBP) {
                return;
            } else {

                self.loading =
                {
                    start: startBP,
                    end: endBP
                };

                self.startSpinner();
                self.track
                    .getFeatures(genomicState.chromosome.name, startBP, endBP, genomicState.bpp)
                    .then(function (features) {

                        var buffer,
                            ctx;

                        self.loading = false;

                        self.stopSpinner();

                        buffer = document.createElement('canvas');
                        buffer.width = 'x' === self.axis ? lengthPixel : self.$canvas.width();
                        buffer.height = 'x' === self.axis ? self.$canvas.height() : lengthPixel;
                        ctx = buffer.getContext("2d");

                        if (features) {

                            self.canvasTransform(ctx);

                            self.drawConfiguration =
                            {
                                features: features,

                                context: ctx,

                                pixelWidth: lengthPixel,
                                pixelHeight: Math.min(buffer.width, buffer.height),

                                bpStart: startBP,
                                bpEnd: endBP,

                                bpPerPixel: genomicState.bpp,

                                genomicState: genomicState,

                                viewportContainerX: (genomicState.startBP - startBP) / genomicState.bpp,

                                viewportContainerWidth: Math.max(self.$canvas.width(), self.$canvas.height()),

                                labelTransform: self.labelReflectionTransform
                            };

                            self.track.draw(self.drawConfiguration);

                        } else {
                            ctx.clearRect(0, 0, self.$canvas.width(), self.$canvas.height());
                        }

                        self.tile = new Tile(chrName, startBP, endBP, genomicState.bpp, buffer);

                        self.repaint();

                    })
                    .catch(function (error) {

                        self.stopSpinner();
                        self.loading = false;
                        throw new Error(error);
                    });

            }
        }

    };

    hic.TrackRenderer.prototype.drawTileWithGenomicState = function (tile, genomicState) {

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

    hic.TrackRenderer.prototype.startSpinner = function () {
        this.$spinner.show();
        this.throbber.start();
    };

    hic.TrackRenderer.prototype.stopSpinner = function () {
        // this.startSpinner();
        this.throbber.stop();
        this.$spinner.hide();
    };

    hic.TrackRenderer.prototype.isLoading = function () {
        return !(undefined === this.loading);
    };

    Tile = function (chr, startBP, endBP, bpp, buffer) {
        this.chr = chr;
        this.startBP = startBP;
        this.endBP = endBP;
        this.bpp = bpp;
        this.buffer = buffer;
    };

    Tile.prototype.containsRange = function (chr, startBP, endBP, bpp) {
        return this.bpp === bpp && startBP >= this.startBP && endBP <= this.endBP && chr === this.chr;
    };

    return hic;

})(hic || {});
