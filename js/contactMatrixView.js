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
import $ from "../vendor/jquery-1.12.4.js"
import ColorScale from './colorScale.js'
import RatioColorScale from './ratioColorScale.js'
import ScrollbarWidget from './scrollbarWidget.js'
import SweepZoom from './sweepZoom.js'
import HICEvent from './hicEvent.js'
import HICMath from './hicMath.js'
import  * as hic from './hic.js'
import igv from '../node_modules/igv/dist/igv.esm.min.js';

const DRAG_THRESHOLD = 2;
const DOUBLE_TAP_DIST_THRESHOLD = 20;
const DOUBLE_TAP_TIME_THRESHOLD = 300;

const ContactMatrixView = function (browser, $container) {
    var id;

    this.browser = browser;

    this.scrollbarWidget = new ScrollbarWidget(browser);

    id = browser.id + '_' + 'viewport';
    this.$viewport = $("<div>", {id: id});
    $container.append(this.$viewport);

    // content canvas
    this.$canvas = $('<canvas>');
    this.$viewport.append(this.$canvas);

    this.ctx = this.$canvas.get(0).getContext('2d');

    // spinner
    this.$fa_spinner = $('<i class="fa fa-spinner fa-spin">');
    this.$fa_spinner.css("font-size", "48px");
    this.$fa_spinner.css("position", "absolute");
    this.$fa_spinner.css("left", "40%");
    this.$fa_spinner.css("top", "40%");
    this.$fa_spinner.css("display", "none");
    this.$viewport.append(this.$fa_spinner);
    this.spinnerCount = 0

    // ruler sweeper widget surface
    this.sweepZoom = new SweepZoom(browser, this.$viewport);
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
    this.imageTileCacheLimit = 8; //8 is the minimum number required to support A/B cycling
    this.colorScaleThresholdCache = {};

    // Set initial color scales.  These might be overriden / adjusted via parameters
    this.colorScale = new ColorScale({threshold: 2000, r: 255, g: 0, b: 0});
    this.ratioColorScale = new RatioColorScale(5);
    // this.diffColorScale = new RatioColorScale(100, false);

    this.browser.eventBus.subscribe("NormalizationChange", this);
    this.browser.eventBus.subscribe("TrackLoad2D", this);
    this.browser.eventBus.subscribe("TrackState2D", this);
    this.browser.eventBus.subscribe("MapLoad", this)
    this.browser.eventBus.subscribe("LocusChange", this);
    this.browser.eventBus.subscribe("ControlMapLoad", this);
    this.browser.eventBus.subscribe("ColorChange", this)
    //this.browser.eventBus.subscribe("DragStopped", this)

    this.drawsInProgress = new Set()
};

ContactMatrixView.prototype.setColorScale = function (colorScale) {

    switch (this.displayMode) {
        case 'AOB':
        case 'BOA':
            this.ratioColorScale = colorScale;
            break;
        case 'AMB':
            this.diffColorScale = colorScale;
            break;
        default:
            this.colorScale = colorScale;
    }
    this.colorScaleThresholdCache[colorScaleKey(this.browser.state, this.displayMode)] = colorScale.threshold;
};

ContactMatrixView.prototype.setColorScaleThreshold = async function (threshold) {

    this.getColorScale().setThreshold(threshold);
    this.colorScaleThresholdCache[colorScaleKey(this.browser.state, this.displayMode)] = threshold;
    this.imageTileCache = {};
    await this.update()
};

ContactMatrixView.prototype.getColorScale = function () {
    switch (this.displayMode) {
        case 'AOB':
        case 'BOA':
            return this.ratioColorScale;
        case 'AMB':
            return this.diffColorScale;
        default:
            return this.colorScale;
    }
};

ContactMatrixView.prototype.setDisplayMode = async function (mode) {
    this.displayMode = mode;
    this.clearImageCaches();
    await this.update();
}

function colorScaleKey(state, displayMode) {
    return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization + "_" + displayMode;
}

ContactMatrixView.prototype.clearImageCaches = function () {
    this.imageTileCache = {};
    this.imageTileCacheKeys = [];
};

ContactMatrixView.prototype.getViewDimensions = function () {
    return {
        width: this.$viewport.width(),
        height: this.$viewport.height()
    }
};

ContactMatrixView.prototype.receiveEvent = async function (event) {

    if ("MapLoad" === event.type || "ControlMapLoad" === event.type) {

        // Don't enable mouse actions until we have a dataset.
        if (!this.mouseHandlersEnabled) {
            addTouchHandlers.call(this, this.$viewport);
            addMouseHandlers.call(this, this.$viewport);
            this.mouseHandlersEnabled = true;
        }
        this.clearImageCaches();
        this.colorScaleThresholdCache = {};
    }

    else {
        if (!("LocusChange" === event.type || "DragStopped" === event.type)) {
            this.clearImageCaches();
        }
        await this.update();
    }
}

