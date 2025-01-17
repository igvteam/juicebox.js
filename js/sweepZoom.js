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

class SweepZoom {

    constructor(browser, targetElement) {
        this.browser = browser;
        this.targetElement = targetElement;

        this.rulerSweeperElement = targetElement.querySelector("div[id$='-sweep-zoom-container']");
        this.rulerSweeperElement.style.display = 'none';

        this.sweepRect = {};
    }

    initialize(pageCoords) {
        this.anchor = pageCoords;
        const parentRect = this.rulerSweeperElement.parentElement.getBoundingClientRect();
        this.coordinateFrame = { top: parentRect.top + window.scrollY, left: parentRect.left + window.scrollX };
        this.aspectRatio = this.targetElement.offsetWidth / this.targetElement.offsetHeight;

        this.sweepRect.x = {
            x: pageCoords.x,
            y: pageCoords.y,
            width: 1,
            height: 1
        };

        this.clipped = { value: false };
    }

    update(pageCoords) {
        const anchor = this.anchor;
        let dx = Math.abs(pageCoords.x - anchor.x);
        let dy = Math.abs(pageCoords.y - anchor.y);

        // Adjust deltas to conform to aspect ratio
        if (dx / dy > this.aspectRatio) {
            dy = dx / this.aspectRatio;
        } else {
            dx = dy * this.aspectRatio;
        }

        this.sweepRect.width = dx;
        this.sweepRect.height = dy;
        this.sweepRect.x = anchor.x < pageCoords.x ? anchor.x : anchor.x - dx;
        this.sweepRect.y = anchor.y < pageCoords.y ? anchor.y : anchor.y - dy;

        this.rulerSweeperElement.style.width = `${this.sweepRect.width}px`;
        this.rulerSweeperElement.style.height = `${this.sweepRect.height}px`;
        this.rulerSweeperElement.style.left = `${this.sweepRect.x}px`;
        this.rulerSweeperElement.style.top = `${this.sweepRect.y}px`;
        this.rulerSweeperElement.style.display = 'block';
    }

    commit() {
        this.rulerSweeperElement.style.display = 'none';

        // Convert page -> offset coordinates
        const targetRect = this.targetElement.getBoundingClientRect();
        const xPixel = this.sweepRect.x - (targetRect.left + window.scrollX);
        const yPixel = this.sweepRect.y - (targetRect.top + window.scrollY);

        const { width, height } = this.browser.contactMatrixView.getViewDimensions();
        const { x, y, chr1, chr2, zoom, pixelSize } = this.browser.state;

        // bp-per-bin
        const bpResolution = this.browser.dataset.bpResolutions[zoom];

        // bp = ((bin + pixel/pixel-per-bin) / bp-per-bin)
        const xBP = (x + (xPixel / pixelSize)) * bpResolution;
        const yBP = (y + (yPixel / pixelSize)) * bpResolution;

        const widthBP = (this.sweepRect.width / pixelSize) * bpResolution;
        const heightBP = (this.sweepRect.height / pixelSize) * bpResolution;

        this.browser.goto(chr1, xBP, xBP + widthBP, chr2, yBP, yBP + heightBP);
    }
}

export default SweepZoom
