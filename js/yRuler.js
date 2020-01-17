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

import $ from '../vendor/jquery-3.3.1.slim.js'
import Ruler from "./ruler.js";

class YRuler extends Ruler {

    constructor(browser, $parent) {

        super(browser, 'y');

        this.browser = browser;
        this.axis = 'y';

        let id = browser.id + '_' + this.axis + '-axis';
        this.$axis = $("<div>", {id: id});
        $parent.append(this.$axis);

        this.$canvas = $('<canvas>');
        this.$axis.append(this.$canvas);

        this.ctx = this.$canvas.get(0).getContext("2d");
        this.ctx.canvas.width = this.$axis.width();
        this.ctx.canvas.height = this.$axis.height();

        id = browser.id + '_' + this.axis + '-axis-whole-genome-container';
        this.$wholeGenomeContainer = $("<div>", {id: id});
        this.$axis.append(this.$wholeGenomeContainer);

    }

}

export default YRuler;
