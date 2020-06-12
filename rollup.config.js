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

//import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import strip from 'rollup-plugin-strip';
import copy from 'rollup-plugin-copy'
import {terser} from "rollup-plugin-terser"

export default [
    {
        //input: 'test/testBabel.js',
        input: 'js/index.js',
        output: [
            {file: 'dist/js/juicebox.esm.js', format: 'es'},
            {file: 'dist/js/juicebox.esm.min.js', format: 'es', sourcemap: true},
        ],
        plugins: [
            strip({
                debugger: true,
                // functions: ['console.log', 'assert.*', 'debug']
                functions: ['assert.*', 'debug']
            }),
            terser({
                include: [/^.+\.min\.js$/],
                sourcemap: {
                    filename: "juicebox.esm.min.js",
                    url: "juicebox.esm.min.js.map"
            }})
        ]
    },
    {
        input: 'js/index.js',
        output: [
            {file: 'dist/js/juicebox.js', format: 'umd', name: "hic"},
            {file: 'dist/js/juicebox.min.js', format: 'umd', name: "hic", sourcemap: true}
        ],
        plugins: [
            strip({
                debugger: true,
                functions: ['console.log', 'assert.*', 'debug']
            }),
            commonjs(),
            resolve(),
            babel(),
            terser({
                include: [/^.+\.min\.js$/],
                sourcemap: {
                    filename: "juicebox.min.js",
                    url: "juicebox.min.js.map"
                }}),
            copy({
                targets:
                    [
                        {src: 'css/juicebox.css', dest: 'dist/css/'},
                        {src: 'css/img', dest: 'dist/css/'},
                        {src: 'embed/embed.html', dest: 'dist/'}
                    ]
            })
        ]
    }
]

