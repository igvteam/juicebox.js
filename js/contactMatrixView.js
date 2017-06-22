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

    dragThreshold = 2;

    hic.ContactMatrixView = function (browser, $container) {
        var id;

        this.browser = browser;


        this.scrollbarWidget = new hic.ScrollbarWidget(browser);

        id = browser.id + '_' + 'viewport';
        this.$viewport = $("<div>", { id:id });
        $container.append(this.$viewport);

        //content canvas
        this.$canvas = $('<canvas>');
        this.$viewport.append(this.$canvas);

        // this.$canvas.attr('width', this.$viewport.width());
        // this.$canvas.attr('height', this.$viewport.height());
        // this.ctx = this.$canvas.get(0).getContext("2d");

        //spinner
        id = browser.id + '_' + 'viewport-spinner-container';
        this.$spinner = $("<div>", { id:id });
        this.$viewport.append(this.$spinner);

        // throbber
        // size: see $hic-viewport-spinner-size in .scss files
        // this.throbber = Throbber({color: 'rgb(64, 64, 64)', size: 120, padding: 40}).appendTo(this.$spinner.get(0));
        this.throbber = Throbber({color: 'rgb(64, 64, 64)', size: 64, padding: 16}).appendTo(this.$spinner.get(0));
        this.stopSpinner();

        // ruler sweeper widget surface
        this.sweepZoom = new hic.SweepZoom(this.browser);
        this.$viewport.append(this.sweepZoom.$rulerSweeper);


        // x - guide
        id = browser.id + '_' + 'x-guide';
        this.$x_guide = $("<div>", { id:id });
        this.$viewport.append(this.$x_guide);

        // y - guide
        id = browser.id + '_' + 'y-guide';
        this.$y_guide = $("<div>", { id:id });
        this.$viewport.append(this.$y_guide);


        $container.append(this.scrollbarWidget.$y_axis_scrollbar_container);


        addMouseHandlers.call(this, this.$viewport);

        this.imageTileCache = {};
        this.imageTileCacheKeys = [];

        this.colorScale = new hic.ColorScale(
            {
                low: 0,
                lowR: 255,
                lowG: 255,
                lowB: 255,
                high: 2000,
                highR: 255,
                highG: 0,
                highB: 0
            }
        );
        this.computeColorScale = true;

        this.browser.eventBus.subscribe("LocusChange", this);
        this.browser.eventBus.subscribe("NormalizationChange", this);

    };

    hic.ContactMatrixView.prototype.setDataset = function (dataset) {

        this.dataset = dataset;
        this.clearCaches();
        this.update();
    };

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

        if ("NormalizationChange" === event.type) {
            this.clearCaches();
        }

        this.update();

    };

    hic.ContactMatrixView.prototype.update = function () {

        var self = this,
            state = this.browser.state;

        if (!this.ctx) {
            this.ctx = this.$canvas.get(0).getContext("2d");
        }

        if (!this.dataset) return;

        this.updating = true;

        this.dataset.getMatrix(state.chr1, state.chr2)

            .then(function (matrix) {

                var widthInBins = self.$viewport.width() / state.pixelSize,
                    heightInBins = self.$viewport.height() / state.pixelSize,
                    zd = matrix.bpZoomData[state.zoom],
                    blockBinCount = zd.blockBinCount,
                    col1 = Math.floor(state.x / blockBinCount),
                    col2 = Math.floor((state.x + widthInBins) / blockBinCount),
                    row1 = Math.floor(state.y / blockBinCount),
                    row2 = Math.floor((state.y + heightInBins) / blockBinCount),
                    r, c, promises = [];

                self.checkColorScale(zd, row1, row2, col1, col2, state.normalization)

                    .then(function () {

                        for (r = row1; r <= row2; r++) {
                            for (c = col1; c <= col2; c++) {
                                promises.push(self.getImageTile(zd, r, c));
                            }
                        }

                        Promise.all(promises)
                            .then(function (imageTiles) {
                                self.draw(imageTiles, zd);
                                self.updating = false;
                            })
                            .catch(function (error) {
                                self.stopSpinner();
                                self.updating = false;
                                console.error(error);
                            })

                    })
                    .catch(function (error) {
                        self.stopSpinner(self);
                        self.updating = false;
                        console.error(error);
                    })
            })
            .catch(function (error) {
                self.stopSpinner();
                self.updating = false;
                console.error(error);
            })
    };

    hic.ContactMatrixView.prototype.checkColorScale = function (zd, row1, row2, col1, col2, normalization) {

        var self = this;

        if (!self.computeColorScale) {
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

                        promises.push(self.dataset.getNormalizedBlock(zd, blockNumber, normalization))
                    }
                }

                Promise.all(promises)
                    .then(function (blocks) {

                        var s = computePercentile(blocks, 95);
                        if (!isNaN(s)) {  // Can return NaN if all blocks are empty
                            self.colorScale.high = s;
                            self.computeColorScale = false;
                            self.browser.eventBus.post(hic.Event("ColorScale", self.colorScale));
                        }

                        self.stopSpinner();

                        fulfill();

                    })
                    .catch(function(error) {
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

            var image = imageTile.image;

            if (image != null) {
                var row = imageTile.row,
                    col = imageTile.column,
                    x0 = blockBinCount * col,
                    y0 = blockBinCount * row;
                var offsetX = (x0 - state.x) * state.pixelSize;
                var offsetY = (y0 - state.y) * state.pixelSize;
                if (offsetX <= viewportWidth && offsetX + image.width >= 0 &&
                    offsetY <= viewportHeight && offsetY + image.height >= 0) {
                    self.ctx.drawImage(image, offsetX, offsetY);
                }
            }
        })

    };

    hic.ContactMatrixView.prototype.getImageTile = function (zd, row, column, block) {

        var self = this,
            sameChr = zd.chr1 === zd.chr2,
            key = "" + zd.chr1.name + "_" + zd.chr2.name + "_" + zd.zoom.binSize + "_" + zd.zoom.unit + "_" + row + "_" + column;

        if (this.imageTileCache.hasOwnProperty(key)) {
            return Promise.resolve(this.imageTileCache[key]);
        } else {
            return new Promise(function (fulfill, reject) {

                var state = self.browser.state,
                    blockBinCount = zd.blockBinCount,
                    blockColumnCount = zd.blockColumnCount,
                    widthInBins = zd.blockBinCount,
                    imageSize = widthInBins * state.pixelSize,
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

                    var blockNumber,
                        row,
                        col,
                        x0,
                        y0,
                        image,
                        ctx,
                        id,
                        i,
                        rec,
                        x,
                        y,
                        color,
                        fudge;

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

                    id = ctx.getImageData(0, 0, image.width, image.height);
                    fudge = 0.5;

                    // console.log('block records ' + _.size(block.records) + ' pixel size ' + state.pixelSize);

                    for (i = 0; i < block.records.length; i++) {
                        rec = block.records[i];
                        x = Math.floor((rec.bin1 - x0) * state.pixelSize);
                        y = Math.floor((rec.bin2 - y0) * state.pixelSize);

                        if (transpose) {
                            t = y;
                            y = x;
                            x = t;
                        }

                        color = self.colorScale.getColor(rec.counts);
                        ctx.fillStyle = color.rgb;

                        if (state.pixelSize === 1) {
                            // TODO -- verify that this bitblting is faster than fillRect
                            setPixel(id, x, y, color.red, color.green, color.blue, 255);
                            if (sameChr && row === col) {
                                setPixel(id, y, x, color.red, color.green, color.blue, 255);
                            }
                        }
                        else {
                            ctx.fillRect(x, y, fudge + state.pixelSize, fudge + state.pixelSize);
                            if (sameChr && row === col) {
                                ctx.fillRect(y, x, fudge + state.pixelSize, fudge + state.pixelSize);
                            }
                        }
                    }
                    if (state.pixelSize == 1) ctx.putImageData(id, 0, 0);
                    return image;
                }


                if (sameChr && row < column) {
                    blockNumber = column * blockColumnCount + row;
                }
                else {
                    blockNumber = row * blockColumnCount + column;
                }

                self.startSpinner();

                self.dataset.getNormalizedBlock(zd, blockNumber, state.normalization)

                    .then(function (block) {

                        var image;
                        if (block && block.records.length > 0) {
                            image = drawBlock(block, transpose);
                        }
                        else {
                            console.log("No block for " + blockNumber);
                        }

                        var imageTile = {row: row, column: column, image: image};

                        // Cache at most 20 image tiles
                        if (self.imageTileCacheKeys.length > 20) {
                            self.imageTileCache[self.imageTileCacheKeys[0]] = undefined;
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

        var array = [], i;

        blockArray.forEach(function (block) {
            if (block) {
                for (i = 0; i < block.records.length; i++) {
                    array.push(block.records[i].counts);
                }
            }
        });

        if (array.length === 0) {
            return Number.NaN;
        }
        else {
            var idx = Math.floor((p / 100.0) * array.length);
            array.sort(function (a, b) {
                return a - b;
            });
            return array[idx];
        }
    }

    hic.ContactMatrixView.prototype.startSpinner = function () {
        // console.log("Start spinner");
        if(this.$spinner.is(':visible') !== true) {
            this.$spinner.show();
            this.throbber.start();
        }
    };

    hic.ContactMatrixView.prototype.stopSpinner = function () {
        //  console.log("Stop spinner");
        this.throbber.stop();
        this.$spinner.hide();
    };

    function addMouseHandlers($viewport) {

        var self = this,
            isMouseDown = false,
            isDragging = false,
            isSweepZooming = false,
            mouseDown = undefined,
            mouseLast = undefined;

        if (true === this.browser.config.gestureSupport) {
            this.gestureManager = new Hammer($viewport.get(0), { domEvents: true, threshold: 0 });
            this.gestureManager.get('pan').set({direction: Hammer.DIRECTION_ALL});
            this.gestureManager.remove('tap');
            this.gestureManager.remove('doubletap');
            this.gestureManager.remove('press');
            this.gestureManager.remove('swipe');
        }

        $(document).on({
            mousedown: function (e) {
                // do stuff
            },

            mousemove: function (e) {
                // do stuff
            },

            // for sweep-zoom allow user to sweep beyond viewport extent
            // sweep area clamps since viewport mouse handlers stop firing
            // when the viewport boundary is crossed.
            mouseup: function (e) {
                if (isSweepZooming) {
                    isSweepZooming = false;
                    self.sweepZoom.dismiss();
                }
            }
        });

        $viewport.on('mousedown', function (e) {

            var coords;

            if (false === self.browser.config.gestureSupport) {
                coords = hic.translateMouseCoordinates(e, $viewport);
                mouseLast = coords;
                mouseDown = coords;
            }

            isSweepZooming = (true === e.altKey);

            if (isSweepZooming) {
                self.sweepZoom.reset();
            }

        });

        if (true === this.browser.config.gestureSupport) {

            this.gestureManager.on('panstart', function (e_hammer) {

                var coords;

                isMouseDown = true;

                coords = {};
                coords.x = e_hammer.center.x - $viewport.offset().left;
                coords.y = e_hammer.center.y - $viewport.offset().top;

                // console.log('mousedown(' + coords.x + ', ' + coords.y + ')');

                mouseLast = coords;
                mouseDown = coords;

                if (isSweepZooming) {
                    self.sweepZoom.reset();
                }

            });

            this.gestureManager.on('panmove', hic.throttle(function (e_hammerjs) {

                var coords,
                    dx,
                    dy;

                if (self.updating) {
                    return;
                }

                coords = {};
                coords.x = mouseDown.x + e_hammerjs.deltaX;
                coords.y = mouseDown.y + e_hammerjs.deltaY;

                self.browser.updateCrosshairs(coords);

                $(document).on('keydown', function (e) {
                    // shift key
                    if (16 === e.keyCode) {
                        self.browser.showCrosshairs();
                    }
                });

                $(document).on('keyup', function (e) {
                    // shift key
                    if (16 === e.keyCode) {
                        self.browser.hideCrosshairs();
                    }
                });

                if (isMouseDown) { // Possibly dragging

                    if (mouseDown.x) {

                        isDragging = true;

                        if (isSweepZooming) {

                            self.sweepZoom.update(mouseDown, coords, {
                                min: {x: 0, y: 0},
                                max: {x: $viewport.width(), y: $viewport.height()}
                            });
                        } else {
                            dx = mouseLast.x - coords.x;
                            dy = mouseLast.y - coords.y;
                            // console.log('deltaX ' + e_hammerjs.deltaX + ' dx ' + dx);
                            self.browser.shiftPixels(dx, dy);
                        }

                    }

                    mouseLast = coords;
                }


            }, 10));
        } else {
            $viewport.on('mousemove', hic.throttle(function (e) {

                var coords;

                if (self.updating) {
                    return;
                }

                e.preventDefault();

                coords = hic.translateMouseCoordinates(e, $viewport);

                self.browser.updateCrosshairs(coords);

                $(document).on('keydown', function (e) {
                    // shift key
                    if (16 === e.keyCode) {
                        self.browser.showCrosshairs();
                    }
                });

                $(document).on('keyup', function (e) {
                    // shift key
                    if (16 === e.keyCode) {
                        self.browser.hideCrosshairs();
                    }
                });

                if (isMouseDown) { // Possibly dragging

                    if (mouseDown.x && Math.abs(coords.x - mouseDown.x) > dragThreshold) {

                        isDragging = true;

                        // if (self.updating) {
                        //     // Freeze frame during updates
                        //     return;
                        // }

                        if (isSweepZooming) {

                            self.sweepZoom.update(mouseDown, coords, {
                                min: {x: 0, y: 0},
                                max: {x: $viewport.width(), y: $viewport.height()}
                            });
                        } else {
                            self.browser.shiftPixels(mouseLast.x - coords.x, mouseLast.y - coords.y);
                        }

                    }

                    mouseLast = coords;
                }


            }, 10));
        }

        $viewport.on('mouseup', panMouseUpOrMouseOut);

        $viewport.on('mouseleave', panMouseUpOrMouseOut);

        function panMouseUpOrMouseOut(e) {

            if (isDragging) {
                isDragging = false;
                self.browser.eventBus.post(hic.Event("DragStopped"));
            }

            isMouseDown = false;
            mouseDown = mouseLast = undefined;
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

    return hic;

})
(hic || {});
