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

import { Alert, createColorSwatchSelector } from '../node_modules/igv-ui/dist/igv-ui.js';
import { makeDraggable } from '../node_modules/igv-ui/dist/igv-ui.js';
import HICEvent from './hicEvent.js';
import Track2D from './track2D.js';

class AnnotationWidget {

    constructor(browser, container, { title, alertMessage }, trackListRetrievalCallback) {
        this.browser = browser;
        this.trackListRetrievalCallback = trackListRetrievalCallback;

        this.createAnnotationPresentationButton(container, alertMessage);
        this.createAnnotationPanel(this.browser.rootElement, title);
    }

    createAnnotationPresentationButton(parent, alertMessage) {
        const button = parent.querySelector("button");
        button.addEventListener('click', () => {
            const list = this.trackListRetrievalCallback();
            if (list.length > 0) {
                this.updateBody(list);
                this.annotationPanel.style.display = this.annotationPanel.style.display === 'none' ? 'block' : 'none';
            } else {
                Alert.presentAlert(alertMessage);
            }
            this.browser.hideMenu();
        });
    }

    createAnnotationPanel(parent, title) {
        this.annotationPanel = document.createElement('div');
        this.annotationPanel.className = 'hic-annotation-panel-container';
        parent.appendChild(this.annotationPanel);

        const panelHeader = document.createElement('div');
        panelHeader.className = 'hic-annotation-panel-header';
        this.annotationPanel.appendChild(panelHeader);

        const titleDiv = document.createElement('div');
        titleDiv.textContent = title;
        panelHeader.appendChild(titleDiv);

        const closeButton = document.createElement('div');
        closeButton.className = 'hic-menu-close-button';
        panelHeader.appendChild(closeButton);

        const closeIcon = document.createElement('i');
        closeIcon.className = 'fa fa-times';
        closeButton.appendChild(closeIcon);

        closeButton.addEventListener('click', () => {
            this.annotationPanel.style.display = 'none';
        });

        makeDraggable(this.annotationPanel, panelHeader);
        this.annotationPanel.style.display = 'none';
    }

    updateBody(tracks) {
        this.annotationPanel.querySelectorAll('.hic-annotation-row-container').forEach(el => el.remove());
        const isTrack2D = tracks[0] instanceof Track2D;
        const trackList = isTrack2D ? tracks.slice().reverse() : tracks;
        trackList.forEach(track => this.createAnnotationPanelRow(this.annotationPanel, track));
    }

    createAnnotationPanelRow(container, track) {
        const rowContainer = document.createElement('div');
        rowContainer.className = 'hic-annotation-row-container';
        container.appendChild(rowContainer);

        const row = document.createElement('div');
        row.className = 'hic-annotation-modal-row';
        rowContainer.appendChild(row);

        const trackName = document.createElement('div');
        trackName.textContent = track instanceof Track2D ? track.config.name : track.x.track.config.name;
        row.appendChild(trackName);

        const toggleVisibilityIcon = document.createElement('i');
        toggleVisibilityIcon.className = track.isVisible ? 'fa fa-eye fa-lg' : 'fa fa-eye-slash fa-lg';
        row.appendChild(toggleVisibilityIcon);

        toggleVisibilityIcon.addEventListener('click', () => {
            track.isVisible = !track.isVisible;
            toggleVisibilityIcon.className = track.isVisible ? 'fa fa-eye fa-lg' : 'fa fa-eye-slash fa-lg';
            this.browser.contactMatrixView.clearImageCaches();
            this.browser.contactMatrixView.update();
        });
    }

    updateTrackDisplaymode() {}
}

export default AnnotationWidget;
