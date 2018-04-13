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
 * @author Jim Robinson
 */

var hic = (function (hic) {

    const DRAG_THRESHOLD = 2;
    const PINCH_THRESHOLD = 25;
    const DOUBLE_TAP_DIST_THRESHOLD = 20;
    const DOUBLE_TAP_TIME_THRESHOLD = 300;

    var defaultColorScaleInitializer =
    {
        high: 2000,
        r: 255,
        g: 0,
        b: 0
    };

    hic.ContactMatrixView = function (browser, $container) {
        var id;

        this.browser = browser;

        this.scrollbarWidget = new hic.ScrollbarWidget(browser);

        id = browser.id + '_' + 'viewport';
        this.$viewport = $("<div>", {id: id});
        $container.append(this.$viewport);

        // content canvas
        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);


        // spinner
        this.$fa_spinner = $('<i class="fa fa-spinner fa-spin">');
        this.$fa_spinner.css("font-size", "48px");
        this.$fa_spinner.css("position", "absolute");
        this.$fa_spinner.css("left", "40%");
        this.$fa_spinner.css("top", "40%");
        this.$fa_spinner.css("display", "none");
        this.$viewport.append(this.$fa_spinner);

        // ruler sweeper widget surface
        this.sweepZoom = new hic.SweepZoom(browser, this.$viewport);
        this.$viewport.append(this.sweepZoom.$rulerSweeper);


        // x - guide
        id = browser.id + '_' + 'x-guide';
        this.$x_guide = $("<div>", {id: id});
        this.$viewport.append(this.$x_guide);

        // y - guide
        id = browser.id + '_' + 'y-guide';
        this.$y_guide = $("<div>", {id: id});
        this.$viewport.append(this.$y_guide);


        $container.append(this.scrollbarWidget.$y_axis_scrollbar_container);

        this.displayMode = 'A';
        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
        this.imageTileCacheLimit = browser.isMobile ? 4 : 20;
        this.colorScaleCache = {};

        // Set initial color scales.  These might be overriden / adjusted via parameters
        this.colorScale = new hic.ColorScale({high: 2000, r: 255, g: 0, b: 0});
        this.ratioColorScale = new RatioColorScale(5);
        this.diffColorScale = new RatioColorScale(100, false);

        this.browser.eventBus.subscribe("NormalizationChange", this);
        this.browser.eventBus.subscribe("TrackLoad2D", this);
        this.browser.eventBus.subscribe("TrackState2D", this);
        this.browser.eventBus.subscribe("MapLoad", this)
        this.browser.eventBus.subscribe("LocusChange", this);
        this.browser.eventBus.subscribe("ControlMapLoad", this);
    };

    hic.ContactMatrixView.prototype.setInitialImage = function (x, y, image, state) {
        this.initialImage = {
            x: x,
            y: y,
            state: state.clone(),
            img: image
        }
    };

    hic.ContactMatrixView.prototype.setColorScale = function (options) {

        if (options.high) this.colorScale.high = options.high;
        if (undefined !== options.r) this.colorScale.r = options.r;
        if (undefined !== options.g) this.colorScale.g = options.g;
        if (undefined !== options.b) this.colorScale.b = options.b;

        this.colorScaleCache[colorScaleKey(this.browser.state), this.displayMode] = options.high;
    };

    hic.ContactMatrixView.prototype.setColorScaleThreshold = function (threshold) {

        this.getColorScale().setThreshold(threshold);
        this.colorScaleCache[colorScaleKey(this.browser.state, this.displayMode)] = threshold;
    };

    hic.ContactMatrixView.prototype.getColorScale = function () {
        switch (this.getDisplayMode) {
            case 'AOB':
                return this.ratioColorScale;
            case 'AMB':
                return this.diffColorScale;
            default:
                return this.colorScale;
        }
    };

    hic.ContactMatrixView.prototype.setDisplayMode = function (mode) {
        this.displayMode = mode;
        this.clearCaches();
        this.update();
    }

    function colorScaleKey(state, displayMode) {
        return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization + "_" + displayMode;
    }

    hic.ContactMatrixView.prototype.clearCaches = function () {
        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
    };

    hic.ContactMatrixView.prototype.getViewDimensions = function () {
        return {
            width: this.$viewport.width(),
            height: this.$viewport.height()
        }
    };

    hic.ContactMatrixView.prototype.receiveEvent = function (event) {

        if ("MapLoad" === event.type || "ControlMapLoad" === event.type) {

            // Don't enable mouse actions until we have a dataset.
            if (!this.mouseHandlersEnabled) {
                addTouchHandlers.call(this, this.$viewport);
                addMouseHandlers.call(this, this.$viewport);
                this.mouseHandlersEnabled = true;
            }
            this.clearCaches();
            this.colorScaleCache = {};
        }

        else {
            if ("NormalizationChange" === event.type || "TrackLoad2D" === event.type || "TrackState2D" === event.type) {
                this.clearCaches();
            }

            if (this.initialImage) {
                if (!validateInitialImage.call(this, this.initialImage, event.data.state)) {
                    this.initialImage = undefined;
                }
            }

            this.update();
        }
    };

    function validateInitialImage(initialImage, state) {

        if (initialImage.state.equals(state)) return true;

        if (!(initialImage.state.chr1 === state.chr1 && initialImage.state.chr2 === state.chr2 &&
            initialImage.state.zoom === state.zoom && initialImage.state.pixelSize === state.pixelSize &&
            initialImage.state.normalization === state.normalization)) return false;

        // Now see if initial image fills view
        var offsetX = (initialImage.x - state.x) * state.pixelSize,
            offsetY = (initialImage.y - state.y) * state.pixelSize,
            width = initialImage.img.width,
            height = initialImage.img.height,
            viewportWidth = this.$viewport.width(),
            viewportHeight = this.$viewport.height();

        // Viewport rectangle must be completely contained in image rectangle
        return offsetX <= 0 && offsetY <= 0 && (width + offsetX) >= viewportWidth && (height + offsetY) >= viewportHeight;

    }

    function drawStaticImage(image) {
        var viewportWidth = this.$viewport.width(),
            viewportHeight = this.$viewport.height(),
            canvasWidth = this.$canvas.width(),
            canvasHeight = this.$canvas.height(),
            state = this.browser.state,
            offsetX = (image.x - state.x) * state.pixelSize,
            offsetY = (image.y - state.y) * state.pixelSize;
        if (canvasWidth !== viewportWidth || canvasHeight !== viewportHeight) {
            this.$canvas.width(viewportWidth);
            this.$canvas.height(viewportHeight);
            this.$canvas.attr('width', this.$viewport.width());
            this.$canvas.attr('height', this.$viewport.height());
        }
        this.ctx.drawImage(image.img, offsetX, offsetY);
    }


    hic.ContactMatrixView.prototype.update = function () {

        var self = this;

        this.readyToPaint()
            .then(function (ignore) {

                self.repaint();
            })
            .catch(function (error) {
                console.error(error);
            })

    }

    /**
     * Return a promise to load all neccessary data
     */
    hic.ContactMatrixView.prototype.readyToPaint = function () {

        var self = this,
            state = this.browser.state;

        if (!self.browser.dataset || self.initialImage) {
            return Promise.resolve();
        }

        return getMatrices.call(self, state.chr1, state.chr2)

            .then(function (matrices) {

                var matrix = matrices[0];


                if (matrix) {
                    var zd = matrix.bpZoomData[state.zoom],
                        blockBinCount = zd.blockBinCount,   // Dimension in bins of a block (width = height = blockBinCount)
                        pixelSizeInt = Math.max(1, Math.floor(state.pixelSize)),
                        widthInBins = self.$viewport.width() / pixelSizeInt,
                        heightInBins = self.$viewport.height() / pixelSizeInt,
                        blockCol1 = Math.floor(state.x / blockBinCount),
                        blockCol2 = Math.floor((state.x + widthInBins) / blockBinCount),
                        blockRow1 = Math.floor(state.y / blockBinCount),
                        blockRow2 = Math.floor((state.y + heightInBins) / blockBinCount),
                        r, c, zdControl, promises = [];

                    if (matrices.length > 1) {
                        zdControl = matrices[1].bpZoomData[state.zoom];
                    }

                    return checkColorScale.call(self, zd, blockRow1, blockRow2, blockCol1, blockCol2, state.normalization)

                        .then(function () {

                            for (r = blockRow1; r <= blockRow2; r++) {
                                for (c = blockCol1; c <= blockCol2; c++) {
                                    promises.push(self.getImageTile(zd, zdControl, r, c, state));
                                }
                            }

                            return Promise.all(promises);
                        })
                }
                else {
                    return Promise.resolve();
                }
            })
    };


    /**
     * Repaint the map.  This function is more complex than it needs to be,   all image tiles should have been
     * created previously in readyToPaint.   We could just fetch them from the cache and paint.
     */
    hic.ContactMatrixView.prototype.repaint = function () {

        var self = this,
            state = this.browser.state,
            zd;

        if (!self.browser.dataset) return;

        if (!self.ctx) {
            self.ctx = this.$canvas.get(0).getContext("2d");
        }

        if (self.initialImage) {
            drawStaticImage.call(this, this.initialImage);
            return;
        }

        if (self.updating) {
            return;
        }


        getMatrices.call(self, state.chr1, state.chr2)

            .then(function (matrices) {

                var matrix = matrices[0];

                if (matrix) {

                    zd = matrix.bpZoomData[state.zoom];

                    var blockBinCount = zd.blockBinCount,   // Dimension in bins of a block (width = height = blockBinCount)
                        pixelSizeInt = Math.max(1, Math.floor(state.pixelSize)),
                        widthInBins = self.$viewport.width() / pixelSizeInt,
                        heightInBins = self.$viewport.height() / pixelSizeInt,
                        blockCol1 = Math.floor(state.x / blockBinCount),
                        blockCol2 = Math.floor((state.x + widthInBins) / blockBinCount),
                        blockRow1 = Math.floor(state.y / blockBinCount),
                        blockRow2 = Math.floor((state.y + heightInBins) / blockBinCount),
                        r, c, zdControl, promises = [];

                    if (matrices.length > 1) zdControl = matrices[1].bpZoomData[state.zoom];

                    for (r = blockRow1; r <= blockRow2; r++) {
                        for (c = blockCol1; c <= blockCol2; c++) {
                            promises.push(self.getImageTile(zd, zdControl, r, c, state));
                        }
                    }

                    return Promise.all(promises);
                }
                else {
                    return Promise.resolve(undefined);
                }
            })
            .then(function (imageTiles) {
                self.updating = false;
                if (imageTiles) {
                    self.draw(imageTiles, zd);
                }
            })
            .catch(function (error) {
                self.updating = false;
                console.error(error);
            })
    }

    function getMatrices(chr1, chr2) {

        var promises = [];
        if ('B' === this.displayMode && this.browser.controlDataset) {
            promises.push(this.browser.controlDataset.getMatrix(chr1, chr2));
        }
        else {
            promises.push(this.browser.dataset.getMatrix(chr1, chr2));
            if (this.displayMode && 'A' !== this.displayMode && this.browser.controlDataset) {
                promises.push(this.browser.controlDataset.getMatrix(chr1, chr2));
            }
        }
        return Promise.all(promises);
    }

    /**
     * Return a promise to adjust the color scale, if needed.  This function might need to load the contact
     * data to computer scale.
     *
     * @param zd
     * @param row1
     * @param row2
     * @param col1
     * @param col2
     * @param normalization
     * @returns {*}
     */
    function checkColorScale(zd, row1, row2, col1, col2, normalization) {

        var self = this, colorKey, dataset;

        colorKey = colorScaleKey(self.browser.state, self.displayMode);   // This doesn't feel right, state should be an argument

        if ('AOB' === self.displayMode) {
            return Promise.resolve(self.colorScale);     // Don't adjust color scale for A/B.
        }

        if (self.colorScaleCache[colorKey]) {
            var changed = self.colorScale.high !== self.colorScaleCache[colorKey];
            self.colorScale.high = self.colorScaleCache[colorKey];
            if (changed) {
                self.browser.eventBus.post(hic.Event("ColorScale", self.colorScale));
            }
            return Promise.resolve();
        }

        else {

            var row, column, sameChr, blockNumber,
                promises = [];

            sameChr = zd.chr1 === zd.chr2;

            for (row = row1; row <= row2; row++) {
                for (column = col1; column <= col2; column++) {
                    if (sameChr && row < column) {
                        blockNumber = column * zd.blockColumnCount + row;
                    }
                    else {
                        blockNumber = row * zd.blockColumnCount + column;
                    }

                    dataset = ('B' === self.displayMode ? self.browser.controlDataset : self.browser.dataset);
                    promises.push(dataset.getNormalizedBlock(zd, blockNumber, normalization))
                }
            }

            return Promise.all(promises)
                .then(function (blocks) {
                   
                    var s = computePercentile(blocks, 95);

                    if (!isNaN(s)) {  // Can return NaN if all blocks are empty

                        if (0 === zd.chr1.index)  s *= 4;   // Heuristic for whole genome view

                        self.colorScale.high = s;
                        self.computeColorScale = false;
                        self.browser.eventBus.post(hic.Event("ColorScale", self.colorScale));
                    }

                    return self.colorScale;

                })
        }

    }

    hic.ContactMatrixView.prototype.draw = function (imageTiles, zd) {

        var self = this,
            state = this.browser.state,
            blockBinCount = zd.blockBinCount,
            viewportWidth = self.$viewport.width(),
            viewportHeight = self.$viewport.height(),
            canvasWidth = this.$canvas.width(),
            canvasHeight = this.$canvas.height();

        if (canvasWidth !== viewportWidth || canvasHeight !== viewportHeight) {
            this.$canvas.width(viewportWidth);
            this.$canvas.height(viewportHeight);
            this.$canvas.attr('width', this.$viewport.width());
            this.$canvas.attr('height', this.$viewport.height());
        }

        self.ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        imageTiles.forEach(function (imageTile) {

            var image = imageTile.image,
                pixelSizeInt = Math.max(1, Math.floor(state.pixelSize));

            if (image != null) {
                var row = imageTile.row,
                    col = imageTile.column,
                    x0 = blockBinCount * col,
                    y0 = blockBinCount * row;
                var offsetX = (x0 - state.x) * state.pixelSize;
                var offsetY = (y0 - state.y) * state.pixelSize;
                var scale = state.pixelSize / pixelSizeInt;
                var scaledWidth = image.width * scale;
                var scaledHeight = image.height * scale;
                if (offsetX <= viewportWidth && offsetX + scaledWidth >= 0 &&
                    offsetY <= viewportHeight && offsetY + scaledHeight >= 0) {
                    if (scale === 1) {
                        self.ctx.drawImage(image, offsetX, offsetY);
                    }
                    else {
                        self.ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
                    }
                }
            }
        })

    };

    /**
     * Returns a promise for an image tile
     *
     * @param zd
     * @param row
     * @param column
     * @param state
     * @returns {*}
     */
    hic.ContactMatrixView.prototype.getImageTile = function (zd, zdControl, row, column, state) {

        var self = this,
            sameChr = zd.chr1 === zd.chr2,
            pixelSizeInt = Math.max(1, Math.floor(state.pixelSize)),
            useImageData = pixelSizeInt === 1,
            key = "" + zd.chr1.name + "_" + zd.chr2.name + "_" + zd.zoom.binSize + "_" + zd.zoom.unit +
                "_" + row + "_" + column + "_" + pixelSizeInt + "_" + state.normalization + "_" + this.displayMode;

        if (this.imageTileCache.hasOwnProperty(key)) {

            return Promise.resolve(this.imageTileCache[key]);

        } else {

            var blockBinCount = zd.blockBinCount,
                blockColumnCount = zd.blockColumnCount,
                widthInBins = zd.blockBinCount,
                transpose = sameChr && row < column,
                blockNumber,
                t;

            if (sameChr && row < column) {
                blockNumber = column * blockColumnCount + row;
            }
            else {
                blockNumber = row * blockColumnCount + column;
            }

            return getNormalizedBlocks.call(self, zd, zdControl, blockNumber, state.normalization)

                .then(function (blocks) {

                    var block = blocks[0],
                        controlBlock,
                        image;

                    if (blocks.length > 0) controlBlock = blocks[1];

                    if (block && block.records.length > 0) {
                        image = drawBlock(block, controlBlock, transpose);
                    }
                    else {
                        //console.log("No block for " + blockNumber);
                    }

                    var imageTile = {row: row, column: column, image: image};


                    if (self.imageTileCacheKeys.length > self.imageTileCacheLimit) {
                        delete self.imageTileCache[self.imageTileCacheKeys[0]];
                        self.imageTileCacheKeys.shift();
                    }

                    self.imageTileCache[key] = imageTile;

                    return imageTile;

                    function setPixel(imageData, x, y, r, g, b, a) {
                        index = (x + y * imageData.width) * 4;
                        imageData.data[index + 0] = r;
                        imageData.data[index + 1] = g;
                        imageData.data[index + 2] = b;
                        imageData.data[index + 3] = a;
                    }

                    // Actual drawing happens here
                    function drawBlock(block, controlBlock, transpose) {

                        var imageSize = Math.ceil(widthInBins * pixelSizeInt),
                            blockNumber, row, col, x0, y0, image, ctx, id, i, rec, x, y, color,
                            controlRecords, controlRec, key, score;

                        blockNumber = block.blockNumber;
                        row = Math.floor(blockNumber / blockColumnCount);
                        col = blockNumber - row * blockColumnCount;
                        x0 = blockBinCount * col;
                        y0 = blockBinCount * row;

                        image = document.createElement('canvas');
                        image.width = imageSize;
                        image.height = imageSize;
                        ctx = image.getContext('2d');
                        ctx.clearRect(0, 0, image.width, image.height);

                        if ('AOB' === self.displayMode || 'AMB' === self.displayMode) {
                            controlRecords = {};
                            controlBlock.records.forEach(function (record) {
                                controlRecords[record.getKey()] = record;
                            })


                        }

                        if (useImageData) {
                            id = ctx.getImageData(0, 0, image.width, image.height);
                        }

                        var averageCount = zd.averageCount;
                        var ctrlAverageCount = zdControl ? zdControl.averageCount : 1;
                        var averageAcrossMapAndControl = (averageCount + ctrlAverageCount) / 2;


                        for (i = 0; i < block.records.length; i++) {

                            rec = block.records[i];
                            x = Math.floor((rec.bin1 - x0) * pixelSizeInt);
                            y = Math.floor((rec.bin2 - y0) * pixelSizeInt);

                            if (transpose) {
                                t = y;
                                y = x;
                                x = t;
                            }

                            switch (self.displayMode) {

                                case 'AOB':

                                    key = rec.getKey();
                                    controlRec = controlRecords[key];
                                    if (!controlRec) {
                                        continue;    // Skip
                                    }
                                    score = (rec.counts / averageCount) / (controlRec.counts / ctrlAverageCount);

                                    color = self.ratioColorScale.getColor(score);

                                    break;

                                case 'AMB':
                                    key = rec.getKey();
                                    controlRec = controlRecords[key];
                                    if (!controlRec) {
                                        continue;    // Skip
                                    }
                                    score = averageAcrossMapAndControl * ((rec.counts / averageCount) - (controlRec.counts / ctrlAverageCount));

                                    color = self.diffColorScale.getColor(score);

                                    break;

                                default:    // Either 'A' or 'B'
                                    color = self.colorScale.getColor(rec.counts);
                            }


                            if (useImageData) {
                                // TODO -- verify that this bitblting is faster than fillRect
                                setPixel(id, x, y, color.red, color.green, color.blue, 255);
                                if (sameChr && row === col) {
                                    setPixel(id, y, x, color.red, color.green, color.blue, 255);
                                }
                            }
                            else {
                                ctx.fillStyle = color.rgb;
                                ctx.fillRect(x, y, pixelSizeInt, pixelSizeInt);
                                if (sameChr && row === col) {
                                    ctx.fillRect(y, x, pixelSizeInt, pixelSizeInt);
                                }
                            }
                        }
                        if (useImageData) {
                            ctx.putImageData(id, 0, 0);
                        }

                        //Draw 2D tracks
                        ctx.save();
                        ctx.lineWidth = 2;
                        self.browser.tracks2D.forEach(function (track2D) {

                            if (track2D.isVisible) {
                                var features = track2D.getFeatures(zd.chr1.name, zd.chr2.name);

                                if (features) {
                                    features.forEach(function (f) {

                                        var x1 = Math.round((f.x1 / zd.zoom.binSize - x0) * pixelSizeInt);
                                        var x2 = Math.round((f.x2 / zd.zoom.binSize - x0) * pixelSizeInt);
                                        var y1 = Math.round((f.y1 / zd.zoom.binSize - y0) * pixelSizeInt);
                                        var y2 = Math.round((f.y2 / zd.zoom.binSize - y0) * pixelSizeInt);
                                        var w = x2 - x1;
                                        var h = y2 - y1;

                                        if (transpose) {
                                            t = y1;
                                            y1 = x1;
                                            x1 = t;

                                            t = h;
                                            h = w;
                                            w = t;
                                        }

                                        var dim = Math.max(image.width, image.height);
                                        if (x2 > 0 && x1 < dim && y2 > 0 && y1 < dim) {

                                            ctx.strokeStyle = track2D.color ? track2D.color : f.color;
                                            ctx.strokeRect(x1, y1, w, h);
                                            if (sameChr && row === col) {
                                                ctx.strokeRect(y1, x1, h, w);
                                            }
                                        }
                                    })
                                }
                            }
                        });

                        ctx.restore();

                        // Uncomment to reveal tile boundaries for debugging.
                        // ctx.fillStyle = "rgb(255,255,255)";
                        // ctx.strokeRect(0, 0, image.width - 1, image.height - 1)

                        var t1 = (new Date()).getTime();

                        //console.log(t1 - t0);

                        return image;
                    }
                })
        }

        function getNormalizedBlocks(zd, zdControl, blockNumber, normalization) {
            var promises = [];

            var dataset = 'B' === this.displayMode ? this.browser.controlDataset : this.browser.dataset;
            promises.push(dataset.getNormalizedBlock(zd, blockNumber, normalization));

            if (zdControl) {
                promises.push(this.browser.controlDataset.getNormalizedBlock(zdControl, blockNumber, normalization));
            }

            return Promise.all(promises);

        }
    };

    function computePercentile(blockArray, p) {

        var array = [];
        blockArray.forEach(function (block) {
            if (block) {
                for (i = 0; i < block.records.length; i++) {
                    array.push(block.records[i].counts);
                }
            }
        });

        return hic.Math.percentile(array, p);

    }

    hic.ContactMatrixView.prototype.startSpinner = function () {

        if (true === this.browser.isLoadingHICFile && this.browser.$user_interaction_shield) {
            this.browser.$user_interaction_shield.show();
        }

        this.$fa_spinner.css("display", "inline-block");
    };

    hic.ContactMatrixView.prototype.stopSpinner = function () {

        this.$fa_spinner.css("display", "none");

    };


    function addMouseHandlers($viewport) {

        var self = this,
            isMouseDown = false,
            isDragging = false,
            isSweepZooming = false,
            mouseDown,
            mouseLast,
            mouseOver,
            lastWheelTime;

        if (!this.browser.isMobile) {

            $viewport.dblclick(function (e) {

                e.preventDefault();
                e.stopPropagation();

                var mouseX = e.offsetX || e.layerX,
                    mouseY = e.offsetY || e.layerX;

                self.browser.zoomAndCenter(1, mouseX, mouseY);

            });

            $viewport.on('mouseover', function (e) {
                mouseOver = true;
            });

            $viewport.on('mouseout', function (e) {
                mouseOver = undefined;
            });

            $viewport.on('mousedown', function (e) {
                var eFixed;

                e.preventDefault();
                e.stopPropagation();

                if (self.browser.$menu.is(':visible')) {
                    self.browser.hideMenu();
                }

                mouseLast = {x: e.offsetX, y: e.offsetY};
                mouseDown = {x: e.offsetX, y: e.offsetY};

                isSweepZooming = (true === e.altKey);
                if (isSweepZooming) {
                    eFixed = $.event.fix(e);
                    self.sweepZoom.initialize({x: eFixed.pageX, y: eFixed.pageY});
                }

                isMouseDown = true;

            });

            $viewport.on('mousemove', hic.throttle(function (e) {

                var coords,
                    eFixed,
                    xy;

                e.preventDefault();
                e.stopPropagation();

                coords =
                {
                    x: e.offsetX,
                    y: e.offsetY
                };

                // Sets pageX and pageY for browsers that don't support them
                eFixed = $.event.fix(e);

                xy =
                {
                    x: eFixed.pageX - $viewport.offset().left,
                    y: eFixed.pageY - $viewport.offset().top
                };

                self.browser.eventBus.post(hic.Event("UpdateContactMapMousePosition", xy, false));

                if (true === self.willShowCrosshairs) {
                    self.browser.updateCrosshairs(xy);
                    self.browser.showCrosshairs();
                }

                if (isMouseDown) { // Possibly dragging

                    if (isSweepZooming) {

                        self.sweepZoom.update({x: eFixed.pageX, y: eFixed.pageY});

                    } else if (mouseDown.x && Math.abs(coords.x - mouseDown.x) > DRAG_THRESHOLD) {

                        isDragging = true;

                        var dx = mouseLast.x - coords.x;
                        var dy = mouseLast.y - coords.y;

                        // If matrix data is updating shift current map image while we wait
                        if (self.updating) {
                            shiftCurrentImage(self, -dx, -dy);
                        }

                        self.browser.shiftPixels(dx, dy);

                    }

                    mouseLast = coords;
                }


            }, 10));

            $viewport.on('mouseup', panMouseUpOrMouseOut);

            $viewport.on('mouseleave', function () {

                self.browser.layoutController.xAxisRuler.unhighlightWholeChromosome();
                self.browser.layoutController.yAxisRuler.unhighlightWholeChromosome();

                panMouseUpOrMouseOut();
            });

            // Mousewheel events -- ie exposes event only via addEventListener, no onwheel attribute
            // NOte from spec -- trackpads commonly map pinch to mousewheel + ctrl

            if (!self.browser.figureMode) {
                $viewport[0].addEventListener("wheel", mouseWheelHandler, 250, false);
            }

            // Document level events
            $(document).on({

                keydown: function (e) {
                    if (undefined === self.willShowCrosshairs && true === mouseOver && true === e.shiftKey) {
                        self.willShowCrosshairs = true;
                    }
                },

                keyup: function (e) {
                    if (/*true === e.shiftKey*/true) {
                        self.browser.hideCrosshairs();
                        self.willShowCrosshairs = undefined;
                    }
                },

                // for sweep-zoom allow user to sweep beyond viewport extent
                // sweep area clamps since viewport mouse handlers stop firing
                // when the viewport boundary is crossed.
                mouseup: function (e) {

                    e.preventDefault();
                    e.stopPropagation();

                    if (isSweepZooming) {
                        isSweepZooming = false;
                        self.sweepZoom.commit();
                    }

                }
            });
        }

        function panMouseUpOrMouseOut(e) {

            if (true === isDragging) {
                isDragging = false;
                self.browser.eventBus.post(hic.Event("DragStopped"));
            }

            isMouseDown = false;
            mouseDown = mouseLast = undefined;
        }

        function mouseWheelHandler(e) {

            e.preventDefault();
            e.stopPropagation();

            var t = Date.now();

            if (lastWheelTime === undefined || (t - lastWheelTime > 1000)) {

                // cross-browser wheel delta  -- Firefox returns a "detail" object that is opposite in sign to wheelDelta
                var direction = e.deltaY < 0 ? 1 : -1,
                    coords = igv.translateMouseCoordinates(e, $viewport),
                    x = coords.x,
                    y = coords.y;
                self.browser.wheelClickZoom(direction, x, y);
                lastWheelTime = t;
            }

        }


        function shiftCurrentImage(self, dx, dy) {
            var canvasWidth = self.$canvas.width(),
                canvasHeight = self.$canvas.height(),
                imageData;

            imageData = self.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            self.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            self.ctx.putImageData(imageData, dx, dy);
        }

    }


    /**
     * Add touch handlers.  Touches are mapped to one of the following application level events
     *  - double tap, equivalent to double click
     *  - move
     *  - pinch
     *
     * @param $viewport
     */

    function addTouchHandlers($viewport) {

        var self = this,

            lastTouch, pinch,
            viewport = $viewport[0];

        /**
         * Touch start -- 3 possibilities
         *   (1) beginning of a drag (pan)
         *   (2) first tap of a double tap
         *   (3) beginning of a pinch
         */
        viewport.ontouchstart = function (ev) {

            ev.preventDefault();
            ev.stopPropagation();

            var touchCoords = translateTouchCoordinates(ev.targetTouches[0], viewport),
                offsetX = touchCoords.x,
                offsetY = touchCoords.y,
                count = ev.targetTouches.length,
                timeStamp = ev.timeStamp || Date.now(),
                resolved = false,
                dx, dy, dist, direction;

            if (count === 2) {
                touchCoords = translateTouchCoordinates(ev.targetTouches[0], viewport);
                offsetX = (offsetX + touchCoords.x) / 2;
                offsetY = (offsetY + touchCoords.y) / 2;
            }

            // NOTE: If the user makes simultaneous touches, the browser may fire a
            // separate touchstart event for each touch point. Thus if there are
            // two simultaneous touches, the first touchstart event will have
            // targetTouches length of one and the second event will have a length
            // of two.  In this case replace previous touch with this one and return
            if (lastTouch && (timeStamp - lastTouch.timeStamp < DOUBLE_TAP_TIME_THRESHOLD) && ev.targetTouches.length > 1 && lastTouch.count === 1) {
                lastTouch = {x: offsetX, y: offsetY, timeStamp: timeStamp, count: ev.targetTouches.length};
                return;
            }


            if (lastTouch && (timeStamp - lastTouch.timeStamp < DOUBLE_TAP_TIME_THRESHOLD)) {

                direction = (lastTouch.count === 2 || count === 2) ? -1 : 1;
                dx = lastTouch.x - offsetX;
                dy = lastTouch.y - offsetY;
                dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < DOUBLE_TAP_DIST_THRESHOLD) {
                    self.browser.zoomAndCenter(direction, offsetX, offsetY);
                    lastTouch = undefined;
                    resolved = true;
                }
            }

            if (!resolved) {
                lastTouch = {x: offsetX, y: offsetY, timeStamp: timeStamp, count: ev.targetTouches.length};
            }
        }

        viewport.ontouchmove = hic.throttle(function (ev) {

            var touchCoords1, touchCoords2, t;

            ev.preventDefault();
            ev.stopPropagation();

            if (ev.targetTouches.length === 2) {

                // Update pinch  (assuming 2 finger movement is a pinch)
                touchCoords1 = translateTouchCoordinates(ev.targetTouches[0], viewport);
                touchCoords2 = translateTouchCoordinates(ev.targetTouches[1], viewport);

                t = {
                    x1: touchCoords1.x,
                    y1: touchCoords1.y,
                    x2: touchCoords2.x,
                    y2: touchCoords2.y
                };

                if (pinch) {
                    pinch.end = t;
                } else {
                    pinch = {start: t};
                }
            }

            else {
                // Assuming 1 finger movement is a drag

                if (self.updating) return;   // Don't overwhelm browser

                var touchCoords = translateTouchCoordinates(ev.targetTouches[0], viewport),
                    offsetX = touchCoords.x,
                    offsetY = touchCoords.y;
                if (lastTouch) {
                    var dx = lastTouch.x - offsetX,
                        dy = lastTouch.y - offsetY;
                    if (!isNaN(dx) && !isNaN(dy)) {
                        self.browser.shiftPixels(lastTouch.x - offsetX, lastTouch.y - offsetY);
                    }
                }

                lastTouch = {
                    x: offsetX,
                    y: offsetY,
                    timeStamp: ev.timeStamp || Date.now(),
                    count: ev.targetTouches.length
                };
            }

        }, 20);

        viewport.ontouchend = function (ev) {

            ev.preventDefault();
            ev.stopPropagation();

            if (pinch && pinch.end !== undefined) {

                var startT = pinch.start,
                    endT = pinch.end,
                    dxStart = startT.x2 - startT.x1,
                    dyStart = startT.y2 - startT.y1,
                    dxEnd = endT.x2 - endT.x1,
                    dyEnd = endT.y2 - endT.y1,
                    distStart = Math.sqrt(dxStart * dxStart + dyStart * dyStart),
                    distEnd = Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd),
                    scale = distEnd / distStart,
                    deltaX = (endT.x1 + endT.x2) / 2 - (startT.x1 + startT.x2) / 2,
                    deltaY = (endT.y1 + endT.y2) / 2 - (startT.y1 + startT.y2) / 2,
                    anchorPx = (startT.x1 + startT.x2) / 2,
                    anchorPy = (startT.y1 + startT.y2) / 2;

                if (scale < 0.8 || scale > 1.2) {
                    lastTouch = undefined;
                    self.browser.pinchZoom(anchorPx, anchorPy, scale);
                }
            }

            // a touch end always ends a pinch
            pinch = undefined;

        }

        function translateTouchCoordinates(e, target) {

            var $target = $(target),
                eFixed,
                posx,
                posy;

            posx = e.pageX - $target.offset().left;
            posy = e.pageY - $target.offset().top;

            return {x: posx, y: posy}
        }

    }


    hic.ColorScale = function (scale) {
        this.high = scale.high;
        this.r = scale.r;
        this.g = scale.g;
        this.b = scale.b;
    };

    hic.ColorScale.prototype.setThreshold = function (threshold) {
        this.high = threshold;
    }

    hic.ColorScale.prototype.getThreshold = function () {
        return this.high;
    }

    hic.ColorScale.prototype.setColorComponents = function (components) {
        this.r = components.r;
        this.g = components.g;
        this.b = components.b;
    }

    hic.ColorScale.prototype.getColorComponents = function () {
        return {
            r: this.r,
            g: this.g,
            b: this.b
        }
    }


    hic.ColorScale.prototype.equals = function (cs) {
        return JSON.stringify(this) === JSON.stringify(cs);
    };

    hic.ColorScale.prototype.getColor = function (value) {
        var scale = this, r, g, b, frac, diff, low, lowR, lowG, lowB;

        low = 0;
        lowR = 255;
        lowB = 255;
        lowG = 255;

        if (value <= low) value = low;
        else if (value >= scale.high) value = scale.high;

        diff = scale.high - low;

        frac = (value - low) / diff;
        r = Math.floor(lowR + frac * (scale.r - lowR));
        g = Math.floor(lowG + frac * (scale.g - lowG));
        b = Math.floor(lowB + frac * (scale.b - lowB));

        return {
            red: r,
            green: g,
            blue: b,
            rgb: "rgb(" + r + "," + g + "," + b + ")"
        };
    };

    hic.ColorScale.prototype.stringify = function () {
        return "" + this.high + ',' + this.r + ',' + this.g + ',' + this.b;
    };

    function RatioColorScale(threshold, logTransform) {

        this.threshold = threshold;
        this.logTransform = (logTransform === undefined ? true : logTransform);

        this.positiveScale = new hic.ColorScale({
            high: Math.log(threshold),
            r: 255,
            g: 0,
            b: 0
        });
        this.negativeScale = new hic.ColorScale(
            {
                high: Math.log(threshold),
                r: 0,
                g: 0,
                b: 255
            })
    }

    RatioColorScale.prototype.setThreshold = function (threshold) {
        this.threshold = threshold;
        this.positiveScale.high = Math.log(threshold);
        this.negativeScale.high = Math.log(threshold);
    }

    RatioColorScale.prototype.getThreshold = function () {
        return this.threshold;
    }

    RatioColorScale.prototype.setColorComponents = function (components, plusOrMinus) {
        if ('-' === plusOrMinus) {
            return this.negativeScale.setColorComponents(components);
        }
        else {
            return this.positiveScale.setColorComponents(components);
        }
    }

    RatioColorScale.prototype.getColorComponents = function (plusOrMinus) {

        if ('-' === plusOrMinus) {
            return this.negativeScale.getColorComponents();
        }
        else {
            return this.positiveScale.getColorComponents();
        }
    }

    RatioColorScale.prototype.getColor = function (score) {

        var logScore = this.logTransform ? Math.log(score) : score;

        if (logScore < 0) {
            return this.negativeScale.getColor(-logScore);
        }
        else {
            return this.positiveScale.getColor(logScore);
        }
    }

    RatioColorScale.prototype.stringify = function () {
        return "R:" + this.threshold + ":" + this.positiveScale.stringify() + ":" + this.negativeScale.stringify();
    };


    hic.destringifyColorScale = function (string) {

        var pnstr, ratioCS;

        if (string.startsWith("R:")) {
            pnstr = string.subString(2).split(":");
            ratioCS = new RatioColorScale(Number.parseFloat(pnstr[0]));
            ratioCS.positiveScale = foo(pnstr[1]);
            ratioCS.negativeScale = foo(pnstr[2]);
            return ratioCS;
        }

        else {
            return foo(string);
        }

        function foo(str) {
            var cs, tokens;

            tokens = str.split(",");

            cs = {
                high: tokens[0],
                r: tokens[1],
                g: tokens[2],
                b: tokens[3]
            };
            return new hic.ColorScale(cs);
        }

    };

    return hic;

})
(hic || {});
