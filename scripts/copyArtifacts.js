#!/usr/bin/env node

/*
 * Copies build artifacts from the juicebox distribution ("dist") to the website distribution (website.dist).
 *
 * @author Jim Robinson Sep-2019
 */


const fs = require('fs-extra');

fs.copySync(__dirname + '/../css/juicebox.css', __dirname + '/../dist/css/juicebox.css');
fs.copySync(__dirname + '/../css/juicebox.css', __dirname + '/../website/dist/css/juicebox.css');
fs.copySync(__dirname + '/../css/img', __dirname + '/../dist/css/img');
fs.copySync(__dirname + '/../css/img', __dirname + '/../website/dist/css/img');
fs.copySync(__dirname + '/../website/dev/css/site.css', __dirname + '/../website/dist/css/site.css');
fs.copySync(__dirname + '/../website/dev/res', __dirname + '/../website/dist/res');
