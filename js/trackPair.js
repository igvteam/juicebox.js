/**
 * Created by dat on 4/5/17.
 */

import igv from '../node_modules/igv/dist/igv.esm.js'
import {StringUtils} from '../node_modules/igv-utils/src/index.js'
import {ColorPicker, DataRangeDialog} from '../node_modules/igv-ui/dist/igv-ui.js'
import $ from '../vendor/jquery-3.3.1.slim.js'
import MenuUtils from "./trackMenuUtils.js"
import MenuPopup from "./trackMenuPopup.js"
import {createIcon} from "./igv-icons.js"
import TrackRenderer from "./trackRenderer.js";
import Tile from "./tile.js";

class TrackPair {

    constructor(browser, trackHeight, $x_tracks, $y_tracks, track, index) {

        this.browser = browser;
        this.track = track;

        this.x = new TrackRenderer(browser, track, 'x')
        this.x.init($x_tracks, { height: trackHeight }, index)

        this.y = new TrackRenderer(browser, track, 'y')
        this.y.init($y_tracks, { width: trackHeight }, index)
    }

    init() {

        this.colorPicker = new ColorPicker({
            parent: this.x.$viewport[0],
            width: 456,
            height: undefined,
            colorHandler: color => this.setColor(color)
        });
        this.colorPicker.hide();

        this.dataRangeDialog = new DataRangeDialog(this.x.$viewport[0], (min, max) => this.setDataRange(min, max));

        this.appendRightHandGutter(this.x.$viewport);

        for (const el of this.x.$trackReorderHandle.get(0).querySelectorAll('.fa')) {

            el.addEventListener('click', e => {

                e.preventDefault()
                e.stopPropagation()

                const direction = e.target.classList.contains('fa-arrow-up') ? -1 : 1

                let order = parseInt(this.x.$viewport.get(0).style.order)

                if (0 === order && -1 === direction) {
                    return
                } else if (this.browser.trackPairs.length - 1 === order && 1 === direction) {
                    return
                }

                if (-1 === direction) {
                    --order
                    if (order < 0 ) {
                        order = this.browser.trackPairs.length - 1
                    }
                } else {
                    ++order
                    if (this.browser.trackPairs.length === order) {
                        order = 0
                    }
                }

                const [ targetTrackPair ] = this.browser.trackPairs.filter(trackPair => order === parseInt(trackPair.x.$viewport.get(0).style.order))
                targetTrackPair.x.$viewport.get(0).style.order = this.x.$viewport.get(0).style.order
                targetTrackPair.y.$viewport.get(0).style.order = this.y.$viewport.get(0).style.order

                this.x.$viewport.get(0).style.order = `${ order }`
                this.y.$viewport.get(0).style.order = `${ order }`


            })
        }

        // igvjs compatibility
        this.track.trackView = this;
        this.track.trackView.trackDiv = this.x.$viewport.get(0);

    }

    presentColorPicker() {
        const bbox = this.x.trackDiv.getBoundingClientRect();
        this.colorPicker.origin = {x: bbox.x, y: 0};
        this.colorPicker.$container.offset({left: this.colorPicker.origin.x, top: this.colorPicker.origin.y});
        this.colorPicker.$container.show();
    }

    setTrackName(name) {
        this.track.id = name
        this.x.$label.text(name)
    }

    setColor(color) {
        this.y.tile = undefined;
        this.x.tile = undefined;
        this.track.color = color;
        this.repaintViews();
    }

    dataRange() {
        return this.track.dataRange ? this.track.dataRange : undefined;
    }

    setDataRange(min, max) {
        if (min !== undefined) {
            this.track.dataRange.min = min;
            this.track.config.min = min;
        }
        if (max !== undefined) {
            this.track.dataRange.max = max;
            this.track.config.max = max;
        }
        this.track.autoscale = false;
        this.track.config.autoScale = false
        this.y.tile = undefined;
        this.x.tile = undefined;
        this.repaintViews();
    }

    appendRightHandGutter($parent) {
        let $div = $('<div class="hic-igv-right-hand-gutter">')
        $parent.append($div)
        this.createTrackGearPopup($div);
    }

    createTrackGearPopup($parent) {

        let $container = $("<div>", {class: 'igv-trackgear-container'});
        $parent.append($container);

        $container.append(createIcon('cog'));

        this.trackGearPopup = new MenuPopup($parent);
        this.trackGearPopup.$popover.hide();
        $container.click(e => {
            e.preventDefault();
            e.stopPropagation();
            this.trackGearPopup.presentMenuList(-(this.trackGearPopup.$popover.width()), 0, MenuUtils.trackMenuItemList(this));
        });
    }

