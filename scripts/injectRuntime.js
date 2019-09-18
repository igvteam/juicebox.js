#!/usr/bin/env node

/*
 * @author Jim Robinson Sep-2019
 */

const fs = require('fs');


let input = require.resolve('../tmp/juicebox.js');
let out = './dist/juicebox.js';
inject(input, out);

input = require.resolve('../tmp/site-bundle.js');
out = './website/dist/js/site-bundle.js';
inject(input, out);

function inject(input, out) {

    let ping = fs.readFileSync(input, 'utf-8');
    const lines = ping.split(/\r?\n/);

    const templatePath = require.resolve('./regeneratorRuntime.js')
    let foo = fs.readFileSync(templatePath, 'utf-8');

    let regenWritten = false;
    var fd = fs.openSync(out, 'w');

    for (let line of lines) {
        fs.writeSync(fd, line + '\n', null, 'utf-8')
        if (line.trim().length === 0 && !regenWritten) {
            fs.writeSync(fd, foo, null, 'utf-8');
            regenWritten = true;
        }
    }
    fs.closeSync(fd);
    fs.unlinkSync(input)
}
