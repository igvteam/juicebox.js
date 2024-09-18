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

import $ from '../vendor/jquery-3.3.1.slim.js'
import {IGVColor} from '../node_modules/igv-utils/src/index.js'
import ColorScale from './colorScale.js'
import HICEvent from './hicEvent.js'
import hic from "./index.js"

const DRAG_THRESHOLD = 2;

const imageTileDimension = 685;

class ContactMatrixView {

    constructor(browser, $viewport, sweepZoom, scrollbarWidget, colorScale, ratioColorScale, backgroundColor) {

        this.browser = browser

        this.$viewport = $viewport
        this.viewport = $viewport.get(0)


        this.sweepZoom = sweepZoom;
        this.scrollbarWidget = scrollbarWidget;

        // Set initial color scales.  These might be overriden / adjusted via parameters
        this.colorScale = colorScale;

        this.ratioColorScale = ratioColorScale;
        // this.diffColorScale = new RatioColorScale(100, false);

        this.backgroundColor = backgroundColor;
        this.backgroundRGBString = IGVColor.rgbColor(backgroundColor.r, backgroundColor.g, backgroundColor.b)

        let canvas
        const { width, height } = this.viewport.getBoundingClientRect()

        // contact map canvas
        canvas = this.viewport.querySelector(`#${browser.id}-contact-map-canvas`)
        this.ctx = canvas.getContext('2d')
        this.ctx.canvas.width = width
        this.ctx.canvas.height = height

        const str = `#${browser.id}-contact-map-canvas`
        this.$canvas = $viewport.find(str)


        // live contact map canvas
        canvas = this.viewport.querySelector(`#${browser.id}-live-contact-map-canvas`)
        this.ctx_live = canvas.getContext('bitmaprenderer')
        this.ctx_live.canvas.width = width
        this.ctx_live.canvas.height = height

        this.$fa_spinner = $viewport.find('.fa-spinner');
        this.spinnerCount = 0;

        this.$x_guide = $viewport.find("div[id$='-x-guide']");
        this.$y_guide = $viewport.find("div[id$='-y-guide']");

        this.displayMode = 'A';
        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
        this.imageTileCacheLimit = 8; //8 is the minimum number required to support A/B cycling
        this.colorScaleThresholdCache = {};


        this.browser.eventBus.subscribe("NormalizationChange", this);
        this.browser.eventBus.subscribe("TrackLoad2D", this);
        this.browser.eventBus.subscribe("TrackState2D", this);
        this.browser.eventBus.subscribe("MapLoad", this)
        this.browser.eventBus.subscribe("ControlMapLoad", this);
        this.browser.eventBus.subscribe("ColorChange", this)

        this.drawsInProgress = new Set()
    }

    assessPanelTabSelection(isliveContactMapTabSelection) {
        this.isliveContactMapTabSelection = isliveContactMapTabSelection;
    }

    selectStateAndDataset(isliveContactMapTabSelection) {

        const canUseLivePayload = !(undefined === this.browser.liveContactMapState || undefined === this.browser.liveContactMapDataSet)
        const canUseHiCPayload = !(undefined === this.browser.state || undefined === this.browser.dataset)

        if (false === isliveContactMapTabSelection) {
            if (true === canUseHiCPayload) {
                return { state: this.browser.state, dataset: this.browser.dataset }
            } else if (true === canUseLivePayload) {
                return { state: this.browser.liveContactMapState, dataset: this.browser.liveContactMapDataSet }
            } else {
                return undefined
            }
        } else {
            if (true === canUseLivePayload) {
                return { state: this.browser.liveContactMapState, dataset: this.browser.liveContactMapDataSet }
            } else {
                return undefined
            }
        }
    }

    resolution() {

        const result = this.selectStateAndDataset(this.isliveContactMapTabSelection)

        if (result) {
            const { state, dataset } = result
            return dataset.bpResolutions[state.zoom]
        } else {
            console.warn(`resolution(): State and Dataset are not both defined`)
            return undefined
        }


    }