    async updateViews() {

        if (this.updating) {
            this.pending = true;
        } else {
            try {
                this.updating = true;
                const genomicStateX = this.browser.genomicState(this.x.axis);
                let imageTileX = await this.getTileX(genomicStateX);
                if (imageTileX) {
                    this.x.drawTile(imageTileX, genomicStateX);
                }

                const genomicStateY = this.browser.genomicState(this.y.axis);
                let imageTileY = await this.getTileY(genomicStateY);
                if (imageTileY) {
                    this.y.drawTile(imageTileY, genomicStateY);
                }
            } finally {
                this.updating = false;
                if (this.pending) {
                    this.pending = false;
                    this.updateViews();
                }
            }
        }
    }

    /**
     * Repaint current tiles with cached features (due to color, scale, or other visual attribute change)
     * @returns {Promise<void>}
     */
    async repaintViews() {

        const genomicStateX = this.browser.genomicState(this.x.axis);
        if (this.tileX) {
            this.tileX = await this.createImageTile(genomicStateX, this.tileX.features)
            this.x.drawTile(this.tileX, genomicStateX);
        }

        const genomicStateY = this.browser.genomicState(this.y.axis);
        if (this.tileY) {
            this.tileY = await this.createImageTile(genomicStateX, this.tileY.features)
            this.y.drawTile(this.tileY, genomicStateY);
        }
    }

    async getTileX(genomicState) {
        const chrName = genomicState.chromosome.name;
        const bpPerPixel = genomicState.bpp;
        if (!(this.tileX && this.tileX.containsRange(chrName, genomicState.startBP, genomicState.endBP, bpPerPixel))) {
            this.tileX = await this.createImageTile(genomicState);
        }
        return this.tileX;
    }

    async getTileY(genomicState) {
        const chrName = genomicState.chromosome.name;
        const bpPerPixel = genomicState.bpp;
        if (this.tileX && this.tileX.containsRange(chrName, genomicState.startBP, genomicState.endBP, bpPerPixel)) {
            this.tileY = this.tileX;
        } else if (!(this.tileY && this.tileY.containsRange(chrName, genomicState.startBP, genomicState.endBP, bpPerPixel))) {
            this.tileY = await this.createImageTile(genomicState);
        }
        return this.tileY;
    }

    async createImageTile(genomicState, tileFeatures) {

        if (this.track.visibilityWindow > 0 && genomicState.bpp * Math.max(this.x.$canvas.width(), this.x.$canvas.height()) > this.track.visibilityWindow) {
            // TODO -- return zoom in message
        } else {

            // Expand the requested range so we can pan a bit without reloading
            const pixelWidth = 3 * this.x.$canvas.width();
            const lengthBP = Math.round(genomicState.bpp * pixelWidth);
            const bpStart = Math.max(0, Math.round(genomicState.startBP - lengthBP / 3));
            const bpEnd = bpStart + lengthBP;

            const features = tileFeatures || await this.track.getFeatures(genomicState.chromosome.name, bpStart, bpEnd, genomicState.bpp)

            const canvas = document.createElement('canvas');
            canvas.width = pixelWidth;
            canvas.height = this.x.$canvas.height();

            const context = canvas.getContext("2d");

            if (features) {
                const drawConfiguration =
                    {
                        features,
                        context,
                        pixelWidth,
                        bpStart,
                        bpEnd,
                        bpPerPixel: genomicState.bpp,
                        genomicState,
                        pixelHeight: Math.min(canvas.width, canvas.height),
                        viewportContainerX: (genomicState.startBP - bpStart) / genomicState.bpp,
                        viewportContainerWidth: pixelWidth,
                        viewportWidth: pixelWidth,
                        referenceFrame: {}
                    };

                if (this.track.autoscale || !this.track.dataRange) {
                    if (typeof this.track.doAutoscale === 'function') {
                        this.track.doAutoscale(features);
                    } else {
                        this.track.dataRange = doAutoscale(features);
                    }
                }
                this.track.draw(drawConfiguration);


            } else {

                // context.clearRect(0, 0, this.x.$canvas.width(), this.x.$canvas.height())

                // igv.IGVGraphics.fillRect(context, 0, 0, canvas.width, canvas.height, { 'fillStyle': 'rgb(0, 255, 0)' });

                const wye = canvas.height - canvas.height/4
                igv.IGVGraphics.fillRect(context, 0, wye, canvas.width, 2, { 'fillStyle': 'rgba(0,0,0,0.1)' });

                // igv.IGVGraphics.drawRandomColorVerticalLines(context)

            }

            this.tile = new Tile(genomicState.chromosome.name, bpStart, bpEnd, genomicState.bpp, canvas, features);
            return this.tile
        }
    }

    dispose() {
        this.x.dispose()
        this.y.dispose()
    }
}

function doAutoscale(features) {
    var min, max

    if (features.length > 0) {
        min = Number.MAX_VALUE
        max = -Number.MAX_VALUE

        features.forEach(function (f) {
            if (!Number.isNaN(f.value)) {
                min = Math.min(min, f.value)
                max = Math.max(max, f.value)
            }
        })

        // Insure we have a zero baseline
        if (max > 0) min = Math.min(0, min)
        if (max < 0) max = 0
    } else {
        // No features -- default
        min = 0
        max = 100
    }

    return {min: min, max: max}
}

export default TrackPair
