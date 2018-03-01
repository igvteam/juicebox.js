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
 * Created by dat on 3/8/17.
 */
var hic = (function (hic) {

    hic.colorSwatch = function (rgbString, doPlusOrMinusOrUndefined) {
        var $swatch,
            $span,
            $fa_square,
            $fa_plus_minus,
            $fa,
            str;

        $swatch = $('<div>', {class: 'igv-color-swatch'});

        $fa = $('<i>', {class: 'fa fa-square fa-2x', 'aria-hidden': 'true'});
        $swatch.append($fa);
        $fa.css({ color: rgbString });

        // if (undefined === doPlusOrMinusOrUndefined) {
        //     $fa = $('<i>', { class: 'fa fa-square fa-lg' });
        //     $swatch.append($fa);
        //     $fa.css({color: rgbString});
        //
        // } else {
        //
        //     $span = $('<span>', { class: 'fa-stack' });
        //     $swatch.append($span);
        //
        //     // background square
        //     $fa_square = $('<i>', { class: 'fa fa-square fa-stack-2x' });
        //     $span.append($fa_square);
        //     $fa_square.css({ color: rgbString, '-webkit-text-stroke-width':'2px', '-webkit-text-stroke-color':'transparent' });
        //
        //     // foreground +/-
        //     // str = '+' === doPlusOrMinusOrUndefined ? 'fa fa-plus fa-stack-1x' : 'fa fa-minus fa-stack-1x';
        //     str = '';
        //     $fa_plus_minus = $('<i>', { class: str });
        //     $span.append($fa_plus_minus);
        //     $fa_plus_minus.css({ color: 'white' });
        //
        // }


        return $swatch;
    };

    hic.setApiKey = function (key) {

        hic.apiKey = key;
        igv.setApiKey(key);

    };

    hic.extractFilename = function (urlOrFile) {
        var idx,
            str;

        if (igv.isFilePath(urlOrFile)) {
            return urlOrFile.name;
        }
        else {

            str = urlOrFile.split('?').shift();
            idx = urlOrFile.lastIndexOf("/");

            return idx > 0 ? str.substring(idx + 1) : str;
        }
    };

    hic.igvSupports = function (path) {
        var config = {url: path};
        igv.inferTrackTypes(config);
        return config.type !== undefined;
    };

    hic.throttle = function (fn, threshhold, scope) {
        var last,
            deferTimer;

        threshhold || (threshhold = 200);

        return function () {
            var context,
                now,
                args;

            context = scope || this;
            now = +new Date;
            args = arguments;

            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        }
    };

    hic.reflectionRotationWithContext = function (context) {
        context.scale(-1, 1);
        context.rotate(Math.PI / 2.0);
    };

    hic.reflectionAboutYAxisAtOffsetWithContext = function (context, exe) {
        context.translate(exe, 0);
        context.scale(-1, 1);
        context.translate(-exe, 0);
    };

    hic.identityTransformWithContext = function (context) {
        // 3x2 matrix. column major. (sx 0 0 sy tx ty).
        context.setTransform(1, 0, 0, 1, 0, 0);
    };

    hic.Math = {

        mean: function (array) {

            var t = 0, n = 0,
                i;
            for (i = 0; i < array.length; i++) {
                if (!isNaN(array[i])) {
                    t += array[i];
                    n++;
                }
            }
            return n > 0 ? t / n : 0;
        },

        percentile: function (array, p) {

            if (array.length === 0) return undefined;

            var k = Math.floor(array.length * ((100 - p) / 100));
            if (k == 0) {
                array.sort(function (a, b) {
                    return b - a
                });
                return array[0];
            }

            return this.selectElement(array, k);

        },

        selectElement: function (array, k) {

            // Credit Steve Hanov http://stevehanov.ca/blog/index.php?id=122
            var heap = new BinaryHeap(),
                i;

            for (i = 0; i < array.length; i++) {

                var item = array[i];

                // If we have not yet found k items, or the current item is larger than
                // the smallest item on the heap, add current item
                if (heap.content.length < k || item > heap.content[0]) {
                    // If the heap is full, remove the smallest element on the heap.
                    if (heap.content.length === k) {
                        var r = heap.pop();
                    }
                    heap.push(item)
                }
            }

            return heap.content[0];
        }
    };

    hic.extractQuery = function (uri) {
        var i1, i2, i, j, s, query, tokens;

        query = {};
        i1 = uri.indexOf("?");
        i2 = uri.lastIndexOf("#");

        if (i1 >= 0) {
            if (i2 < 0) i2 = uri.length;

            for (i = i1 + 1; i < i2;) {

                j = uri.indexOf("&", i);
                if (j < 0) j = i2;

                s = uri.substring(i, j);
                tokens = s.split("=", 2);
                if (tokens.length === 2) {
                    query[tokens[0]] = tokens[1];
                }

                i = j + 1;
            }
        }
        return query;
    }


    function BinaryHeap() {
        this.content = [];
    }

    BinaryHeap.prototype = {
        push: function (element) {
            // Add the new element to the end of the array.
            this.content.push(element);
            // Allow it to bubble up.
            this.bubbleUp(this.content.length - 1);
        },

        pop: function () {
            // Store the first element so we can return it later.
            var result = this.content[0];
            // Get the element at the end of the array.
            var end = this.content.pop();
            // If there are any elements left, put the end element at the
            // start, and let it sink down.
            if (this.content.length > 0) {
                this.content[0] = end;
                this.sinkDown(0);
            }
            return result;
        },

        remove: function (node) {
            var length = this.content.length;
            // To remove a value, we must search through the array to find
            // it.
            for (var i = 0; i < length; i++) {
                if (this.content[i] != node) continue;
                // When it is found, the process seen in 'pop' is repeated
                // to fill up the hole.
                var end = this.content.pop();
                // If the element we popped was the one we needed to remove,
                // we're done.
                if (i == length - 1) break;
                // Otherwise, we replace the removed element with the popped
                // one, and allow it to float up or sink down as appropriate.
                this.content[i] = end;
                this.bubbleUp(i);
                this.sinkDown(i);
                break;
            }
        },

        size: function () {
            return this.content.length;
        },

        bubbleUp: function (n) {
            // Fetch the element that has to be moved.
            var element = this.content[n], score = element;
            // When at 0, an element can not go up any further.
            while (n > 0) {
                // Compute the parent element's index, and fetch it.
                var parentN = Math.floor((n + 1) / 2) - 1,
                    parent = this.content[parentN];
                // If the parent has a lesser score, things are in order and we
                // are done.
                if (score >= parent)
                    break;

                // Otherwise, swap the parent with the current element and
                // continue.
                this.content[parentN] = element;
                this.content[n] = parent;
                n = parentN;
            }
        },

        sinkDown: function (n) {
            // Look up the target element and its score.
            var length = this.content.length,
                element = this.content[n],
                elemScore = element;

            while (true) {
                // Compute the indices of the child elements.
                var child2N = (n + 1) * 2, child1N = child2N - 1;
                // This is used to store the new position of the element,
                // if any.
                var swap = null;
                // If the first child exists (is inside the array)...
                if (child1N < length) {
                    // Look it up and compute its score.
                    var child1 = this.content[child1N],
                        child1Score = child1;
                    // If the score is less than our element's, we need to swap.
                    if (child1Score < elemScore)
                        swap = child1N;
                }
                // Do the same checks for the other child.
                if (child2N < length) {
                    var child2 = this.content[child2N],
                        child2Score = child2;
                    if (child2Score < (swap == null ? elemScore : child1Score))
                        swap = child2N;
                }

                // No need to swap further, we are done.
                if (swap == null) break;

                // Otherwise, swap and continue.
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }
        }
    };

    hic.isMobile = function () {
        return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }

    hic.presentError = function(prefix, error) {

        var msg = error.message;
        if(httpMessages.hasOwnProperty(msg)) {
            msg = httpMessages[msg];
        }
        igv.presentAlert(prefix + ": " + msg);

    }

    var httpMessages = {
        "401": "Access unauthorized",
        "403": "Access forbidden",
        "404": "Not found"
    }

    return hic;

})(hic || {});
