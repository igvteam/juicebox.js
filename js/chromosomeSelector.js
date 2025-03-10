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
 * Creates and manages the chromosome selector UI component
 * @param {HICBrowser} browser - The HIC browser instance
 * @param {HTMLElement} container - The container element for the chromosome selector
 */
function createChromosomeSelector(browser, container) {
    const xAxisSelector = container.querySelector("select[name='x-axis-selector']");
    const yAxisSelector = container.querySelector("select[name='y-axis-selector']");

    // Sync selectors when either changes
    xAxisSelector.addEventListener('change', () => syncSelectors(xAxisSelector, yAxisSelector));
    yAxisSelector.addEventListener('change', () => syncSelectors(yAxisSelector, xAxisSelector));

    // Handle chromosome swap button click
    const nextDiv = yAxisSelector.nextElementSibling;
    if (nextDiv) {
        nextDiv.addEventListener('click', async () => {
            const chrX = browser.dataset.chromosomes[parseInt(xAxisSelector.value, 10)];
            const chrY = browser.dataset.chromosomes[parseInt(yAxisSelector.value, 10)];

            const xLocus = browser.parseLocusString(chrX.name);
            const yLocus = browser.parseLocusString(chrY.name);

            await browser.setChromosomes(xLocus, yLocus);
        });
    }

    // Subscribe to browser events
    browser.eventBus.subscribe("MapLoad", (event) => {
        respondToDataLoadWithDataset(event.data);
    });

    browser.eventBus.subscribe("LocusChange", (event) => {
        respondToLocusChangeWithState(event.data.state);
    });

    function syncSelectors(sourceSelector, targetSelector) {
        const value = sourceSelector.value;
        if (parseInt(value, 10) === 0 || parseInt(targetSelector.value, 10) === 0) {
            targetSelector.value = value;
        }
    }

    function respondToDataLoadWithDataset(dataset) {
        const { chromosomes } = dataset;
        const options = chromosomes.map(({ name }, index) => `<option value="${index}">${name}</option>`).join('');
        xAxisSelector.innerHTML = options;
        yAxisSelector.innerHTML = options;

        xAxisSelector.value = browser.state.chr1;
        yAxisSelector.value = browser.state.chr2;
    }

    function respondToLocusChangeWithState(state) {
        if (!xAxisSelector.options.length || !yAxisSelector.options.length) return;

        xAxisSelector.value = state.chr1;
        yAxisSelector.value = state.chr2;
    }
}

export default createChromosomeSelector; 