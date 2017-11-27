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
            low: 0,
            lowR: 255,
            lowG: 255,
            lowB: 255,
            high: 2000,
            highR: 255,
            highG: 0,
            highB: 0
        };

    hic.ContactMatrixView = function (browser, $container) {
        var id;

        this.browser = browser;

        this.scrollbarWidget = new hic.ScrollbarWidget(browser);

        id = browser.id + '_' + 'viewport';
        this.$viewport = $("<div>", {id: id});
        $container.append(this.$viewport);

        //content canvas
        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);

        // this.$canvas.attr('width', this.$viewport.width());
        // this.$canvas.attr('height', this.$viewport.height());
        // this.ctx = this.$canvas.get(0).getContext("2d");

        //spinner
        id = browser.id + '_' + 'viewport-spinner-container';
        this.$spinner = $("<div>", {id: id});
        this.$viewport.append(this.$spinner);

        // throbber
        // size: see $hic-viewport-spinner-size in .scss files
        // this.throbber = Throbber({color: 'rgb(64, 64, 64)', size: 120, padding: 40}).appendTo(this.$spinner.get(0));
        this.throbber = Throbber({color: 'rgb(64, 64, 64)', size: 64, padding: 16}).appendTo(this.$spinner.get(0));
        this.stopSpinner();

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

        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
        // Cache at most 20 image tiles
        this.imageTileCacheLimit = browser.isMobile ? 4 : 20;

        this.colorScale = new hic.ColorScale(defaultColorScaleInitializer);

        this.colorScaleCache = {};

        this.browser.eventBus.subscribe("LocusChange", this);
        this.browser.eventBus.subscribe("NormalizationChange", this);
        this.browser.eventBus.subscribe("TrackLoad2D", this);
        this.browser.eventBus.subscribe("TrackState2D", this);

    };

    hic.ContactMatrixView.prototype.setInitialImage = function (x, y, image, state) {
        this.initialImage = {
            x: x,
            y: y,
            state: state.clone(),
            img: image
        }
    };

    hic.ContactMatrixView.prototype.datasetUpdated = function () {
        // This should probably be an event
        // Don't enable mouse actions until we have a dataset.
        if (!this.mouseHandlersEnabled) {
            addMouseHandlers.call(this, this.$viewport);
            this.mouseHandlersEnabled = true;
        }

        this.updating = false;
        this.clearCaches();
        this.colorScaleCache = {};
        this.update();
    };

    hic.ContactMatrixView.prototype.setColorScale = function (options, state) {

        if (options.high) this.colorScale.high = options.high;
        if (undefined !== options.highR) this.colorScale.highR = options.highR;
        if (undefined !== options.highG) this.colorScale.highG = options.highG;
        if (undefined !== options.highB) this.colorScale.highB = options.highB;

        if (!state) {
            state = this.browser.state;
        }
        this.colorScaleCache[colorScaleKey(state)] = options.high;
    };

    function colorScaleKey(state) {
        return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization;
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
        // Perhaps in the future we'll do something special based on event type & properties

        if ("NormalizationChange" === event.type || "TrackLoad2D" === event.type || "TrackState2D" === event.type) {
            this.clearCaches();
        }

        if (this.initialImage) {
            if (!validateInitialImage.call(this, this.initialImage, event.data.state)) {
                this.initialImage = undefined;
                this.startSpinner();
            }
        }

        this.update();

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

        var self = this,
            state = this.browser.state;

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

        self.updating = true;

        self.startSpinner();

        self.browser.dataset.getMatrix(state.chr1, state.chr2)

            .then(function (matrix) {

                if(matrix) {

                    var zd = matrix.bpZoomData[state.zoom],
                        blockBinCount = zd.blockBinCount,   // Dimension in bins of a block (width = height = blockBinCount)
                        pixelSizeInt = Math.max(1, Math.floor(state.pixelSize)),
                        widthInBins = self.$viewport.width() / pixelSizeInt,
                        heightInBins = self.$viewport.height() / pixelSizeInt,
                        blockCol1 = Math.floor(state.x / blockBinCount),
                        blockCol2 = Math.floor((state.x + widthInBins) / blockBinCount),
                        blockRow1 = Math.floor(state.y / blockBinCount),
                        blockRow2 = Math.floor((state.y + heightInBins) / blockBinCount),
                        r, c, promises = [];

                    self.checkColorScale(zd, blockRow1, blockRow2, blockCol1, blockCol2, state.normalization)

                        .then(function () {

                            for (r = blockRow1; r <= blockRow2; r++) {
                                for (c = blockCol1; c <= blockCol2; c++) {
                                    promises.push(self.getImageTile(zd, r, c, state));
                                }
                            }

                            Promise.all(promises)
                                .then(function (imageTiles) {
                                    self.updating = false;
                                    self.draw(imageTiles, zd);
                                    self.stopSpinner();
                                })
                                .catch(function (error) {
                                    self.updating = false;
                                    self.stopSpinner();
                                    console.error(error);
                                })

                        })
                        .catch(function (error) {
                            self.updating = false;
                            self.stopSpinner(self);
                            console.error(error);
                        })
                }
            })
            .catch(function (error) {
                self.updating = false;
                self.stopSpinner();
                console.error(error);
            })
    };

    hic.ContactMatrixView.prototype.checkColorScale = function (zd, row1, row2, col1, col2, normalization) {

        var self = this;

        var colorKey = colorScaleKey(self.browser.state);   // This doesn't feel right, state should be an argument
        if (self.colorScaleCache[colorKey]) {
            var changed = self.colorScale.high !== self.colorScaleCache[colorKey];
            self.colorScale.high = self.colorScaleCache[colorKey];
            if (changed) self.browser.eventBus.post(hic.Event("ColorScale", self.colorScale));
            return Promise.resolve();
        }

        else {
            self.startSpinner();

            return new Promise(function (fulfill, reject) {

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

                        promises.push(self.browser.dataset.getNormalizedBlock(zd, blockNumber, normalization))
                    }
                }

                Promise.all(promises)
                    .then(function (blocks) {
                        var s = computePercentile(blocks, 95);

                        if (!isNaN(s)) {  // Can return NaN if all blocks are empty

                            if(0 === zd.chr1.index)  s *= 4;   // Heuristic for whole genome view

                            self.colorScale.high = s;
                            self.computeColorScale = false;
                            self.colorScaleCache[colorKey] = s;
                            self.browser.eventBus.post(hic.Event("ColorScale", self.colorScale));
                        }

                        self.stopSpinner();

                        fulfill();

                    })
                    .catch(function (error) {
                        self.stopSpinner();
                        reject(error);
                    });
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
                var scaledHeight =image.height * scale;
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

    hic.ContactMatrixView.prototype.getImageTile = function (zd, row, column, state) {

        var self = this,
            sameChr = zd.chr1 === zd.chr2,
            pixelSizeInt = Math.max(1, Math.floor(state.pixelSize)),
            useImageData = pixelSizeInt === 1,
            key = "" + zd.chr1.name + "_" + zd.chr2.name + "_" + zd.zoom.binSize + "_" + zd.zoom.unit +
                "_" + row + "_" + column + "_" + pixelSizeInt + "_" + state.normalization;

        if (this.imageTileCache.hasOwnProperty(key)) {
            return Promise.resolve(this.imageTileCache[key]);
        } else {
            return new Promise(function (fulfill, reject) {

                var blockBinCount = zd.blockBinCount,
                    blockColumnCount = zd.blockColumnCount,
                    widthInBins = zd.blockBinCount,
                    transpose = sameChr && row < column,
                    blockNumber,
                    t;


                function setPixel(imageData, x, y, r, g, b, a) {
                    index = (x + y * imageData.width) * 4;
                    imageData.data[index + 0] = r;
                    imageData.data[index + 1] = g;
                    imageData.data[index + 2] = b;
                    imageData.data[index + 3] = a;
                }

                function drawBlock(block, transpose) {

                    var imageSize = Math.ceil(widthInBins * pixelSizeInt),
                        blockNumber, row, col, x0, y0, image, ctx, id, i, rec, x, y, color, px, py;

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

                    if (useImageData) {
                        id = ctx.getImageData(0, 0, image.width, image.height);
                    }

                    for (i = 0; i < block.records.length; i++) {
                        rec = block.records[i];
                        x = Math.floor((rec.bin1 - x0) * pixelSizeInt);
                        y = Math.floor((rec.bin2 - y0) * pixelSizeInt);

                        if (transpose) {
                            t = y;
                            y = x;
                            x = t;
                        }

                        color = self.colorScale.getColor(rec.counts);

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
                        var color;

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


                if (sameChr && row < column) {
                    blockNumber = column * blockColumnCount + row;
                }
                else {
                    blockNumber = row * blockColumnCount + column;
                }

                self.startSpinner();

                self.browser.dataset.getNormalizedBlock(zd, blockNumber, state.normalization)

                    .then(function (block) {

                        var image;
                        if (block && block.records.length > 0) {
                            image = drawBlock(block, transpose);
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

                        self.stopSpinner();
                        fulfill(imageTile);

                    })
                    .catch(function (error) {
                        self.stopSpinner();
                        reject(error);
                    })
            })
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

        if (this.$spinner.is(':visible') !== true) {
            this.$spinner.show();
            this.throbber.start();
        }
    };

    hic.ContactMatrixView.prototype.stopSpinner = function () {

        if (this.browser.$user_interaction_shield) {
            this.browser.$user_interaction_shield.hide();
        }

        this.throbber.stop();
        this.$spinner.hide();
    };

    function shiftCurrentImage(self, dx, dy) {
        var canvasWidth = self.$canvas.width(),
            canvasHeight = self.$canvas.height(),
            imageData;

        imageData = self.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        self.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        self.ctx.putImageData(imageData, dx, dy);
    }

    function addMouseHandlers($viewport) {

        var self = this,
            isMouseDown = false,
            isDragging = false,
            isSweepZooming = false,
            mouseDown,
            mouseLast,
            mouseOver,
            lastTouch,
            pinch,
            viewport = $viewport[0],
            lastWheelTime;

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
                    self.sweepZoom.reset({x: eFixed.pageX, y: eFixed.pageY});
                }

                isMouseDown = true;

            });

            $viewport.on('mousemove', hic.throttle(function (e) {

                var coords, eFixed;


                e.preventDefault();
                e.stopPropagation();
                coords = {x: e.offsetX, y: e.offsetY};

                self.browser.updateCrosshairs(coords);

                if (isMouseDown) { // Possibly dragging

                    if (isSweepZooming) {
                        // Sets pageX and pageY for browsers that don't support them
                        eFixed = $.event.fix(e);
                        self.sweepZoom.update({x: eFixed.pageX, y: eFixed.pageY});
                    }

                    else if (mouseDown.x && Math.abs(coords.x - mouseDown.x) > DRAG_THRESHOLD) {

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

            $viewport.on('mouseleave', panMouseUpOrMouseOut);

            // Mousewheel events -- ie exposes event only via addEventListener, no onwheel attribute
            // NOte from spec -- trackpads commonly map pinch to mousewheel + ctrl

            if (!self.browser.figureMode) {
                $viewport[0].addEventListener("wheel", mouseWheelHandler, 250, false);
            }

            // Document level events
            $(document).on({

                keydown: function (e) {
                    // shift key
                    if (true === mouseOver && 16 === e.keyCode) {
                        self.browser.showCrosshairs();
                    }
                },

                keyup: function (e) {
                    // shift key
                    if (16 === e.keyCode) {
                        self.browser.hideCrosshairs();
                    }
                },

                // for sweep-zoom allow user to sweep beyond viewport extent
                // sweep area clamps since viewport mouse handlers stop firing
                // when the viewport boundary is crossed.
                mouseup: function (e) {

                    e.preventDefault()
                    e.stopPropagation();

                    if (isSweepZooming) {
                        isSweepZooming = false;
                        self.sweepZoom.dismiss();
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
                self.browser.zoomAndCenter(direction, x, y);
                lastWheelTime = t;
            }

        }

    }

    hic.ColorScale = function (scale) {
        this.low = scale.low;
        this.lowR = scale.lowR;
        this.lowG = scale.lowG;
        this.lowB = scale.lowB;
        this.high = scale.high;
        this.highR = scale.highR;
        this.highG = scale.highG;
        this.highB = scale.highB;
    };

    hic.ColorScale.prototype.equals = function (cs) {
        return JSON.stringify(this) === JSON.stringify(cs);
    };

    hic.ColorScale.prototype.getColor = function (value) {
        var scale = this, r, g, b, frac, diff;

        if (value <= scale.low) value = scale.low;
        else if (value >= scale.high) value = scale.high;

        diff = scale.high - scale.low;

        frac = (value - scale.low) / diff;
        r = Math.floor(scale.lowR + frac * (scale.highR - scale.lowR));
        g = Math.floor(scale.lowG + frac * (scale.highG - scale.lowG));
        b = Math.floor(scale.lowB + frac * (scale.highB - scale.lowB));

        return {
            red: r,
            green: g,
            blue: b,
            rgb: "rgb(" + r + "," + g + "," + b + ")"
        };
    };

    hic.ColorScale.prototype.stringify = function () {
        return "" + this.high + ',' + this.highR + ',' + this.highG + ',' + this.highB;
    };

    hic.destringifyColorScale = function (string) {

        var cs,
            tokens;

        tokens = string.split(",");

        cs = _.clone(defaultColorScaleInitializer);
        cs.high = tokens[ 0 ];
        cs.highR = tokens[ 1 ];
        cs.highG = tokens[ 2 ];
        cs.highB = tokens[ 3 ];

        return new hic.ColorScale(cs);

    };

    function translateTouchCoordinates(e, target) {

        var $target = $(target),
            eFixed,
            posx,
            posy;

        posx = e.pageX - $target.offset().left;
        posy = e.pageY - $target.offset().top;

        return {x: posx, y: posy}
    }

    return hic;

})
(hic || {});
