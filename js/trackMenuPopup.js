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

class MenuPopup {
    constructor($parent) {
        // Popover container
        this.$popover = $('<div>', { class: 'jb-igv-menu-popup' });
        $parent.append(this.$popover);
        this.popoverElement = this.$popover.get(0);

        // Popover header
        const $popoverHeader = $('<div>', { class: 'jb-igv-menu-popup-header' });
        this.$popover.append($popoverHeader);

        UIUtils.attachDialogCloseHandlerWithParent($popoverHeader.get(0), () => this.$popover.hide());

        this.$popoverContent = $('<div>');
        this.$popover.append(this.$popoverContent);

        makeDraggable(this.$popover.get(0), $popoverHeader.get(0));

        $popoverHeader.on('click.menu-popup-dismiss', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // absorb click to prevent it leaking through to parent DOM element
        });
    }

    presentMenuList(dx, dy, list) {
        hideAllMenuPopups();

        if (list.length > 0) {
            this.$popoverContent.empty();

            const updatedList = trackMenuItemListHelper(list, this.$popover);

            updatedList.forEach((item, index) => {
                if (item.init) {
                    item.init();
                }

                const $e = item.object;
                if (index === 0) {
                    $e.removeClass('igv-track-menu-border-top');
                }

                if (
                    !$e.hasClass('igv-track-menu-border-top') &&
                    !$e.hasClass('jb-igv-menu-popup-check-container') &&
                    $e.is('div')
                ) {
                    $e.addClass('jb-igv-menu-popup-shim');
                }

                this.$popoverContent.append($e);
            });

            this.$popover.css({ left: `${dx}px`, top: `${dy}px` });
            this.$popover.show();
        }
    }

    dispose() {
        this.$popover.empty();
        this.$popoverContent.empty();

        Object.keys(this).forEach(key => {
            this[key] = undefined;
        });
    }
}

function trackMenuItemListHelper(itemList, $popover){

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
                $e.on('click', handleClick);
                $e.on('touchend', function (e) {
                    handleClick(e);
                });
                $e.on('mouseup', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                })

                // eslint-disable-next-line no-inner-declarations
                function handleClick(e) {
                    item.click(e);
                    $popover.hide();
                    e.preventDefault();
                    e.stopPropagation()
                }
            }

            return {object: $e, init: (item.init || undefined)};
        });
    }
    return list;
}

function hideAllMenuPopups() {
    $('.jb-igv-menu-popup').hide()
}

export default MenuPopup

