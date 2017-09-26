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


var hic = (function (hic) {

    hic.createColorSwatchSelector = function ($color_swatch_container, callback, closeCallback) {

        var $div,
            $fa,
            $close_container,
            cssColorNames, h, s, v, rgb;

        cssColorNames =
            [
                // "Red", "Blue", "Green", "AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige",
                // "Bisque", "Black", "BlanchedAlmond", "BlueViolet", "Brown", "BurlyWood", "CadetBlue", "Chartreuse", "Chocolate",
                // "Coral", "CornflowerBlue", "Cornsilk", "Crimson", "Cyan", "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray",
                // "DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "Darkorange", "DarkOrchid", "DarkRed",
                // "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet",
                // "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue", "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia",
                // "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "GreenYellow", "HoneyDew", "HotPink",
                // "IndianRed", "Indigo", "Ivory", "Khaki", "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue",
                // "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen", "LightPink",
                // "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue",
                // "LightYellow", "Lime", "LimeGreen", "Linen", "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue",
                // "MediumOrchid", "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise",
                // "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose", "Moccasin", "NavajoWhite", "Navy", "OldLace",
                // "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid", "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed",
                // "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple", "RosyBrown", "RoyalBlue",
                // "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue",
                // "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue", "Tan", "Teal", "Thistle", "Tomato", "Turquoise",
                // "Violet", "Wheat", "White", "WhiteSmoke", "Yellow", "YellowGreen"
            ];

        s = 1;
        v = 1;
        for(v = 1; v>= 0.5; v -= .1) {
            for (h = 0; h < 1; h += 1/28) {
                rgb = "rgb(" + hsvToRgb(h, s, v).join(",") + ")"
                cssColorNames.push(rgb);
            }
        }

        // $color_swatch_container.hide();

        // close button container
        $close_container = $('<div>');
        $color_swatch_container.append($close_container);

        // close button
        $div = $('<div>', {class: 'hic-menu-close-button'});
        $close_container.append($div);

        $fa = $("<i>", {class: 'fa fa-times'});
        $div.append($fa);

        $fa.on('click', function (e) {
            closeCallback();
        });

        cssColorNames.forEach(function (c) {
            var $swatch;

            $swatch = hic.colorSwatch(c);
            $color_swatch_container.append($swatch);

            $swatch.click(function () {
                callback(c);
            });

        });

    };

    hic.colorSwatch = function (color) {
        var $swatch,
            $fa;

        $swatch = $('<div>', {class: 'hic-color-swatch'});

        // $fa = $('<i>', { class: 'fa fa-circle fa-lg', 'aria-hidden': 'true' });
        // $fa = $('<i>', { class: 'fa fa-square fa-2x', 'aria-hidden': 'true' });
        $fa = $('<i>', {class: 'fa fa-square fa-lg', 'aria-hidden': 'true'});
        $swatch.append($fa);

        $fa.css({color: color});

        return $swatch;
    };

    function rgbToHex(rgb) {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? "#" +
        ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    };

    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return "rgb(" +
            parseInt(result[1], 16) + ", " +
            parseInt(result[2], 16) + ", " +
            parseInt(result[3], 16) + ")";
    };

    /**
     * Converts an HSV color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
     * Assumes h, s, and v are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * Credit: https://gist.githubusercontent.com/mjackson/5311256
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  v       The value
     * @return  Array           The RGB representation
     */
    function hsvToRgb(h, s, v) {
        var r, g, b;

        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }

        return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
    }

    /**
     * Converts an HSL color value to RGB. Conversion formula
     * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * Assumes h, s, and l are contained in the set [0, 1] and
     * returns r, g, and b in the set [0, 255].
     *
     * Credit: https://gist.githubusercontent.com/mjackson/5311256
     *
     * @param   Number  h       The hue
     * @param   Number  s       The saturation
     * @param   Number  l       The lightness
     * @return  Array           The RGB representation
     */
    function hslToRgb(h, s, l) {
        var r, g, b;

        if (s == 0) {
            r = g = b = l; // achromatic
        } else {
            function hue2rgb(p, q, t) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [r * 255, g * 255, b * 255];
    }


    return hic;

})(hic || {});
