/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import $ from "../vendor/jquery-3.3.1.slim.js";
import {makeDraggable, UIUtils} from '../node_modules/igv-ui/dist/igv-ui.js'

class TrackGearPopup {

    constructor(parentElement) {
        // Popover container
        this.popoverElement = document.createElement('div');
        this.popoverElement.className = 'jb-igv-menu-popup';
        parentElement.appendChild(this.popoverElement);

        // Popover header
        const popoverHeaderElement = document.createElement('div');
        popoverHeaderElement.className = 'jb-igv-menu-popup-header';
        this.popoverElement.appendChild(popoverHeaderElement);

        // Attach close handler
        UIUtils.attachDialogCloseHandlerWithParent(popoverHeaderElement, () => {
            this.popoverElement.style.display = 'none';
        });

        // Popover content
        this.popoverContentElement = document.createElement('div');
        this.popoverElement.appendChild(this.popoverContentElement);

        // Make draggable
        makeDraggable(this.popoverElement, popoverHeaderElement);

        // Prevent click propagation
        popoverHeaderElement.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
    }

    presentMenuList(dx, dy, list) {
        hideAllMenuPopups();

        if (list.length > 0) {
            // Clear popover content
            this.popoverContentElement.innerHTML = '';

            const updatedList = trackMenuItemListHelper(list, this.popoverElement);

            for (const item of updatedList) {
                if (item.init) {
                    item.init();
                }

                const element = item.object.get(0); // Assuming `object` is a DOM element

                // Remove the border-top class from the first item
                if (updatedList.indexOf(item) === 0) {
                    element.classList.remove('igv-track-menu-border-top');
                }

                // Add 'jb-igv-menu-popup-shim' if applicable
                if (
                    !element.classList.contains('igv-track-menu-border-top') &&
                    !element.classList.contains('jb-igv-menu-popup-check-container') &&
                    element.tagName === 'DIV'
                ) {
                    element.classList.add('jb-igv-menu-popup-shim');
                }

                // Append element to the popover content
                this.popoverContentElement.appendChild(element);
            }

            // Position and display the popover
            this.popoverElement.style.left = `${dx}px`;
            this.popoverElement.style.top = `${dy}px`;
            this.popoverElement.style.display = 'block';
        }
    }

    dispose() {
        this.popoverElement.innerHTML = '';
        this.popoverContentElement.innerHTML = '';

        for (let key of Object.keys(this)) {
            this[key] = undefined;
        }
    }
}

function trackMenuItemListHelper(itemList, popoverElement){

    const $popover = $(popoverElement)

    var list = [];

    if (itemList.length > 0) {

        list = itemList.map(function (item, i) {
            let $e;

            // name and object fields checked for backward compatibility
            if (item.name) {
                $e = $('<div>');
                $e.text(item.name);
            } else if (item.object) {
                $e = $(item.object)     // This creates a JQuery object form a dom element, or clones if already a jQuery object
            } else if (typeof item.label === 'string') {
                $e = $('<div>');
                $e.html(item.label)
            } else if (typeof item === 'string') {

                if (item.startsWith("<")) {
                    $e = $(item);
                } else {
                    $e = $("<div>" + item + "</div>");
                }
            }

            if (0 === i) {
                $e.addClass('igv-track-menu-border-top');
            }

            if (item.click) {
                $e.on('click', e => {
                    e.preventDefault();
                    e.stopPropagation()
                    item.click(e);
                    $popover.hide();

                });

                $e.on('touchend', e => {
                    e.preventDefault();
                    e.stopPropagation()
                    item.click(e);
                    $popover.hide();
                });

                $e.on('mouseup', e => {
                    e.preventDefault();
                    e.stopPropagation();
                })

            }

            return { object: $e, init: (item.init || undefined)};
        });
    }
    return list;
}

function hideAllMenuPopups() {
    $('.jb-igv-menu-popup').hide()
}

export default TrackGearPopup

