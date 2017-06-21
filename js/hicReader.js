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
 * @author Jim Robinson
 */


var hic = (function (hic) {

    var Short_MIN_VALUE = -32768;

    hic.HiCReader = function (config) {

        this.path = config.url;
        this.headPath = config.headURL || this.path;
        this.config = config;
        this.fragmentSitesCache = {};

    };

    hic.HiCReader.prototype.loadDataset = function () {

        var self = this,
            dataset = new hic.Dataset(this);

        return new Promise(function (fulfill, reject) {

            self.readHeader(dataset)
                .then(function () {
                    self.readFooter(dataset)
                        .then(function () {
                            fulfill(dataset);
                        })
                        .catch(reject)
                })
                .catch(reject)
        });
    }

    hic.HiCReader.prototype.readHeader = function (dataset) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: 0, size: 64000},                     // TODO -- a guess, what if not enough ?
                    withCredentials: self.config.withCredentials
                }).then(function (data) {

                if (!data) {
                    fulfill(null);
                    return;
                }

                var binaryParser = new igv.BinaryParser(new DataView(data));

                self.magic = binaryParser.getString();
                self.version = binaryParser.getInt();
                self.masterIndexPos = binaryParser.getLong();

                dataset.genomeId = binaryParser.getString();
                dataset.attributes = {};
                var nAttributes = binaryParser.getInt();
                while (nAttributes-- > 0) {
                    dataset.attributes[binaryParser.getString()] = binaryParser.getString();
                }

                dataset.chromosomes = [];
                var nChrs = binaryParser.getInt(), i = 0;
                while (nChrs-- > 0) {
                    dataset.chromosomes.push({index: i, name: binaryParser.getString(), size: binaryParser.getInt()});
                    i++;
                }
                self.chromosomes = dataset.chromosomes;  // Needed for certain reading functions

                dataset.bpResolutions = [];
                var nBpResolutions = binaryParser.getInt();
                while (nBpResolutions-- > 0) {
                    dataset.bpResolutions.push(binaryParser.getInt());
                }

                // We don't need frag level data yet, so don't load it
                // self.fragResolutions = [];
                // var nFragResolutions = binaryParser.getInt();
                // while (nFragResolutions-- > 0) {
                //     self.fragResolutions.push(binaryParser.getInt());
                // }
                //
                // if (nFragResolutions > 0) {
                //     self.sites = [];
                //     var nSites = binaryParser.getInt();
                //     while (nSites-- > 0) {
                //         self.sites.push(binaryParser.getInt());
                //     }
                // }


                fulfill(self);

            }).catch(function (error) {
                reject(error);
            });

        });
    };

    hic.HiCReader.prototype.readFooter = function (dataset) {

        var self = this,
            range = {start: this.masterIndexPos, size: 20000};

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: range,
                    withCredentials: self.config.withCredentials
                })
                .then(function (data) {

                    var key, pos, size;

                    if (!data) {
                        fulfill(null);
                        return;
                    }

                    var binaryParser = new igv.BinaryParser(new DataView(data));

                    var nBytes = binaryParser.getInt();


                    self.masterIndex = {};
                    var nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        key = binaryParser.getString();
                        pos = binaryParser.getLong();
                        size = binaryParser.getInt();
                        self.masterIndex[key] = {start: pos, size: size};
                    }

                    self.expectedValueVectorsPosition = self.masterIndexPos + binaryParser.position;

                    fulfill(self);

                })
                .catch(function (error) {
                    reject(error);
                });

        });
    };

    hic.HiCReader.prototype.readNormVectorIndex = function (dataset) {

        if (this.expectedValueVectorsPosition === undefined) {
            Promise.resolve();
        }

        if (this.normVectorIndex) {
            Promise.resolve(this.normVectorIndex);
        }

        var self = this,
            range = {start: this.expectedValueVectorsPosition, size: 60000000};     // Basically read to end of file

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: range,
                    withCredentials: self.config.withCredentials
                }).then(function (data) {

                var key, pos, size;

                if (!data) {
                    fulfill(null);
                    return;
                }

                var binaryParser = new igv.BinaryParser(new DataView(data));

                dataset.expectedValueVectors = {};
                nEntries = binaryParser.getInt();
                while (nEntries-- > 0) {
                    var type = "NONE";
                    var unit = binaryParser.getString();
                    var binSize = binaryParser.getInt();
                    var nValues = binaryParser.getInt();
                    var values = [];
                    while (nValues-- > 0) {
                        values.push(binaryParser.getDouble());
                    }
                    var nChrScaleFactors = binaryParser.getInt();
                    var normFactors = {};
                    while (nChrScaleFactors-- > 0) {
                        normFactors[binaryParser.getInt()] = binaryParser.getDouble();
                    }
                    var key = unit + "_" + binSize + "_" + type;
                    //  dataset.expectedValueVectors[key] =
                    //      new ExpectedValueFunction(type, unit, binSize, values, normFactors);
                }

                if (self.version >= 6) { //binaryParser.position = 11025066
                    dataset.normalizedExpectedValueVectors = {};
                    nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        var type = binaryParser.getString();
                        var unit = binaryParser.getString();
                        var binSize = binaryParser.getInt();
                        var nValues = binaryParser.getInt();
                        var values = [];
                        while (nValues-- > 0) {
                            values.push(binaryParser.getDouble());
                        }
                        var nChrScaleFactors = binaryParser.getInt();
                        var normFactors = {};
                        while (nChrScaleFactors-- > 0) {
                            normFactors[binaryParser.getInt()] = binaryParser.getDouble();
                        }
                        var key = unit + "_" + binSize + "_" + type;
                        //   dataset.normalizedExpectedValueVectors[key] =
                        //       new ExpectedValueFunction(type, unit, binSize, values, normFactors);
                    }

                    // Normalization vector index

                    if(undefined === self.normVectorIndex) self.normVectorIndex = {};
                    dataset.normalizationTypes = ['NONE'];
                    nEntries = binaryParser.getInt();
                    while (nEntries-- > 0) {
                        type = binaryParser.getString();
                        var chrIdx = binaryParser.getInt();
                        unit = binaryParser.getString();
                        binSize = binaryParser.getInt();
                        var filePosition = binaryParser.getLong();
                        var sizeInBytes = binaryParser.getInt();
                        key = hic.getNormalizationVectorKey(type, chrIdx, unit, binSize);

                        if (_.contains(dataset.normalizationTypes, type) === false) {
                            dataset.normalizationTypes.push(type);
                        }
                        self.normVectorIndex[key] = {filePosition: filePosition, size: sizeInBytes};
                    }
                }

                fulfill(self); //binaryParser.position = 42473140   masterIndexPos = 54343629146

            }).catch(function (error) {
                reject(error);
            });

        });
    };

    hic.HiCReader.prototype.readMatrix = function (key) {

        var self = this;
        var idx = self.masterIndex[key];
        if (idx == null) {
            Promise.resolve(undefined);
        }

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: idx.start, size: idx.size},
                    withCredentials: self.config.withCredentials
                })
                .then(function (data) {

                        if (!data) {
                            fulfill(null);
                            return;
                        }


                        var dis = new igv.BinaryParser(new DataView(data));

                        var c1 = dis.getInt();
                        var c2 = dis.getInt();

                        var chr1 = self.chromosomes[c1];
                        var chr2 = self.chromosomes[c2];

                        // # of resolution levels (bp and frags)
                        var nResolutions = dis.getInt();

                        var zdList = [];

                        var p1 = getSites.call(self, chr1.name);
                        var p2 = getSites.call(self, chr2.name);

                        Promise.all([p1, p2])
                            .then(function (results) {
                                var sites1 = results[0];
                                var sites2 = results[1];

                                while (nResolutions-- > 0) {
                                    var zd = parseMatixZoomData(chr1, chr2, sites1, sites2, dis);
                                    zdList.push(zd);
                                }

                                fulfill(new Matrix(c1, c2, zdList));

                            })
                            .catch(function (err) {
                                reject(err);
                            });
                    }
                ).catch(reject)
        });
    };

    hic.HiCReader.prototype.readBlock = function (blockNumber, zd) {

        var self = this,
            idx = null,
            i, j;

        var blockIndex = zd.blockIndexMap;
        if (blockIndex) {
            var idx = blockIndex[blockNumber];
        }
        if (!idx) {
            return Promise.resolve(null);
        }
        else {

            return new Promise(function (fulfill, reject) {

                igvxhr.loadArrayBuffer(self.path,
                    {
                        headers: self.config.headers,
                        range: {start: idx.filePosition, size: idx.size},
                        withCredentials: self.config.withCredentials
                    })
                    .then(function (data) {

                        if (!data) {
                            fulfill(null);
                            return;
                        }

                        var inflate = new Zlib.Inflate(new Uint8Array(data));
                        var plain = inflate.decompress();
                        data = plain.buffer;


                        var parser = new igv.BinaryParser(new DataView(data));
                        var nRecords = parser.getInt();
                        var records = [];

                        if (self.version < 7) {
                            for (i = 0; i < nRecords; i++) {
                                var binX = parser.getInt();
                                var binY = parser.getInt();
                                var counts = parser.getFloat();
                                records.push(new hic.ContactRecord(binX, binY, counts));
                            }
                        } else {

                            var binXOffset = parser.getInt();
                            var binYOffset = parser.getInt();

                            var useShort = parser.getByte() == 0;
                            var type = parser.getByte();

                            if (type === 1) {
                                // List-of-rows representation
                                var rowCount = parser.getShort();

                                for (i = 0; i < rowCount; i++) {

                                    binY = binYOffset + parser.getShort();
                                    var colCount = parser.getShort();

                                    for (j = 0; j < colCount; j++) {

                                        binX = binXOffset + parser.getShort();
                                        counts = useShort ? parser.getShort() : parser.getFloat();
                                        records.push(new hic.ContactRecord(binX, binY, counts));
                                    }
                                }
                            } else if (type == 2) {

                                var nPts = parser.getInt();
                                var w = parser.getShort();

                                for (i = 0; i < nPts; i++) {
                                    //int idx = (p.y - binOffset2) * w + (p.x - binOffset1);
                                    var row = Math.floor(i / w);
                                    var col = i - row * w;
                                    var bin1 = binXOffset + col;
                                    var bin2 = binYOffset + row;

                                    if (useShort) {
                                        counts = parser.getShort();
                                        if (counts != Short_MIN_VALUE) {
                                            records.push(new hic.ContactRecord(bin1, bin2, counts));
                                        }
                                    } else {
                                        counts = parser.getFloat();
                                        if (!isNaN(counts)) {
                                            records.push(new hic.hic.ContactRecord(bin1, bin2, counts));
                                        }
                                    }

                                }

                            } else {
                                reject("Unknown block type: " + type);
                            }

                        }

                        var block = new hic.Block(blockNumber, zd, records);

                        fulfill(block);
                    })
                    .catch(reject);
            });
        }
    };


    function getSites(chrName) {

        var self = this;

        return new Promise(function (fulfill, reject) {

            var sites = self.fragmentSitesCache[chrName];
            if (sites) {
                fulfill(sites);
            }
            else if (self.fragmentSitesIndex) {
                var entry = self.fragmentSitesIndex[chrName];
                if (entry !== undefined && entry.nSites > 0) {
                    readSites(entry.position, entry.nSites).then(function (sites) {
                        self.fragmentSitesCache[chrName] = sites;
                        fulfill(sites);

                    }).catch(reject);
                }
            }
            else {
                fulfill(undefined);
            }
        });
    }

    function parseMatixZoomData(chr1, chr2, chr1Sites, chr2Sites, dis) {

        var unit = dis.getString();
        dis.getInt();                // Old "zoom" index -- not used

        // Stats.  Not used yet, but we need to read them anyway
        var sumCounts = dis.getFloat();
        var occupiedCellCount = dis.getFloat();
        var stdDev = dis.getFloat();
        var percent95 = dis.getFloat();

        var binSize = dis.getInt();
        var zoom = {unit: unit, binSize: binSize};

        var blockBinCount = dis.getInt();
        var blockColumnCount = dis.getInt();

        var zd = new MatrixZoomData(chr1, chr2, zoom, blockBinCount, blockColumnCount, chr1Sites, chr2Sites);

        var nBlocks = dis.getInt();
        var blockIndex = {};

        while (nBlocks-- > 0) {
            var blockNumber = dis.getInt();
            var filePosition = dis.getLong();
            var blockSizeInBytes = dis.getInt();
            blockIndex[blockNumber] = {filePosition: filePosition, size: blockSizeInBytes};
        }
        zd.blockIndexMap = blockIndex;

        var nBins1 = (chr1.size / binSize);
        var nBins2 = (chr2.size / binSize);
        var avgCount = (sumCounts / nBins1) / nBins2;   // <= trying to avoid overflows
        zd.averageCount = avgCount;
        zd.sumCounts = sumCounts;
        zd.stdDev = stdDev;
        zd.occupiedCellCount = occupiedCellCount;
        zd.percent95 = percent95;

        return zd;
    }

    hic.HiCReader.prototype.readNormalizationVector = function (type, chrIdx, unit, binSize) {

        var self = this,
            key = hic.getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);


        if (this.normVectorIndex == null) {
            return Promise.resolve(undefined);
        }

        var idx = this.normVectorIndex[key];
        if (!idx) {
            alert("Normalization option " + type + " not available at this resolution");
            return Promise.resolve(undefined);
        }

        return new Promise(function (fulfill, reject) {

            igvxhr.loadArrayBuffer(self.path,
                {
                    headers: self.config.headers,
                    range: {start: idx.filePosition, size: idx.size},
                    withCredentials: self.config.withCredentials
                })
                .then(function (data) {

                    if (!data) {
                        fulfill(null);
                        return;
                    }

                    // var inflate = new Zlib.Inflate(new Uint8Array(data));
                    // var plain = inflate.decompress();
                    // data = plain.buffer;

                    var parser = new igv.BinaryParser(new DataView(data));
                    var nValues = parser.getInt();
                    var values = [];
                    var allNaN = true;
                    for (var i = 0; i < nValues; i++) {
                        values[i] = parser.getDouble();
                        if (!isNaN(values[i])) {
                            allNaN = false;
                        }
                    }
                    if (allNaN) fulfill(null);
                    fulfill(new hic.NormalizationVector(type, chrIdx, unit, binSize, values));


                })
                .catch(reject);
        })
    }


    function ExpectedValueFunction(normType, unit, binSize, values, normFactors) {
        this.normType = normType;
        this.unit = unit;
        this.binSize = binSize;
        this.values = values;
        this.normFactors = normFactors;
    }

    function MatrixZoomData(chr1, chr2, zoom, blockBinCount, blockColumnCount, chr1Sites, chr2Sites) {
        this.chr1 = chr1;
        this.chr2 = chr2;
        this.zoom = zoom;
        this.blockBinCount = blockBinCount;
        this.blockColumnCount = blockColumnCount;
        this.chr1Sites = chr1Sites;
        this.chr2Sites = chr2Sites;
    }

    MatrixZoomData.prototype.getKey = function () {
        return this.chr1.name + "_" + this.chr2.name + "_" + this.zoom.unit + "_" + this.zoom.binSize;
    };

    function Matrix(chr1, chr2, zoomDataList) {

        var self = this;

        this.chr1 = chr1;
        this.chr2 = chr2;
        this.bpZoomData = [];
        this.fragZoomData = [];

        _.each(zoomDataList, function (zd) {
            if (zd.zoom.unit === "BP") {
                self.bpZoomData.push(zd);
            } else {
                self.fragZoomData.push(zd);
            }
        });
    }

    Matrix.prototype.getZoomData = function (zoom) {

        var zdArray = zoom.unit === "BP" ? this.bpZoomData : this.fragZoomData,
            i;

        for (i = 0; i < zdArray.length; i++) {
            var zd = zdArray[i];
            if (zoom.binSize === zd.zoom.binSize) {
                return zd;
            }
        }

        return undefined;
    };


    return hic;

})
(hic || {});
