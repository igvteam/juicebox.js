(function(String) {

    var valueMatch,
        colorFromProbe,
        ieColorToHex;


    valueMatch = {
        'rgb(0,0,0)': {
            'black': ' ',
            'rgb(0,0,0)': ' '
        },
        'rgba(0,0,0,0)': {
            'transparent': ' ',
            'rgba(0,0,0,0)': ' '
        },
        '#ffffff': {
            'transparent': ' '
        },
        'transparent': {
            'transparent': ' '
        }
    };

    colorFromProbe = function(color) {

        color = color.toString();

        if (!color.match(/^#.+$|^[^0-9]+$/)) return color;

        var probe = ($('moo_color_probe') || new Element('textarea', {
            'id': 'moo_color_probe',
            'styles': {
                'display': 'none',
                'color': 'transparent'
            }
        }).inject(document.body, 'after'));
        try {
            probe.setStyle('color', color)
        } catch (e) {
            return color
        } //IE throws an error instead of defaulting the style to some color or transparent when the value is unrecognized
        var computed = (Browser.ie) ? ieColorToHex(probe) : (Browser.opera) ? probe.style.color : probe.getComputedStyle('color'),
            match = valueMatch[computed.replace(/ /g, '')];
        probe.setStyle('color', 'transparent');
        if ((!Browser.ie || Browser.ie9) && color == 'transparent' && (match && match['transparent'])) return 'rgba(0, 0, 0, 0)';
        return (computed == 'transparent' || match && !match[color.replace(/ /g, '')]) ? color : computed;
    };

    ieColorToHex = function(probe) { // Special IE mojo, thanks to Dean Edwards for the inspiration, his code used a pop-up window to test the color, I found you can simply use a textarea instead ;)
        var value = probe.set('value', '').createTextRange().queryCommandValue("ForeColor");
        value = (((value & 0x0000ff) << 16) | (value & 0x00ff00) | ((value & 0xff0000) >>> 16)).toString(16);
        return "#000000".slice(0, 7 - value.length) + value;
    };


    /*** MooTools String native extension ***/

    String.implement({
        colorToRgb: function() {
            var color = colorFromProbe(this);
            return (color.charAt(0) == '#') ? color.hexToRgb() : color;
        },
        colorToHex: function() {
            var color = colorFromProbe(this);
            return (color.test('rgb')) ? color.rgbToHex() : color;
        }
    });

})(String);

String.implement({
    colorToRgb: function() {
        var color = colorFromProbe(this);
        return (color.charAt(0) === '#') ? color.hexToRgb() : color;
    },
    colorToHex: function() {
        var color = colorFromProbe(this);
        return (color.test('rgb')) ? color.rgbToHex() : color;
    }
});

})(String);



var values = $('values').set('tween', {
        duration: 200
    }),
    color = $('color').set('tween', {
        duration: 300
    });

function convert() {
    var val = $('named').value,
        hex = val.colorToHex(),
        rgb = val.colorToRgb();

    values
        .set('tween', {
            duration: 200
        })
        .setStyle('opacity', 0);

    if (rgb !== val) {
        (hex === val) ? color.setStyle('background-color', hex): color.tween('background-color', hex);
        $('hex').set('html', '<strong>Hex Value</strong>: ' + hex);
        $('rgb').set('html', '<strong>RGB Value</strong>: ' + rgb);
    } else {
        color.tween('background-color', '#f8f8ff');
        $('hex').set('html', 'That is not a named color this browser supports');
        $('rgb').set('html', '');
    }
    values.fade('in');
}

$('go').addEvent('click', convert);
$('named').addEvent('keypress', function(e) {
    if (e.key === 'enter') convert()
});