ContactMatrixView.prototype.update = async function () {

    if (this.disableUpdates) return   // This flag is set during browser startup

    await this.repaint()

}


/**
 * Return a promise to load all neccessary data
 */
ContactMatrixView.prototype.repaint = async function () {

    if (!this.browser.dataset) {
        return;
    }

    const viewportWidth = this.$viewport.width()
    const viewportHeight = this.$viewport.height()
    const canvasWidth = this.$canvas.width()
    const canvasHeight = this.$canvas.height()
    if (canvasWidth !== viewportWidth || canvasHeight !== viewportHeight) {
        this.$canvas.width(viewportWidth);
        this.$canvas.height(viewportHeight);
        this.$canvas.attr('width', this.$viewport.width());
        this.$canvas.attr('height', this.$viewport.height());
    }
    const state = this.browser.state;

    let ds;
    let dsControl;
    switch (this.displayMode) {
        case 'A':
            ds = this.browser.dataset
            break;
        case 'B':
            ds = this.browser.controlDataset
            break;
        case 'AOB':
        case 'AMB':
            ds = this.browser.dataset
            dsControl = this.browser.controlDataset
            break;
        case 'BOA':
            ds = this.browser.controlDataset
            dsControl = this.browser.dataset
    }

    const matrix = await ds.getMatrix(state.chr1, state.chr2)
    const zd = matrix.bpZoomData[state.zoom]

    let zdControl;
    if (dsControl) {
        const matrixControl = await dsControl.getMatrix(state.chr1, state.chr2)
        zdControl = matrixControl.bpZoomData[state.zoom]
    }


    const blockBinCount = zd.blockBinCount  // Dimension in bins of a block (width = height = blockBinCount)
    const pixelSizeInt = Math.max(1, Math.floor(state.pixelSize))
    const widthInBins = this.$viewport.width() / pixelSizeInt
    const heightInBins = this.$viewport.height() / pixelSizeInt
    const blockCol1 = Math.floor(state.x / blockBinCount)
    const blockCol2 = Math.floor((state.x + widthInBins) / blockBinCount)
    const blockRow1 = Math.floor(state.y / blockBinCount)
    const blockRow2 = Math.floor((state.y + heightInBins) / blockBinCount)

    await checkColorScale.call(this, ds, zd, blockRow1, blockRow2, blockCol1, blockCol2, state.normalization)

    for (let r = blockRow1; r <= blockRow2; r++) {
        for (let c = blockCol1; c <= blockCol2; c++) {
            const tile = await this.getImageTile(ds, dsControl, zd, zdControl, r, c, state)
            this.paintTile(tile)
        }
    }

    // Record genomic extent of current canvas
    this.genomicExtent = {
        chr1: state.chr1,
        chr2: state.chr2,
        x: state.x * zd.zoom.binSize,
        y: state.y * zd.zoom.binSize,
        w: viewportWidth * zd.zoom.binSize / state.pixelSize,
        h: viewportHeight * zd.zoom.binSize / state.pixelSize
    }
}

/**
 * Returns a promise for an image tile
 *
 * @param zd
 * @param row
 * @param column
 * @param state
 * @returns {*}
 */

const inProgressCache = {}

function inProgressTile(imageSize) {

    let image = inProgressCache[imageSize]
    if (!image) {
        image = document.createElement('canvas');
        image.width = imageSize;
        image.height = imageSize;
        const ctx = image.getContext('2d');
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgb(230, 230, 230)'
        ctx.fillRect(0, 0, image.width, image.height)
        ctx.fillStyle = 'black'
        for (let i = 100; i < imageSize; i += 300) {
            for (let j = 100; j < imageSize; j += 300) {
                ctx.fillText('Loading...', i, j);
            }
        }
        inProgressCache[imageSize] = image
    }
    return image;
}

