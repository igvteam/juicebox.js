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

import Track2D from './track2D.js';

class AnnotationWidget {
    constructor(browser, container, config) {
        this.browser = browser;
        this.container = container;
        this.config = config;
        this.panel = null;
        this.isPanelVisible = false;

        this.initialize();
    }

    initialize() {
        const button = this.container.querySelector("button");
        button.textContent = this.config.title;

        button.addEventListener('click', () => {
            if (!this.isPanelVisible) {
                this.showPanel();
            } else {
                this.hidePanel();
            }
        });
    }

    showPanel() {
        if (!this.panel) {
            this.panel = this.createPanel();
        }
        this.panel.style.display = 'block';
        this.isPanelVisible = true;
    }

    hidePanel() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.isPanelVisible = false;
        }
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.className = 'hic-annotation-panel';
        panel.style.display = 'none';
        this.container.appendChild(panel);

        const tracks = this.browser.tracks2D;
        if (!tracks || tracks.length === 0) {
            const message = document.createElement('div');
            message.className = 'hic-annotation-panel-message';
            message.textContent = this.config.alertMessage;
            panel.appendChild(message);
            return panel;
        }

        tracks.forEach(track => {
            const row = this.createAnnotationPanelRow(panel, track);
            panel.appendChild(row);
        });

        return panel;
    }

    createAnnotationPanelRow(container, track) {
        const isTrack2D = track instanceof Track2D;
        const rowContainer = document.createElement('div');
        rowContainer.className = 'hic-annotation-panel-row-container';
        const row = document.createElement('div');
        row.className = 'hic-annotation-panel-row';
        rowContainer.appendChild(row);

        const name = document.createElement('div');
        name.className = 'hic-annotation-panel-name';
        name.textContent = isTrack2D ? track.name : track.x.track.name;
        row.appendChild(name);

        if (isTrack2D) {
            const displayModeIcon = document.createElement('div');
            displayModeIcon.className = 'matrix-diagonal-widget-container';

            switch (track.displayMode) {
                case 'lower':
                    displayModeIcon.classList.add('matrix-diagonal-widget-lower');
                    break;
                case 'upper':
                    displayModeIcon.classList.add('matrix-diagonal-widget-upper');
                    break;
                default:
                    displayModeIcon.classList.add('matrix-diagonal-widget-all');
            }

            displayModeIcon.addEventListener('click', () => {
                this.displayModeHandler(displayModeIcon, track);
                this.browser.contactMatrixView.clearImageCaches();
                this.browser.contactMatrixView.update();
            });

            row.appendChild(displayModeIcon);
        }

        const colorpickerContainer = this.createAnnotationPanelColorpickerContainer(rowContainer, {width: (29 * 24 + 2)}, () => {
            const nextElement = row.nextElementSibling;
            if (nextElement && nextElement.classList.contains('hic-color-swatch-container')) {
                nextElement.style.display = nextElement.style.display === 'none' ? 'flex' : 'none';
            }
        });

        const colorpickerButton = this.createAnnotationColorSwatch(isTrack2D ? track.getColor() : track.x.track.color);
        row.appendChild(colorpickerButton);

        colorpickerButton.addEventListener('click', () => {
            const nextElement = row.nextElementSibling;
            if (nextElement && nextElement.classList.contains('hic-color-swatch-container')) {
                nextElement.style.display = nextElement.style.display === 'none' ? 'flex' : 'none';
            }
        });

        colorpickerContainer.style.display = 'none';
        rowContainer.appendChild(colorpickerContainer);

        return rowContainer;
    }

    displayModeHandler(displayModeIcon, track) {
        switch (track.displayMode) {
            case 'lower':
                track.displayMode = 'upper';
                displayModeIcon.classList.remove('matrix-diagonal-widget-lower');
                displayModeIcon.classList.add('matrix-diagonal-widget-upper');
                break;
            case 'upper':
                track.displayMode = 'all';
                displayModeIcon.classList.remove('matrix-diagonal-widget-upper');
                displayModeIcon.classList.add('matrix-diagonal-widget-all');
                break;
            default:
                track.displayMode = 'lower';
                displayModeIcon.classList.remove('matrix-diagonal-widget-all');
                displayModeIcon.classList.add('matrix-diagonal-widget-lower');
        }
    }

    createAnnotationPanelColorpickerContainer(container, style, clickHandler) {
        const colorpickerContainer = document.createElement('div');
        colorpickerContainer.className = 'hic-color-swatch-container';
        Object.assign(colorpickerContainer.style, style);
        colorpickerContainer.addEventListener('click', clickHandler);
        return colorpickerContainer;
    }

    createAnnotationColorSwatch(color) {
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'hic-color-swatch';
        colorSwatch.style.backgroundColor = color;
        return colorSwatch;
    }
}

export default AnnotationWidget;
