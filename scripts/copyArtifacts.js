#!/usr/bin/env node

/*
 * Copies build artifacts from the juicebox distribution ("dist") to the website distribution (website.dist).
 *
 * @author Jim Robinson Sep-2019
 */


const fs = require('fs-extra');

fs.copySync(__dirname + '/../dist/juicebox.min.js', __dirname + '/../website/dist/js/juicebox.min.js');
fs.copySync(__dirname + '/../dist/juicebox.min.js.map', __dirname + '/../website/dist/js/juicebox.min.js.map');

fs.copySync(__dirname + '/../css/juicebox.css', __dirname + '/../dist/css/juicebox.css');
fs.copySync(__dirname + '/../css/juicebox.css', __dirname + '/../website/dist/css/juicebox.css');

fs.copySync(__dirname + '/../css/img', __dirname + '/../dist/css/img');
fs.copySync(__dirname + '/../css/img', __dirname + '/../website/dist/css/img');

fs.copySync(__dirname + '/../website/css/site.css', __dirname + '/../website/dist/css/site.css');

fs.copySync(__dirname + '/../website/res', __dirname + '/../website/dist/res');
