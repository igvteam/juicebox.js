/**
 * Created by dat on 4/5/17.
 */
var hic = (function (hic) {

    hic.TrackRenderer = function (browser, size, $container, track) {

        this.browser = browser;
        this.track = track;
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
    };

    hic.TrackRenderer.prototype.syncCanvas = function () {
        this.$canvas.attr('width', this.$viewport.width());
        this.$canvas.attr('height', this.$viewport.height());
        igv.graphics.fillRect(this.ctx, 0, 0, this.$canvas.width(), this.$canvas.height(), { fillStyle: igv.rgbColor(255, 255, 255) });
    };

    hic.TrackRenderer.prototype.update = function () {
        this.tile = null;
        this.repaint();
    };

    hic.TrackRenderer.prototype.promiseToRepaint = function (a, b) {

        return new Promise(function(resolve, reject) {
            var thang;

            thang = a + b;
            if (thang) {
                resolve(thang);
            } else {
                reject(new Error('ERROR - Can not promise to repaint'));
            }
            
        });
    };

    hic.TrackRenderer.prototype.repaint = function () {

        var self = this,
            lengthPixel,
            lengthBP,
            startBP,
            endBP,
            genomicState = this.browser.genomicState(),
            chr;

        // if (this.$zoomInNotice && this.trackView.track.visibilityWindow !== undefined && this.trackView.track.visibilityWindow > 0) {
        //
        //     if ((referenceFrame.bpPerPixel * this.$viewport.width() > this.trackView.track.visibilityWindow) ||
        //         (referenceFrame.chrName === "all" && !this.trackView.track.supportsWholeGenome)) {
        //         this.tile = null;
        //         this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        //
        //         self.stopSpinner();
        //
        //         this.$zoomInNotice.show();
        //         return;
        //     } else {
        //         this.$zoomInNotice.hide();
        //     }
        // }

        console.log('repaint ' + self.track.config.axis);

        chr = genomicState.chromosome[ this.track.config.axis ].name;

        if (this.tile /*&& this.tile.containsRange(chr, genomicState.startBP[ this.track.config.axis ], genomicState.endBP[ this.track.config.axis ], genomicState.bpp)*/) {
            this.drawTileWithGenomicState(this.tile, genomicState);
        } else {

            // Expand the requested range so we can pan a bit without reloading
            lengthPixel = 3 * Math.max(this.$canvas.width(), this.$canvas.height());
            // lengthPixel = Math.max(this.$canvas.width(), this.$canvas.height());

            lengthBP = Math.round(genomicState.bpp * lengthPixel);

            startBP = Math.max(0, Math.round(genomicState.startBP[ this.track.config.axis ] - lengthBP/3));
            // startBP = Math.round(genomicState.startBP[ this.track.config.axis ]);

            endBP = startBP + lengthBP;

            if (self.loading && self.loading.start === startBP && self.loading.end === endBP) {
                return;
            }

            self.loading = { start: startBP, end: endBP };

            // self.startSpinner();

            this.track
                .getFeatures(genomicState.chromosome[ this.track.config.axis ].name, startBP, endBP, genomicState.bpp)
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
                                // context: self.$canvas.get(0).getContext("2d"),

                                pixelWidth:  buffer.width,
                                pixelHeight: buffer.height,

                                bpStart: startBP,
                                  bpEnd:   endBP,

                                bpPerPixel: genomicState.bpp,

                                genomicState: genomicState
                            };

                        console.log('then.draw ' + self.track.config.axis);

                        self.track.draw(self.drawConfiguration);

                        self.tile = new Tile(chr, startBP, endBP, genomicState.bpp, buffer);
                        self.drawTileWithGenomicState(self.tile, genomicState);

                    } else {
                        console.log('Hmmm ... no features');
                        self.ctx.clearRect(0, 0, self.$canvas.width(), self.$canvas.height());
                    }

                })
                .catch(function (error) {

                    // self.stopSpinner();

                    self.loading = false;

                    if (error instanceof igv.AbortLoad) {
                        console.log("Aborted ---");
                    } else {
                        igv.presentAlert(error);
                    }
                });
        }

    };

    hic.TrackRenderer.prototype.drawTileWithGenomicState = function (tile, genomicState) {

        var pixels;

        this.ctx.clearRect(0, 0, this.$canvas.width(), this.$canvas.height());

        if (tile) {

            pixels = (tile.startBP - genomicState.startBP[ this.track.config.axis ]) / genomicState.bpp;

            this.offsetPixel = Math.round(pixels);
            if ('x' === this.track.config.axis) {
                this.ctx.drawImage(tile.buffer, this.offsetPixel, 0);
            } else {
                this.ctx.drawImage(tile.buffer, 0, this.offsetPixel);
            }


            this.ctx.save();
            this.ctx.restore();
        }
    };

    hic.TrackRenderer.prototype.isLoading = function () {
        return !(undefined === this.loading);
    };

    // TODO: dat - Called from BAMTrack.altClick. Change call to redrawTile(viewPort, features)
    hic.TrackRenderer.prototype.redrawTile = function (features) {

        var buffer;

        if (undefined === this.tile) {
            return;
        }

        buffer = document.createElement('canvas');
        buffer.width = this.tile.buffer.width;
        buffer.height = this.tile.buffer.height;

        this.track.draw({

            features: features,

            context: buffer.getContext("2d"),

            pixelWidth: buffer.width,
            pixelHeight: buffer.height,

            bpStart: this.tile.startBP,
            bpEnd: this.tile.endBP,

            bpPerPixel: this.tile.bpp
        });


        this.tile = new Tile(this.tile.chr, this.tile.startBP, this.tile.endBP, this.tile.bpp, buffer);
        this.drawTileWithGenomicState(this.tile, this.browser.genomicState());
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
