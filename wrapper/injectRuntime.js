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

const fs = require('fs');

const igvPath = require.resolve('../tmp/juicebox.js')
let ping = fs.readFileSync(igvPath, 'utf-8');
const lines = ping.split(/\r?\n/);

const templatePath = require.resolve('./regeneratorRuntime.js')
let foo = fs.readFileSync(templatePath, 'utf-8');

const out ='./dist/juicebox.js';
let regenWritten = false;
var fd = fs.openSync(out, 'w');

for (let line of lines) {
    fs.writeSync(fd, line + '\n', null, 'utf-8')
    if(line.trim().length === 0 && !regenWritten) {
        fs.writeSync(fd, foo, null, 'utf-8');
        regenWritten = true;
    }
}

fs.closeSync(fd);
fs.unlinkSync(igvPath)
