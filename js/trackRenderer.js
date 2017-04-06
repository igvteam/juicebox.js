/**
 * Created by dat on 4/5/17.
 */
var hic = (function (hic) {

    hic.TrackRenderer = function (browser, size, $container, track, whichAxis) {

        this.browser = browser;
        this.track = track;
        this.axis = whichAxis;

        this.yAxisTransformWithContext = function(context) {
            context.scale(-1, 1);
            context.rotate(Math.PI/2.0);
        };

        this.setAxis( whichAxis );

        this.initializationHelper($container, size);
    };

    hic.TrackRenderer.prototype.setAxis = function (axis) {

        this.canvasTransform = ('y' === axis) ? this.yAxisTransformWithContext : identityTransformWithContext;

        this.labelReflectionTransform = ('y' === axis) ? reflectionTransformWithContext : function (context, exe) { };

    };

    function reflectionTransformWithContext(context, exe) {
        context.translate(exe, 0);
        context.scale(-1, 1);
        context.translate(-exe, 0);
    }

    function identityTransformWithContext(context) {
        // 3x2 matrix. column major. (sx 0 0 sy tx ty).
        context.setTransform(1, 0, 0, 1, 0, 0);
    }

    hic.TrackRenderer.prototype.initializationHelper = function ($container, size) {

        var self = this,
            description,
            $trackLabel,
            $spinner,
            dimen;

        this.$viewport = $('<div>');
        this.$viewport.width(size.width);
        this.$viewport.height(size.height);
        $container.append(this.$viewport);

        // TODO diagnostic coloring
        // this.$viewport.css("background-color", igv.randomRGBConstantAlpha(200, 255, 0.75));

        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);
        this.$canvas.attr('width', this.$viewport.width());
        this.$canvas.attr('height', this.$viewport.height());
        this.ctx = this.$canvas.get(0).getContext("2d");
    };

    hic.TrackRenderer.prototype.update = function () {
        this.tile = null;
        this.repaint();
    };

    hic.TrackRenderer.prototype.repaint = function () {

        var self = this,
            pixelWidth,
            bpWidth,
            bpStart,
            bpEnd,
            genomicState = this.browser.genomicState(),
            chr,
            refFrameEnd;

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

        chr = genomicState.chromosome[ this.axis ].name;
        refFrameEnd = genomicState.startBP[ this.axis ] + genomicState.bpp * this.$canvas.width();

        if (false/*this.tile && this.tile.containsRange(chr, genomicState.startBP[ this.axis ], refFrameEnd, genomicState.bpp)*/) {
            this.paintImageWithGenomicState(genomicState);
        } else {

            // Expand the requested range so we can pan a bit without reloading
            pixelWidth = 3 * this.$canvas.width();
            bpWidth = Math.round(genomicState.bpp * pixelWidth);
            bpStart = Math.max(0, Math.round(genomicState.startBP[ this.axis ] - bpWidth/3));
            bpEnd = bpStart + bpWidth;

            if (self.loading && self.loading.start === bpStart && self.loading.end === bpEnd) {
                return;
            }

            self.loading = { start: bpStart, end: bpEnd };

            // self.startSpinner();

            this.track
                .getFeatures(genomicState.chromosome[ this.axis ].name, bpStart, bpEnd, genomicState.bpp)
                .then(function (features) {

                    var buffer;

                    // self.loading = false;
                    self.loading = undefined;

                    // self.stopSpinner();

                    if (features) {

                        buffer = document.createElement('canvas');
                        buffer.width = pixelWidth;
                        buffer.height = self.$canvas.height();

                        self.drawConfiguration =
                            {

                                features: features,
                                context: buffer.getContext('2d'),

                                pixelWidth: buffer.width,
                                pixelHeight: buffer.height,

                                bpStart: bpStart,
                                bpEnd: bpEnd,

                                bpPerPixel: genomicState.bpp,

                                referenceFrame: undefined,

                                genomicState: genomicState,

                                viewport: self,

                                viewportWidth: self.$viewport.width()
                            };

                        self.track.draw(self.drawConfiguration);

                        // self.tile = new Tile(chr, bpStart, bpEnd, genomicState.bpp, buffer);
                        // self.paintImageWithGenomicState(genomicState);

                    } else {
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

    hic.TrackRenderer.prototype.paintImageWithGenomicState = function (genomicState) {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.tile) {
            this.xOffset = Math.round(this.genomicState.referenceFrame.toPixels(this.tile.startBP - this.genomicState.referenceFrame.start));
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    hic.TrackRenderer.prototype.isLoading = function () {
        return !(undefined === this.loading);
    };

    Tile = function (chr, tileStart, tileEnd, scale, image) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.scale = scale;
        this.image = image;
    };

    Tile.prototype.containsRange = function (chr, start, end, scale) {
        return this.scale === scale && start >= this.startBP && end <= this.endBP && chr === this.chr;
    };

    // TODO: dat - Called from BAMTrack.altClick. Change call to redrawTile(viewPort, features)
    hic.TrackRenderer.prototype.redrawTile = function (features) {

        var buffer;

        if (!this.tile) {
            return;
        }

        buffer = document.createElement('canvas');
        buffer.width = this.tile.image.width;
        buffer.height = this.tile.image.height;

        this.trackView.track.draw({
            features: features,
            context: buffer.getContext('2d'),
            bpStart: this.tile.startBP,
            bpPerPixel: this.tile.scale,
            pixelWidth: buffer.width,
            pixelHeight: buffer.height
        });


        this.tile = new Tile(this.tile.chr, this.tile.startBP, this.tile.endBP, this.tile.scale, buffer);
        this.paintImageWithGenomicState(this.genomicState.referenceFrame);
    };

    return hic;

}) (hic || {});