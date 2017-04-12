/**
 * Created by dat on 4/5/17.
 */
var hic = (function (hic) {

    hic.TrackRenderer = function (browser, size, $container, track) {

        this.browser = browser;
        this.track = track;
        this.id = _.uniqueId('trackRenderer_');
        this.initializationHelper($container, size);
    };

    hic.TrackRenderer.prototype.initializationHelper = function ($container, size) {

        this.$viewport = $('<div>');
        if (size.width) {
            this.$viewport.width(size.width);
        }
        if (size.height) {
            this.$viewport.height(size.height);
        }
        $container.append(this.$viewport);

        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);
        this.ctx = this.$canvas.get(0).getContext("2d");

        // spinner
        // this.$spinner = $('<div>');
        // this.$viewport.append(this.$spinner);
    };

    hic.TrackRenderer.prototype.syncCanvas = function () {
        this.$canvas.attr('width', this.$viewport.width());
        this.$canvas.attr('height', this.$viewport.height());
        igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.width(), this.$canvas.height(), { fillStyle: igv.rgbColor(255, 255, 255) });
    };

    hic.TrackRenderer.prototype.update = function () {
        this.tile = null;
        this.promiseToRepaint();
    };

    hic.TrackRenderer.prototype.promiseToRepaint = function () {

        var self = this;

        return new Promise(function(fulfill, reject) {

            var lengthPixel,
                lengthBP,
                startBP,
                endBP,
                genomicState,
                chrName;

            genomicState = _.mapObject(self.browser.genomicState(), function(val) {
                return _.isObject(val) ? val[ self.track.config.axis ] : val;
            });

            if (/*this.$zoomInNotice &&*/ self.track.visibilityWindow && self.track.visibilityWindow > 0) {

                if ((genomicState.bpp * Math.max(self.$canvas.width(), self.$canvas.height()) > self.track.visibilityWindow) /*|| ('all' === genomicState.chromosome.name && !self.track.supportsWholeGenome)*/) {

                    self.tile = undefined;
                    self.ctx.clearRect(0, 0, self.$canvas.width(), self.$canvas.height());

                    // self.stopSpinner();

                    // self.$zoomInNotice.show();

                    fulfill(self.id + '.' + self.track.config.axis + ' zoom in to see features');

                    // RETURN RETURN RETURN RETURN
                    return;

                } else {
                    // self.$zoomInNotice.hide();
                }

            } // if (/*this.$zoomInNotice &&*/ self.track.visibilityWindow && self.track.visibilityWindow > 0)



            chrName = genomicState.chromosome.name;

            if (self.tile && self.tile.containsRange(chrName, genomicState.startBP, genomicState.endBP, genomicState.bpp)) {
                self.drawTileWithGenomicState(self.tile, genomicState);
                fulfill(self.id + '.' + self.track.config.axis + ' drawTileWithGenomicState(repaint)');
            } else {

                // Expand the requested range so we can pan a bit without reloading
                lengthPixel = 3 * Math.max(self.$canvas.width(), self.$canvas.height());
                // lengthPixel = Math.max(self.$canvas.width(), self.$canvas.height());

                lengthBP = Math.round(genomicState.bpp * lengthPixel);

                startBP = Math.max(0, Math.round(genomicState.startBP - lengthBP/3));
                // startBP = Math.round(genomicState.startBP);

                endBP = startBP + lengthBP;

                if (self.loading && self.loading.start === startBP && self.loading.end === endBP) {
                    fulfill(self.id + '.' + self.track.config.axis + ' loading ...');
                } else {

                    self.loading =
                        {
                            start: startBP,
                            end: endBP
                        };

                    // self.startSpinner();

                    self.track
                        .getFeatures(genomicState.chromosome.name, startBP, endBP, genomicState.bpp)
                        .then(function (features) {

                            var buffer;

                            self.loading = undefined;

                            // self.stopSpinner();

                            if (features) {

                                buffer = document.createElement('canvas');
                                buffer.width  = 'x' === self.track.config.axis ? lengthPixel           : self.$canvas.width();
                                buffer.height = 'x' === self.track.config.axis ? self.$canvas.height() : lengthPixel;

                                self.drawConfiguration =
                                    {
                                        features: features,

                                        context: buffer.getContext("2d"),

                                        pixelWidth:  buffer.width,
                                        pixelHeight: buffer.height,

                                        bpStart: startBP,
                                        bpEnd:   endBP,

                                        bpPerPixel: genomicState.bpp,

                                        genomicState: genomicState
                                    };

                                self.track.draw(self.drawConfiguration);

                                self.tile = new Tile(chrName, startBP, endBP, genomicState.bpp, buffer);
                                self.drawTileWithGenomicState(self.tile, genomicState);

                                fulfill(self.id + '.' + self.track.config.axis + ' drawTileWithGenomicState(' + _.size(features) + ')');

                            } else {
                                self.ctx.clearRect(0, 0, self.$canvas.width(), self.$canvas.height());
                                fulfill(self.id + '.' + self.track.config.axis + ' no features');
                            }

                        })
                        .catch(function (error) {

                            // self.stopSpinner();

                            self.loading = false;

                            reject(error);
                        });

                }
            }

        });
    };

    hic.TrackRenderer.prototype.drawTileWithGenomicState = function (tile, genomicState) {

        if (tile) {

            this.ctx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());

            this.offsetPixel = Math.round( (tile.startBP - genomicState.startBP) / genomicState.bpp );
            if ('x' === this.track.config.axis) {
                this.ctx.drawImage(tile.buffer, this.offsetPixel, 0);
            } else {
                this.ctx.drawImage(tile.buffer, 0, this.offsetPixel);
            }

            // this.ctx.save();
            // this.ctx.restore();
        }
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

}) (hic || {});
