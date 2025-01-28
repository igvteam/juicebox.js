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
 * Created by dat on 3/3/17.
 */
import { StringUtils } from '../node_modules/igv-utils/src/index.js';

class LocusGoto {

    constructor(browser, hicNavbarContainer) {
        this.browser = browser;

        const parentElement = hicNavbarContainer.querySelector("div[id$='upper-hic-nav-bar-widget-container']");

        this.containerElement = document.createElement('div');
        this.containerElement.className = 'hic-chromosome-goto-container';
        this.containerElement.title = 'Chromosome Goto';
        parentElement.appendChild(this.containerElement);

        this.resolutionSelectorElement = document.createElement('input');
        this.resolutionSelectorElement.type = 'text';
        this.resolutionSelectorElement.placeholder = 'chr-x-axis chr-y-axis';
        this.containerElement.appendChild(this.resolutionSelectorElement);

        this.resolutionSelectorElement.addEventListener('change', (e) => {
            this.browser.parseGotoInput(this.resolutionSelectorElement.value);
            this.resolutionSelectorElement.blur();
        });

        this.browser.eventBus.subscribe("LocusChange", this);
    }

    receiveEvent(event) {
        if (event.type === "LocusChange") {
            let xy;
            const state = event.data.state || this.browser.state;
            const isWholeGenome = this.browser.dataset.isWholeGenome(state.chr1);
            if (isWholeGenome) {
                xy = 'All';
            } else {
                const chr1 = this.browser.dataset.chromosomes[state.chr1];
                const chr2 = this.browser.dataset.chromosomes[state.chr2];
                const bpPerBin = this.browser.dataset.bpResolutions[state.zoom];
                const dimensionsPixels = this.browser.contactMatrixView.getViewDimensions();
                const pixelsPerBin = state.pixelSize;
                const startBP1 = 1 + Math.round(state.x * bpPerBin);
                const startBP2 = 1 + Math.round(state.y * bpPerBin);
                const endBP1 = Math.min(chr1.size, Math.round(((dimensionsPixels.width / pixelsPerBin) * bpPerBin)) + startBP1 - 1);
                const endBP2 = Math.min(chr2.size, Math.round(((dimensionsPixels.height / pixelsPerBin) * bpPerBin)) + startBP2 - 1);

                xy = `${chr1.name}:${StringUtils.numberFormatter(startBP1)}-${StringUtils.numberFormatter(endBP1)} ` +
                    `${chr2.name}:${StringUtils.numberFormatter(startBP2)}-${StringUtils.numberFormatter(endBP2)}`;
            }
            this.resolutionSelectorElement.value = xy;
        }
    }
}

export default LocusGoto;