    genomicState(browser, axis) {

        const result = this.selectStateAndDataset(this.isliveContactMapTabSelection)

        if (result) {
            const { state, dataset } = result
            const width = this.getViewDimensions().width
            const height = this.getViewDimensions().height

            const resolution = dataset.bpResolutions[state.zoom]

            const chr1 = dataset.chromosomes[state.chr1]
            const chr2 = dataset.chromosomes[state.chr2]

            const bpp = (chr1.name.toLowerCase() === "all") ? browser.genome.getGenomeLength() / width : resolution / state.pixelSize

            const gs = { bpp }

            if (axis === "x") {
                gs.chromosome = chr1
                gs.startBP = state.x * resolution;
                gs.endBP = gs.startBP + bpp * width;
            } else {
                gs.chromosome = chr2
                gs.startBP = state.y * resolution;
                gs.endBP = gs.startBP + bpp * height;
            }

            return gs
        } else {
            console.warn(`genomicState(): State and Dataset are not both defined`)
            return undefined
        }

    }

    prepareCustomCrosshairsHandlerPayload({x, y, xNormalized, yNormalized}) {

        const result = this.selectStateAndDataset(this.isliveContactMapTabSelection)

        if (result) {
            const { state, dataset } = result

            const {x: stateX, y: stateY, pixelSize} = state

            const resolution = this.resolution()

            const xBP = (stateX + (x / pixelSize)) * resolution;
            const yBP = (stateY + (y / pixelSize)) * resolution;

            let {startBP: startXBP, endBP: endXBP} = this.genomicState(this.browser, 'x');
            let {startBP: startYBP, endBP: endYBP} = this.genomicState(this.browser, 'y');

            const payload =
                {
                    xBP,
                    yBP,
                    startXBP,
                    startYBP,
                    endXBP,
                    endYBP,
                    interpolantX: xNormalized,
                    interpolantY: yNormalized
                }

            return payload

        } else {
            console.warn(`prepareCustomCrosshairsHandlerPayload(): State and Dataset are not both defined`)
            return undefined
        }

    }

    setBackgroundColor(rgb) {
        this.backgroundColor = rgb
        this.backgroundRGBString = IGVColor.rgbColor(rgb.r, rgb.g, rgb.b)
        this.repaint()
    }

    stringifyBackgroundColor() {
        return `${this.backgroundColor.r},${this.backgroundColor.g},${this.backgroundColor.b}`;
    }

    static parseBackgroundColor(rgbString) {
        const [r, g, b] = rgbString.split(",").map(str => parseInt(str))
        return {r, g, b}
    }

    setColorScale(colorScale) {

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
    }

    async setColorScaleThreshold(threshold) {
        this.getColorScale().setThreshold(threshold);
        this.colorScaleThresholdCache[colorScaleKey(this.browser.state, this.displayMode)] = threshold;
        this.imageTileCache = {};
        await this.update()
    }

    getColorScale() {
        switch (this.displayMode) {
            case 'AOB':
            case 'BOA':
                return this.ratioColorScale;
            case 'AMB':
                return this.diffColorScale;
            default:
                return this.colorScale;
        }
    }

    async setDisplayMode(mode) {
        this.displayMode = mode;
        this.clearImageCaches();
        await this.update();
    }

    clearImageCaches() {
        this.imageTileCache = {};
        this.imageTileCacheKeys = [];
    }

    getViewDimensions() {
        return {
            width: this.$viewport.width(),
            height: this.$viewport.height()
        }
    }

    async receiveEvent(event) {

        if ("MapLoad" === event.type || "ControlMapLoad" === event.type) {

            if (!this.mouseHandlersEnabled) {
                this.addMouseHandlers(this.$viewport);
                this.mouseHandlersEnabled = true;
            }
            this.clearImageCaches();
            this.colorScaleThresholdCache = {};
        } else {
            if (!("LocusChange" === event.type)) {
                this.clearImageCaches();
            }
            this.update();
        }
    }