ContactMatrixView.prototype.getImageTile = async function (ds, dsControl, zd, zdControl, row, column, state) {

    const pixelSizeInt = Math.max(1, Math.floor(state.pixelSize))
    const useImageData = pixelSizeInt === 1
    const blockBinCount = zd.blockBinCount
    const key = "" + zd.chr1.name + "_" + zd.chr2.name + "_" + zd.zoom.binSize + "_" + zd.zoom.unit +
        "_" + row + "_" + column + "_" + pixelSizeInt + "_" + state.normalization + "_" + this.displayMode
    if (this.imageTileCache.hasOwnProperty(key)) {
        return this.imageTileCache[key]

    } else {
        if (this.drawsInProgress.has(key)) {
            //console.log("In progress")
            const imageSize = Math.ceil(blockBinCount * pixelSizeInt)
            const image = inProgressTile(imageSize)
            return {
                row: row,
                column: column,
                blockBinCount: blockBinCount,
                image: image,
                inProgress: true
            }  // TODO return an image at a coarser resolution if avaliable

        }
        this.drawsInProgress.add(key)

        try {
            this.startSpinner()
            const sameChr = zd.chr1.index === zd.chr2.index
            const blockColumnCount = zd.blockColumnCount
            const widthInBins = zd.blockBinCount
            const transpose = sameChr && row < column

            let blockNumber
            if (sameChr && row < column) {
                blockNumber = column * blockColumnCount + row;
            }
            else {
                blockNumber = row * blockColumnCount + column;
            }

            // Get blocks
            const block = await ds.getNormalizedBlock(zd, blockNumber, state.normalization, this.browser.eventBus)
            let controlBlock
            if (zdControl) {
                controlBlock = await dsControl.getNormalizedBlock(zdControl, blockNumber, state.normalization, this.browser.eventBus)
            }

            const averageCount = zd.averageCount
            const ctrlAverageCount = zdControl ? zdControl.averageCount : 1
            const averageAcrossMapAndControl = (averageCount + ctrlAverageCount) / 2


            let image;
            if (block && block.records.length > 0) {

                const imageSize = Math.ceil(widthInBins * pixelSizeInt)
                const blockNumber = block.blockNumber;
                const row = Math.floor(blockNumber / blockColumnCount);
                const col = blockNumber - row * blockColumnCount;
                const x0 = blockBinCount * col;
                const y0 = blockBinCount * row;

                image = document.createElement('canvas');
                image.width = imageSize;
                image.height = imageSize;
                const ctx = image.getContext('2d');
                //ctx.clearRect(0, 0, image.width, image.height);

                const controlRecords = {};
                if ('AOB' === this.displayMode || 'BOA' === this.displayMode || 'AMB' === this.displayMode) {
                    for (let record of controlBlock.records) {
                        controlRecords[record.getKey()] = record
                    }
                }

                let id
                if (useImageData) {
                    id = ctx.getImageData(0, 0, image.width, image.height);
                }

                for (let i = 0; i < block.records.length; i++) {

                    const rec = block.records[i];
                    let x = Math.floor((rec.bin1 - x0) * pixelSizeInt);
                    let y = Math.floor((rec.bin2 - y0) * pixelSizeInt);

                    if (transpose) {
                        const t = y;
                        y = x;
                        x = t;
                    }

                    let color
                    switch (this.displayMode) {

                        case 'AOB':
                        case 'BOA':
                            let key = rec.getKey();
                            let controlRec = controlRecords[key];
                            if (!controlRec) {
                                continue;    // Skip
                            }
                            let score = (rec.counts / averageCount) / (controlRec.counts / ctrlAverageCount);

                            color = this.ratioColorScale.getColor(score);

                            break;

                        case 'AMB':
                            key = rec.getKey();
                            controlRec = controlRecords[key];
                            if (!controlRec) {
                                continue;    // Skip
                            }
                            score = averageAcrossMapAndControl * ((rec.counts / averageCount) - (controlRec.counts / ctrlAverageCount));

                            color = this.diffColorScale.getColor(score);

                            break;

                        default:    // Either 'A' or 'B'
                            color = this.colorScale.getColor(rec.counts);
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
                for (let track2D of this.browser.tracks2D) {

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

                                let t
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
                }

                ctx.restore();

                // Uncomment to reveal tile boundaries for debugging.
                // ctx.fillStyle = "rgb(255,255,255)";
                // ctx.strokeRect(0, 0, image.width - 1, image.height - 1)


            }
            else {
                //console.log("No block for " + blockNumber);
            }
            var imageTile = {row: row, column: column, blockBinCount: blockBinCount, image: image}


            if (this.imageTileCacheLimit > 0) {
                if (this.imageTileCacheKeys.length > this.imageTileCacheLimit) {
                    delete this.imageTileCache[this.imageTileCacheKeys[0]]
                    this.imageTileCacheKeys.shift()
                }
                this.imageTileCache[key] = imageTile

            }

            this.drawsInProgress.delete(key)
            return imageTile;

        } finally {
            //console.log("Finish load for " + key)
            this.stopSpinner()
        }
    }


    function setPixel(imageData, x, y, r, g, b, a) {
        const index = (x + y * imageData.width) * 4;
        imageData.data[index + 0] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a;
    }

    function getNormalizedBlocks(ds, dsControl, zd, zdControl, blockNumber, normalization) {
        var promises = [];

        promises.push(ds.getNormalizedBlock(zd, blockNumber, normalization, this.browser.eventBus));

        if (zdControl) {
            promises.push(dsControl.getNormalizedBlock(zdControl, blockNumber, normalization, this.browser.eventBus));
        }

        return Promise.all(promises);

    }
};


ContactMatrixView.prototype.zoomIn = async function () {
    const state = this.browser.state
    const viewportWidth = this.$viewport.width()
    const viewportHeight = this.$viewport.height()
    const matrices = await getMatrices.call(this, state.chr1, state.chr2)

    var matrix = matrices[0];

    if (matrix) {
        const zd = await matrix.bpZoomData[state.zoom]
        const newGenomicExtent = {
            x: state.x * zd.zoom.binSize,
            y: state.y * zd.zoom.binSize,
            w: viewportWidth * zd.zoom.binSize / state.pixelSize,
            h: viewportHeight * zd.zoom.binSize / state.pixelSize
        }

        // Zoom out not supported
        if (newGenomicExtent.w > this.genomicExtent.w) return

        const sx = ((newGenomicExtent.x - this.genomicExtent.x) / this.genomicExtent.w) * viewportWidth
        const sy = ((newGenomicExtent.y - this.genomicExtent.y) / this.genomicExtent.w) * viewportHeight
        const sWidth = (newGenomicExtent.w / this.genomicExtent.w) * viewportWidth
        const sHeight = (newGenomicExtent.h / this.genomicExtent.h) * viewportHeight
        const img = this.$canvas[0]

        const backCanvas = document.createElement('canvas');
        backCanvas.width = img.width;
        backCanvas.height = img.height;
        const backCtx = backCanvas.getContext('2d');
        backCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, viewportWidth, viewportHeight)

        this.ctx.clearRect(0, 0, viewportWidth, viewportHeight)
        this.ctx.drawImage(backCanvas, 0, 0)
    }
}

ContactMatrixView.prototype.paintTile = function (imageTile) {

    const state = this.browser.state
    const viewportWidth = this.$viewport.width()
    const viewportHeight = this.$viewport.height()

    var image = imageTile.image,
        pixelSizeInt = Math.max(1, Math.floor(state.pixelSize))

    if (image != null) {
        const row = imageTile.row
        const col = imageTile.column
        const x0 = imageTile.blockBinCount * col
        const y0 = imageTile.blockBinCount * row
        const offsetX = (x0 - state.x) * state.pixelSize
        const offsetY = (y0 - state.y) * state.pixelSize
        const scale = state.pixelSize / pixelSizeInt
        const scaledWidth = image.width * scale
        const scaledHeight = image.height * scale
        if (offsetX <= viewportWidth && offsetX + scaledWidth >= 0 &&
            offsetY <= viewportHeight && offsetY + scaledHeight >= 0) {
            this.ctx.clearRect(offsetX, offsetY, scaledWidth, scaledHeight)
            if (scale === 1) {
                this.ctx.drawImage(image, offsetX, offsetY);
            }
            else {
                this.ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
            }
        }
    }
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
async function checkColorScale(ds, zd, row1, row2, col1, col2, normalization) {

    const colorKey = colorScaleKey(this.browser.state, this.displayMode);   // This doesn't feel right, state should be an argument
    if ('AOB' === this.displayMode || 'BOA' === this.displayMode) {
        return this.ratioColorScale;     // Don't adjust color scale for A/B.
    }

    if (this.colorScaleThresholdCache[colorKey]) {
        const changed = this.colorScale.threshold !== this.colorScaleThresholdCache[colorKey];
        this.colorScale.setThreshold(this.colorScaleThresholdCache[colorKey]);
        if (changed) {
            this.browser.eventBus.post(HICEvent("ColorScale", this.colorScale));
        }
        return this.colorScale;
    }

    else {
        const promises = [];
        const sameChr = zd.chr1.index === zd.chr2.index;
        let blockNumber
        for (let row = row1; row <= row2; row++) {
            for (let column = col1; column <= col2; column++) {
                if (sameChr && row < column) {
                    blockNumber = column * zd.blockColumnCount + row;
                }
                else {
                    blockNumber = row * zd.blockColumnCount + column;
                }

                promises.push(ds.getNormalizedBlock(zd, blockNumber, normalization, this.browser.eventBus))
            }
        }

        try {
            this.startSpinner()
            const blocks = await Promise.all(promises)
            this.stopSpinner()

            let s = computePercentile(blocks, 95);

            if (!isNaN(s)) {  // Can return NaN if all blocks are empty

                if (0 === zd.chr1.index) s *= 4;   // Heuristic for whole genome view

                this.colorScale = new ColorScale(this.colorScale);
                this.colorScale.setThreshold(s);
                this.computeColorScale = false;
                this.browser.eventBus.post(HICEvent("ColorScale", this.colorScale));
            }

            this.colorScaleThresholdCache[colorKey] = s;

            return this.colorScale;
        } finally {
            this.stopSpinner()
        }


    }

}

function computePercentile(blockArray, p) {

    var array = [];
    blockArray.forEach(function (block) {
        if (block) {
            for (let i = 0; i < block.records.length; i++) {
                array.push(block.records[i].counts);
            }
        }
    });
    return HICMath.percentile(array, p);
}

ContactMatrixView.prototype.startSpinner = function () {

    if (true === this.browser.isLoadingHICFile && this.browser.$user_interaction_shield) {
        this.browser.$user_interaction_shield.show();
    }
    this.$fa_spinner.css("display", "inline-block");
    this.spinnerCount++
}

ContactMatrixView.prototype.stopSpinner = function () {
    this.spinnerCount--
    if (0 === this.spinnerCount) {
        this.$fa_spinner.css("display", "none")
    }
    this.spinnerCount = Math.max(0, this.spinnerCount)   // This should not be neccessary
}


function addMouseHandlers($viewport) {

    var self = this,
        isMouseDown = false,
        isDragging = false,
        isSweepZooming = false,
        mouseDown,
        mouseLast,
        mouseOver,
        lastWheelTime;

    this.isDragging = false;

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

        $viewport.on('mousemove', function (e) {

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

            self.browser.eventBus.post(HICEvent("UpdateContactMapMousePosition", xy, false));

            if (true === self.willShowCrosshairs) {
                self.browser.updateCrosshairs(xy);
                self.browser.showCrosshairs();
            }

            if (isMouseDown) { // Possibly dragging

                if (isSweepZooming) {

                    self.sweepZoom.update({x: eFixed.pageX, y: eFixed.pageY});

                } else if (mouseDown.x && Math.abs(coords.x - mouseDown.x) > DRAG_THRESHOLD) {

                    self.isDragging = true;

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


        })
        //, 10));

        $viewport.on('mouseup', panMouseUpOrMouseOut);

        $viewport.on('mouseleave', function () {

            self.browser.layoutController.xAxisRuler.unhighlightWholeChromosome();
            self.browser.layoutController.yAxisRuler.unhighlightWholeChromosome();

            panMouseUpOrMouseOut();
        });

        // Mousewheel events -- ie exposes event only via addEventListener, no onwheel attribute
        // NOte from spec -- trackpads commonly map pinch to mousewheel + ctrl

        $viewport[0].addEventListener("wheel", mouseWheelHandler, 250, false);

        // document level events
        $(document).on('keydown.contact_matrix_view', function (e) {
            if (undefined === self.willShowCrosshairs && true === mouseOver && true === e.shiftKey) {
                self.willShowCrosshairs = true;
            }
        });

        $(document).on('keyup.contact_matrix_view', function (e) {
            self.browser.hideCrosshairs();
            self.willShowCrosshairs = undefined;
        });

        // for sweep-zoom allow user to sweep beyond viewport extent
        // sweep area clamps since viewport mouse handlers stop firing
        // when the viewport boundary is crossed.
        $(document).on('mouseup.contact_matrix_view', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (isSweepZooming) {
                isSweepZooming = false;
                self.sweepZoom.commit();
            }
        });
    }

    function panMouseUpOrMouseOut(e) {

        if (true === self.isDragging) {
            self.isDragging = false;
            self.browser.eventBus.post(HICEvent("DragStopped"));
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

            var touchCoords = translateTouchCoordinates(ev.targetTouches[0], viewport),
                offsetX = touchCoords.x,
                offsetY = touchCoords.y;
            if (lastTouch) {
                var dx = lastTouch.x - offsetX,
                    dy = lastTouch.y - offsetY;
                if (!isNaN(dx) && !isNaN(dy)) {
                    self.isDragging = true
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

    }, 50);

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
        } else if (self.isDragging) {
            self.isDragging = false;
            self.browser.eventBus.post(HICEvent("DragStopped"));
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


export default ContactMatrixView
