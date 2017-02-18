/**
 * Created by jrobinso on 2/7/17.
 */
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 James Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNJuicebox web demo appECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


var hic = (function (hic) {

    var state = {
            chr1: 1,
            chr2: 1,
            x: 0,
            y: 0,
            zoom: 4,
            shiftPixels: function (dx, dy) {
                state.x += dx / pixelSize;
                state.y += dy / pixelSize;
            }
        },
        pixelSize = 1,
        dragThreshold = 2;

    hic.ContactMatrixView = function (browser) {

        var $viewport, $spinner;

        this.browser = browser;

        $viewport = $('<div class="hic-viewport-div">');
        this.viewport = $viewport[0];

        //content canvas
        this.canvas = $('<canvas class = "hic-viewport-canvas">')[0];
        $viewport.append(this.canvas);

        //spinner
        $spinner = $('<div class="hic-viewport-spinner">');
        $spinner.css({'font-size': '32px'});

        // $spinner.append($('<i class="fa fa-cog fa-spin fa-fw">'));
        $spinner.append($('<i class="fa fa-spinner fa-spin fa-fw">'));
        $viewport.append($spinner[0]);

        addMouseHandlers.call(this, $viewport);

        this.canvas.setAttribute('width', this.viewport.clientWidth);
        this.canvas.setAttribute('height', this.viewport.clientHeight);
        this.ctx = this.canvas.getContext("2d");

        this.matrixCache = {};
        this.blockImageCache = {};

        this.colorScale = new igv.GradientColorScale(
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


    }


    hic.ContactMatrixView.prototype.update = function () {
        var self = this;

        if(self.updating) return;

        self.updating = true;
        // Get zoom data
        this.getMatrix(state.chr1, state.chr2)
            .then(function (matrix) {

                var imageWidth = self.viewport.clientWidth / pixelSize;
                var imageHeight = self.viewport.clientHeight / pixelSize;
                var zd = matrix.bpZoomData[state.zoom],
                    blockBinCount = zd.blockBinCount,
                    blockColumnCount = zd.blockColumnCount,
                    col1 = Math.floor(state.x / blockBinCount),
                    col2 = Math.floor((state.x + imageWidth) / blockBinCount),
                    row1 = Math.floor(state.y / blockBinCount),
                    row2 = Math.floor((state.y + imageHeight) / blockBinCount),
                    r, c, i, b,
                    promises = [];

                for (r = row1; r <= row2; r++) {
                    for (c = col1; c <= col2; c++) {
                        b = r * blockColumnCount + c;
                        if(b >= 0) {
                            promises.push(self.getBlock(zd, b));
                        }
                    }
                }

                Promise.all(promises).then(function (blocks) {
                    stopSpinner.call(self);
                    self.draw(blocks, zd);
                    self.updating = false;
                }).catch(function (error) {
                    stopSpinner.call(self);
                    self.updating = false;
                    console.error(error);
                })
            }).catch(function (error) {
            stopSpinner.call(self);
            self.updating = false;
            console.error(error);
        })
    }

    hic.ContactMatrixView.prototype.draw = function (blocks, zd) {

        var self = this,
            blockBinCount = zd.blockBinCount,
            blockColumnCount = zd.blockColumnCount;

        self.canvas.setAttribute('width', self.viewport.clientWidth);
        self.canvas.setAttribute('height', self.viewport.clientHeight);
        blocks.forEach(function (blockImage) {

            var block = blockImage.block,
                image = blockImage.image;

            if (block != null) {
                var blockNumber = block.blockNumber,
                    row = Math.floor(blockNumber / blockColumnCount),
                    col = blockNumber - row * blockColumnCount,
                    x0 = blockBinCount * col,
                    y0 = blockBinCount * row;

                var offsetX = x0 - state.x;
                var offsetY = y0 - state.y;
                self.ctx.drawImage(image, offsetX, offsetY);
            }
        })

    }

    hic.ContactMatrixView.prototype.getMatrix = function (chr1, chr2) {

        var self = this,
            reader = this.browser.hicReader,
            key = "" + chr1 + "_" + chr2;
        if (this.matrixCache.hasOwnProperty(key)) {
            return Promise.resolve(self.matrixCache[key]);
        }
        else {
            return new Promise(function (fulfill, reject) {
                startSpinner.call(self);
                reader.readMatrix(key).then(function (matrix) {
                    self.matrixCache[key] = matrix;
                    fulfill(matrix);
                }).catch(reject);
            })

        }
    }

    hic.ContactMatrixView.prototype.getBlock = function (zd, blockNumber) {

        var self = this,
            key = "" + zd.chr1 + "_" + zd.chr2 + "_" + zd.zoom.binSize + "_" + zd.zoom.unit + "_" + blockNumber;

        if (this.blockImageCache.hasOwnProperty(key)) {
            return Promise.resolve(this.blockImageCache[key]);
        }
        else {
            return new Promise(function (fulfill, reject) {

                var reader = self.browser.hicReader,
                    blockBinCount = zd.blockBinCount,
                    blockColumnCount = zd.blockColumnCount,
                    widthInBins = zd.blockBinCount,
                    imageSize = widthInBins * pixelSize;

                startSpinner.call(self);

                reader.readBlock(blockNumber, zd)
                    .then(function (block) {

                        var blockNumber, row, col, x0, y0, image, ctx, blockImage;

                        if (block != null) {

                            blockNumber = block.blockNumber,
                                row = Math.floor(blockNumber / blockColumnCount),
                                col = blockNumber - row * blockColumnCount,
                                x0 = blockBinCount * row,
                                y0 = blockBinCount * col,


                                image = document.createElement('canvas'),
                                image.width = imageSize;
                            image.height = imageSize;
                            ctx = image.getContext('2d');

                            // Draw the image
                            var i, rec, x, y, rgb;
                            for (i = 0; i < block.records.length; i++) {
                                rec = block.records[i];
                                x = (rec.bin1 - x0) * pixelSize;
                                y = (rec.bin2 - y0) * pixelSize;
                                rgb = self.colorScale.getColor(rec.counts);

                                ctx.fillStyle = rgb;
                                ctx.fillRect(x, y, pixelSize, pixelSize);
                                ctx.fillRect(y, x, pixelSize, pixelSize);
                            }
                        }

                        blockImage = {
                            block: block,
                            image: image
                        };

                        self.blockImageCache[key] = blockImage;

                        stopSpinner.call(self);

                        fulfill(blockImage);

                    })
                    .catch(reject)
            })
        }
    }

    function startSpinner() {
        var $spinner = $(this.viewport).find('.fa-spinner');
        $spinner.addClass("fa-spin");
        $spinner.show();
    };

    function stopSpinner() {
        var $spinner = $(this.viewport).find('.fa-spinner');
        $spinner.hide();
        $spinner.removeClass("fa-spin");
    };

    function addMouseHandlers ($viewport) {

        var self = this,
            viewport = $viewport[0],
            viewports,
            referenceFrame,
            isRulerTrack = false,
            isMouseDown = false,
            isDragging = false,
            lastMouseX,
            lastMouseY,
            mouseDownX,
            mouseDownY;

        $viewport.mousedown(function (e) {

            var coords;

            isMouseDown = true;
            coords = translateMouseCoordinates(e, viewport);
            mouseDownX = lastMouseX = coords.x;
            mouseDownY = lastMouseY = coords.y;

        });

        // Guide line is bound within track area, and offset by 5 pixels so as not to interfere mouse clicks.
        // $(trackContainerDiv).mousemove(function (e) {
        //     var xy,
        //         _left,
        //         $element = igv.browser.$cursorTrackingGuide;
        //
        //     e.preventDefault();
        //
        //     xy = igv.translateMouseCoordinates(e, trackContainerDiv);
        //     _left = Math.max(50, xy.x - 5);
        //
        //     _left = Math.min(igv.browser.trackContainerDiv.clientWidth - 65, _left);
        //     $element.css({left: _left + 'px'});
        // });

        $viewport.mousemove(throttle(function (e) {

            var coords,
                maxEnd,
                maxStart;

            e.preventDefault();

            coords = translateMouseCoordinates(e, viewport);

            if (isMouseDown) { // Possibly dragging

                if (mouseDownX && Math.abs(coords.x - mouseDownX) > dragThreshold) {

                    isDragging = true;

                    state.shiftPixels(lastMouseX - coords.x, lastMouseY - coords.y);

                    self.update();

                    //  igv.browser.fireEvent('trackdrag');
                }

                lastMouseX = coords.x;
                lastMouseY = coords.y;
            }

        }, 10));

        $viewport.mouseup(mouseUpOrOut);

        $viewport.mouseleave(mouseUpOrOut);

        function mouseUpOrOut(e) {

            //
            // // Don't let vertical line interfere with dragging
            // if (igv.browser.$cursorTrackingGuide && e.toElement === igv.browser.$cursorTrackingGuide.get(0) && e.type === 'mouseleave') {
            //     return;
            // }

            if (isDragging) {
             //   igv.browser.fireEvent('trackdragend');
                isDragging = false;
            }

            isMouseDown = false;
            mouseDownX = lastMouseX = undefined;
            mouseDownY = lastMouseY = undefined;

        }

    }

    function translateMouseCoordinates(e, target) {

        var $target = $(target),
            eFixed,
            posx,
            posy;

        // Sets pageX and pageY for browsers that don't support them
        eFixed = $.event.fix(e);

        if (undefined === $target.offset()) {
            console.log('igv.translateMouseCoordinates - $target.offset() is undefined.');
        }
        posx = eFixed.pageX - $target.offset().left;
        posy = eFixed.pageY - $target.offset().top;

        return {x: posx, y: posy}
    };

    function throttle (fn, threshhold, scope) {
        threshhold || (threshhold = 200);
        var last, deferTimer;

        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    };

    return hic;

})
(hic || {});