    async update() {

        if (this.disableUpdates) return   // This flag is set during browser startup

        await this.repaint()

    }

    async repaint() {

        if (undefined === this.browser.dataset) {
            return
        }

        console.log('ContactMatrixView - render Hi-C canvas')

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

        const browser = this.browser;
        const state = browser.state;

        let ds;
        let dsControl;
        let zdControl;
        let zoom;
        let controlZoom;
        switch (this.displayMode) {
            case 'A':
                zoom = state.zoom;
                ds = this.browser.dataset;
                break;
            case 'B':
                zoom = getBZoomIndex(state.zoom);
                ds = this.browser.controlDataset;
                break;
            case 'AOB':
            case 'AMB':
                zoom = state.zoom;
                controlZoom = getBZoomIndex(state.zoom);
                ds = this.browser.dataset
                dsControl = this.browser.controlDataset
                break;
            case 'BOA':
                zoom = getBZoomIndex(state.zoom);
                controlZoom = state.zoom;
                ds = this.browser.controlDataset
                dsControl = this.browser.dataset
        }

        const matrix = await ds.getMatrix(state.chr1, state.chr2)
        const unit = "BP";   // FRAG is not supported
        const zd = matrix.getZoomDataByIndex(zoom, unit);

        if (dsControl) {
            const matrixControl = await dsControl.getMatrix(state.chr1, state.chr2)
            zdControl = matrixControl.getZoomDataByIndex(controlZoom, unit);
        }

        const pixelSizeInt = Math.max(1, Math.floor(state.pixelSize))
        const widthInBins = this.$viewport.width() / pixelSizeInt
        const heightInBins = this.$viewport.height() / pixelSizeInt
        const blockCol1 = Math.floor(state.x / imageTileDimension)
        const blockCol2 = Math.floor((state.x + widthInBins) / imageTileDimension)
        const blockRow1 = Math.floor(state.y / imageTileDimension)
        const blockRow2 = Math.floor((state.y + heightInBins) / imageTileDimension)

        if ("NONE" !== state.normalization) {
            if (!ds.hasNormalizationVector(state.normalization, zd.chr1.name, zd.zoom.unit, zd.zoom.binSize)) {
                Alert.presentAlert("Normalization option " + normalization + " unavailable at this resolution.");
                this.browser.eventBus.post(new HICEvent("NormalizationExternalChange", "NONE"));
                state.normalization = "NONE";
            }
        }

        await this.checkColorScale(ds, zd, blockRow1, blockRow2, blockCol1, blockCol2, state.normalization)

        this.ctx.clearRect(0, 0, viewportWidth, viewportHeight);
        for (let r = blockRow1; r <= blockRow2; r++) {
            for (let c = blockCol1; c <= blockCol2; c++) {
                const tile = await this.getImageTile(ds, dsControl, zd, zdControl, r, c, state)
                if (tile.image) {
                    this.paintTile(tile)
                }
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

        function getBZoomIndex(zoom) {
            const binSize = browser.dataset.getBinSizeForZoomIndex(zoom);
            if (!binSize) {
                throw Error("Invalid zoom (resolution) index: " + zoom);
            }
            const bZoom = browser.controlDataset.getZoomIndexForBinSize(binSize);
            if (bZoom < 0) {
                throw Error(`Invalid binSize for "B" map: ${binSize}`);
            }
            return bZoom;
        }
    }

    /**
     * This is where the image tile is actually drawn, if not in the cache
     *
     * @param ds
     * @param dsControl
     * @param zd
     * @param zdControl
     * @param row
     * @param column
     * @param state
     * @returns {Promise<{image: HTMLCanvasElement, column: *, row: *, blockBinCount}|{image, inProgress: boolean, column: *, row: *, blockBinCount}|*>}
     */
    async getImageTile(ds, dsControl, zd, zdControl, row, column, state) {

        const key = `${zd.chr1.name}_${zd.chr2.name}_${zd.zoom.binSize}_${zd.zoom.unit}_${row}_${column}_${state.normalization}_${this.displayMode}`

        if (this.imageTileCache.hasOwnProperty(key)) {
            return this.imageTileCache[key]

        } else {
            if (this.drawsInProgress.has(key)) {
                //console.log("In progress")
                const imageSize = imageTileDimension
                const image = inProgressTile(imageSize)
                return {
                    row: row,
                    column: column,
                    blockBinCount: imageTileDimension,
                    image: image,
                    inProgress: true
                }  // TODO return an image at a coarser resolution if avaliable

            }
            this.drawsInProgress.add(key)

            try {
                this.startSpinner()
                const sameChr = zd.chr1.index === zd.chr2.index
                const transpose = sameChr && row < column
                const averageCount = zd.averageCount
                const ctrlAverageCount = zdControl ? zdControl.averageCount : 1
                const averageAcrossMapAndControl = (averageCount + ctrlAverageCount) / 2

                const imageSize = imageTileDimension
                const image = document.createElement('canvas');
                image.width = imageSize;
                image.height = imageSize;
                const ctx = image.getContext('2d');
                //ctx.clearRect(0, 0, image.width, image.height);

                // Get blocks
                const widthInBP = imageTileDimension * zd.zoom.binSize;
                const x0bp = column * widthInBP;
                const region1 = {chr: zd.chr1.name, start: x0bp, end: x0bp + widthInBP};
                const y0bp = row * widthInBP;
                const region2 = {chr: zd.chr2.name, start: y0bp, end: y0bp + widthInBP};
                const records = await ds.getContactRecords(state.normalization, region1, region2, zd.zoom.unit, zd.zoom.binSize);
                let cRecords;
                if (zdControl) {
                    cRecords = await dsControl.getContactRecords(state.normalization, region1, region2, zdControl.zoom.unit, zdControl.zoom.binSize);
                }

                if (records.length > 0) {

                    const controlRecords = {};
                    if ('AOB' === this.displayMode || 'BOA' === this.displayMode || 'AMB' === this.displayMode) {
                        for (let record of cRecords) {
                            controlRecords[record.getKey()] = record
                        }
                    }

                    let id = ctx.getImageData(0, 0, image.width, image.height);


                    const x0 = transpose ? row * imageTileDimension : column * imageTileDimension;
                    const y0 = transpose ? column * imageTileDimension : row * imageTileDimension;
                    for (let i = 0; i < records.length; i++) {

                        const rec = records[i];
                        let x = Math.floor((rec.bin1 - x0));
                        let y = Math.floor((rec.bin2 - y0));

                        if (transpose) {
                            const t = y;
                            y = x;
                            x = t;
                        }

                        let rgba
                        switch (this.displayMode) {

                            case 'AOB':
                            case 'BOA':
                                let key = rec.getKey();
                                let controlRec = controlRecords[key];
                                if (!controlRec) {
                                    continue;    // Skip
                                }
                                let score = (rec.counts / averageCount) / (controlRec.counts / ctrlAverageCount);

                                rgba = this.ratioColorScale.getColor(score);

                                break;

                            case 'AMB':
                                key = rec.getKey();
                                controlRec = controlRecords[key];
                                if (!controlRec) {
                                    continue;    // Skip
                                }
                                score = averageAcrossMapAndControl * ((rec.counts / averageCount) - (controlRec.counts / ctrlAverageCount));

                                rgba = this.diffColorScale.getColor(score);

                                break;

                            default:    // Either 'A' or 'B'
                                rgba = this.colorScale.getColor(rec.counts);
                        }

                        // const { red, green, blue, alpha } = rgba
                        // console.log(`getImageTile - alpha ${ alpha }`)

                        // TODO -- verify that this bitblting is faster than fillRect
                        setPixel(id, x, y, rgba.red, rgba.green, rgba.blue, rgba.alpha);
                        if (sameChr && row === column) {
                            setPixel(id, y, x, rgba.red, rgba.green, rgba.blue, rgba.alpha);
                        }

                    }

                    ctx.putImageData(id, 0, 0);
                } else {
                    //console.log("No block for " + blockNumber);
                }

                //Draw 2D tracks
                ctx.save();
                ctx.lineWidth = 2;
                for (let track2D of this.browser.tracks2D) {

                    if (track2D.isVisible) {

                        const chr1Name = zd.chr1.name;
                        const chr2Name = zd.chr2.name;
                        const features = track2D.getFeatures(chr1Name, chr2Name);

                        if (features) {

                            for (let {chr1, x1, x2, y1, y2, color} of features) {

                                // Chr name order
                                const flip = chr1Name !== chr1;

                                const fx1 = transpose || flip ? y1 : x1;
                                const fx2 = transpose || flip ? y2 : x2;
                                const fy1 = transpose || flip ? x1 : y1;
                                const fy2 = transpose || flip ? x2 : y2;

                                let px1 = (fx1 - x0bp) / zd.zoom.binSize;
                                let px2 = (fx2 - x0bp) / zd.zoom.binSize;
                                let py1 = (fy1 - y0bp) / zd.zoom.binSize;
                                let py2 = (fy2 - y0bp) / zd.zoom.binSize;
                                let w = px2 - px1;
                                let h = py2 - py1;

                                const dim = Math.max(image.width, image.height);
                                if (px2 > 0 && px1 < dim && py2 > 0 && py1 < dim) {
                                    //console.log(`${row} ${column}    ${x1} ${x2}`)
                                    ctx.strokeStyle = track2D.color ? track2D.color : color;
                                    ctx.strokeRect(px1, py1, w, h);
                                    if (sameChr && row === column) {
                                        ctx.strokeRect(py1, px1, h, w);
                                    }
                                }
                            }
                        }
                    }
                }


                ctx.restore();

                // Uncomment to reveal tile boundaries for debugging.
                //  ctx.fillStyle = "rgb(255,255,255)";
                //  ctx.strokeRect(0, 0, image.width - 1, image.height - 1)


                var imageTile = {row: row, column: column, blockBinCount: imageTileDimension, image: image}


                if (this.imageTileCacheLimit > 0) {
                    if (this.imageTileCacheKeys.length > this.imageTileCacheLimit) {
                        delete this.imageTileCache[this.imageTileCacheKeys[0]]
                        this.imageTileCacheKeys.shift()
                    }
                    this.imageTileCache[key] = imageTile

                }

                return imageTile;

            } finally {
                //console.log("Finish load for " + key)
                this.drawsInProgress.delete(key)
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

    }

    /**
     * Return a promise to adjust the color scale, if needed.  This function might need to load the contact
     * data to computer scale.
     *
     * @param ds
     * @param zd
     * @param row1
     * @param row2
     * @param col1
     * @param col2
     * @param normalization
     * @returns {*}
     */
    async checkColorScale(ds, zd, row1, row2, col1, col2, normalization) {

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
        } else {
            try {
                const widthInBP = imageTileDimension * zd.zoom.binSize;
                const x0bp = col1 * widthInBP;
                const xWidthInBP = (col2 - col1 + 1) * widthInBP;
                const region1 = {chr: zd.chr1.name, start: x0bp, end: x0bp + xWidthInBP};
                const y0bp = row1 * widthInBP;
                const yWidthInBp = (row2 - row1 + 1) * widthInBP;
                const region2 = {chr: zd.chr2.name, start: y0bp, end: y0bp + yWidthInBp};
                const records = await ds.getContactRecords(normalization, region1, region2, zd.zoom.unit, zd.zoom.binSize, true);

                let s = computePercentile(records, 95);
                if (!isNaN(s)) {  // Can return NaN if all blocks are empty
                    if (0 === zd.chr1.index) s *= 4;   // Heuristic for whole genome view
                    this.colorScale = new ColorScale(this.colorScale);
                    this.colorScale.setThreshold(s);
                    this.computeColorScale = false;
                    this.browser.eventBus.post(HICEvent("ColorScale", this.colorScale));
                    this.colorScaleThresholdCache[colorKey] = s;
                }

                return this.colorScale;
            } finally {
                this.stopSpinner()
            }


        }

    }

    async zoomIn() {
        const state = this.browser.state
        const viewportWidth = this.$viewport.width()
        const viewportHeight = this.$viewport.height()
        const matrices = await getMatrices.call(this, state.chr1, state.chr2)

        var matrix = matrices[0];

        if (matrix) {
            const unit = "BP";
            const zd = await matrix.getZoomDataByIndex(state.zoom, unit);
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

    paintTile({image, row, column, blockBinCount}) {

        const x0 = blockBinCount * column
        const y0 = blockBinCount * row

        const {x, y, pixelSize} = this.browser.state
        //const pixelSizeInt = Math.max(1, Math.floor(pixelSize))
        const offsetX = (x0 - x) * pixelSize
        const offsetY = (y0 - y) * pixelSize

        const scale = pixelSize; // / pixelSizeInt
        const scaledWidth = image.width * scale
        const scaledHeight = image.height * scale

        const viewportWidth = this.$viewport.width()
        const viewportHeight = this.$viewport.height()

        if (offsetX <= viewportWidth && offsetX + scaledWidth >= 0 && offsetY <= viewportHeight && offsetY + scaledHeight >= 0) {
            this.ctx.fillStyle = this.backgroundRGBString;
            this.ctx.fillRect(offsetX, offsetY, scaledWidth, scaledHeight);
            if (scale === 1) {
                this.ctx.drawImage(image, offsetX, offsetY);
            } else {
                this.ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
            }
            // Debugging aid, uncomment to see tile boundaries
            //this.ctx.strokeRect(offsetX, offsetY, scaledWidth, scaledHeight)
            //this.ctx.strokeText(`${row} ${column}`, offsetX, offsetY);
        }
    }

    async renderWithLiveContactFrequencyData(state, liveContactMapDataSet, frequencies, frequencyRGBAList, liveMapTraceLength) {

        this.browser.eventBus.post(HICEvent('MapLoad', { dataset: liveContactMapDataSet, state }))

        this.browser.locusGoto.doChangeLocus({ dataset: liveContactMapDataSet, state })

        const zoomIndexA = state.zoom
        const { chr1, chr2 } = state
        const zoomData = liveContactMapDataSet.getZoomDataByIndex(chr1, chr2, zoomIndexA)

        console.log('ContactMatrixView - render Live Contact canvas')

        this.checkColorScale_sw(this.browser, state, 'LIVE', liveContactMapDataSet, zoomData)

        paintContactFrequencyArrayWithColorScale(this.colorScale, frequencies, frequencyRGBAList, this.backgroundColor)

        await renderArrayToCanvas(this.ctx_live, frequencyRGBAList, liveMapTraceLength)

    }

    checkColorScale_sw(browser, state, displayMode, liveContactMapDataSet, zoomData) {

        const colorScaleKey = createColorScaleKey(state, displayMode)

        let percentile = computeContactRecordsPercentile(liveContactMapDataSet.contactRecordList, 95)

        if (!isNaN(percentile)) {

            if (0 === zoomData.chr1.index) {
                // Heuristic for whole genome view
                percentile *= 4
            }

            this.colorScale = new hic.ColorScale(this.colorScale)

            this.colorScale.setThreshold(percentile)

            browser.eventBus.post(HICEvent("ColorScale", this.colorScale))

            this.colorScaleThresholdCache[colorScaleKey] = percentile

        }

        return this.colorScale

    }

    startSpinner() {

        if (true === this.browser.isLoadingHICFile && this.browser.$user_interaction_shield) {
            this.browser.$user_interaction_shield.show();
        }
        this.$fa_spinner.css("display", "inline-block");
        this.spinnerCount++
    }

    stopSpinner() {
        this.spinnerCount--
        if (0 === this.spinnerCount) {
            this.$fa_spinner.css("display", "none")
        }
        this.spinnerCount = Math.max(0, this.spinnerCount)   // This should not be neccessary
    }

    addMouseHandlers($viewport) {

        let isMouseDown = false;
        let isSweepZooming = false;
        let mouseDown;
        let mouseLast;
        let mouseOver;

        const panMouseUpOrMouseOut = (e) => {
            if (true === this.isDragging) {
                this.isDragging = false;
                this.browser.eventBus.post(HICEvent("DragStopped"));
            }
            isMouseDown = false;
            mouseDown = mouseLast = undefined;
        }

        this.isDragging = false;

        $viewport.dblclick((e) => {
            e.preventDefault();
            e.stopPropagation();
            const mouseX = e.offsetX || e.layerX
            const mouseY = e.offsetY || e.layerX;
            this.browser.zoomAndCenter(1, mouseX, mouseY);
        });

        $viewport.on('mouseover', (e) => mouseOver = true)

        $viewport.on('mouseout', (e) => mouseOver = undefined)

        $viewport.on('mousedown', (e) => {

            e.preventDefault();
            e.stopPropagation();

            if (this.browser.$menu.is(':visible')) {
                this.browser.hideMenu();
            }

            mouseLast = {x: e.offsetX, y: e.offsetY};
            mouseDown = {x: e.offsetX, y: e.offsetY};

            isSweepZooming = (true === e.altKey);
            if (isSweepZooming) {
                const eFixed = $.event.fix(e);
                this.sweepZoom.initialize({x: eFixed.pageX, y: eFixed.pageY});
            }

            isMouseDown = true;

        })

        $viewport.on('mousemove', (e) => {

            e.preventDefault();
            e.stopPropagation();
            const coords =
                {
                    x: e.offsetX,
                    y: e.offsetY
                };

            // Sets pageX and pageY for browsers that don't support them
            const eFixed = $.event.fix(e);

            const xy =
                {
                    x: eFixed.pageX - $viewport.offset().left,
                    y: eFixed.pageY - $viewport.offset().top
                };

            const {width, height} = $viewport.get(0).getBoundingClientRect();
            xy.xNormalized = xy.x / width;
            xy.yNormalized = xy.y / height;


            this.browser.eventBus.post(HICEvent("UpdateContactMapMousePosition", xy, false));

            if (true === this.willShowCrosshairs) {
                this.browser.updateCrosshairs(xy);
                this.browser.showCrosshairs();
            }

            if (isMouseDown) { // Possibly dragging

                if (isSweepZooming) {
                    this.sweepZoom.update({x: eFixed.pageX, y: eFixed.pageY});

                } else if (mouseDown.x && Math.abs(coords.x - mouseDown.x) > DRAG_THRESHOLD) {

                    this.isDragging = true;
                    const dx = mouseLast.x - coords.x;
                    const dy = mouseLast.y - coords.y;

                    // If matrix data is updating shift current map image while we wait
                    //if (this.updating) {
                    //    shiftCurrentImage(this, -dx, -dy);
                    //}

                    this.browser.shiftPixels(dx, dy);
                }

                mouseLast = coords;
            }
        })

        $viewport.on('mouseup', panMouseUpOrMouseOut)

        $viewport.on('mouseleave', () => {
            this.browser.layoutController.xAxisRuler.unhighlightWholeChromosome();
            this.browser.layoutController.yAxisRuler.unhighlightWholeChromosome();
            panMouseUpOrMouseOut();
        })


        $(document).on('keydown.contact_matrix_view', (e) => {
            if (undefined === this.willShowCrosshairs && true === mouseOver && true === e.shiftKey) {
                this.willShowCrosshairs = true;
                this.browser.eventBus.post(HICEvent('DidShowCrosshairs', 'DidShowCrosshairs', false));
            }
        })

        $(document).on('keyup.contact_matrix_view', (e) => {
            this.browser.hideCrosshairs();
            this.willShowCrosshairs = undefined;
            this.browser.eventBus.post(HICEvent('DidHideCrosshairs', 'DidHideCrosshairs', false));
        })

        // for sweep-zoom allow user to sweep beyond viewport extent
        // sweep area clamps since viewport mouse handlers stop firing
        // when the viewport boundary is crossed.
        $(document).on('mouseup.contact_matrix_view', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isSweepZooming) {
                isSweepZooming = false;
                this.sweepZoom.commit();
            }
        })
    }

}

ContactMatrixView.defaultBackgroundColor = {r: 255, g: 255, b: 255}

function paintContactFrequencyArrayWithColorScale(colorScale, frequencies, frequencyRGBAList, backgroundRGB) {

    const compositeColors = (foreRGBA, backRGB) => {

        const alpha = foreRGBA.a / 255;

        const r = Math.round(alpha * foreRGBA.r + (1 - alpha) * backRGB.r);
        const g = Math.round(alpha * foreRGBA.g + (1 - alpha) * backRGB.g);
        const b = Math.round(alpha * foreRGBA.b + (1 - alpha) * backRGB.b);

        return { r, g, b };
    }


    let i = 0
    for (const frequency of frequencies) {

        const { red, green, blue, alpha } = colorScale.getColor(frequency)
        const foregroundRGBA = { r:red, g:green, b:blue, a:alpha }
        const { r, g, b } = compositeColors(foregroundRGBA, backgroundRGB)

        frequencyRGBAList[i++] = r
        frequencyRGBAList[i++] = g
        frequencyRGBAList[i++] = b
        frequencyRGBAList[i++] = 255
    }
}

async function renderArrayToCanvas(ctx, rgbaList, liveMapTraceLength) {

    const { width, height } = ctx.canvas;

    const imageData = new ImageData(rgbaList, liveMapTraceLength, liveMapTraceLength);

    // const config =
    //     {
    //         resizeWidth: width,
    //         resizeHeight: height
    //     };
    //
    // const imageBitmap = await createImageBitmap(imageData, config);

    const imageBitmap = await createImageBitmap(imageData)

    ctx.transferFromImageBitmap(imageBitmap);

}

function createColorScaleKey(state, displayMode) {
    return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization + "_" + displayMode;
}

function computeContactRecordsPercentile(contactRecords, p) {

    const counts = contactRecords.map(({ counts }) => counts)

    counts.sort((a, b) => a - b)

    const index = Math.floor((p / 100) * contactRecords.length);
    return counts[index];

}

function colorScaleKey(state, displayMode) {
    return "" + state.chr1 + "_" + state.chr2 + "_" + state.zoom + "_" + state.normalization + "_" + displayMode;
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

function getMatrices(chr1, chr2) {

    var promises = [];
    if ('B' === this.displayMode && this.browser.controlDataset) {
        promises.push(this.browser.controlDataset.getMatrix(chr1, chr2));
    } else {
        promises.push(this.browser.dataset.getMatrix(chr1, chr2));
        if (this.displayMode && 'A' !== this.displayMode && this.browser.controlDataset) {
            promises.push(this.browser.controlDataset.getMatrix(chr1, chr2));
        }
    }
    return Promise.all(promises);
}

function computePercentile(records, p) {
    const counts = records.map(r => r.counts)
    counts.sort(function (a, b) {
        return a - b;
    })
    const idx = Math.floor((p / 100) * records.length);
    return counts[idx];

    // return HICMath.percentile(array, p);
}

export default ContactMatrixView
