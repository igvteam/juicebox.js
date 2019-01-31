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
        this.loadFragData = config.loadFragData;

    };

    hic.HiCReader.prototype.loadDataset = function (config) {

        var self = this,
            dataset = new hic.Dataset(this);

        dataset.name = config.name;

        return readHeader(dataset)

            .then(function (ignore) {
                return readFooter(dataset)
            })
            .then(function (ignore) {
                return dataset;
            })


        function readHeader (dataset) {

            return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: {start: 0, size: 64000}}))

                .then(function (data) {

                    var chr, binaryParser, nBpResolutions, nFragResolutions, nSites, nChrs, nAttributes, tmp;

                    if (!data) {
                        return undefined;
                    }

                    binaryParser = new igv.BinaryParser(new DataView(data));

                    self.magic = binaryParser.getString();
                    self.version = binaryParser.getInt();
                    self.masterIndexPos = binaryParser.getLong();

                    dataset.genomeId = binaryParser.getString();


                    dataset.attributes = {};
                    nAttributes = binaryParser.getInt();
                    while (nAttributes-- > 0) {
                        dataset.attributes[binaryParser.getString()] = binaryParser.getString();
                    }

                    dataset.chromosomes = [];
                    nChrs = binaryParser.getInt(), i = 0;
                    while (nChrs-- > 0) {
                        chr = {
                            index: i,
                            name: binaryParser.getString(),
                            size: binaryParser.getInt()
                        };
                        if (chr.name.toLowerCase() === "all") {
                            self.wholeGenomeChromosome = chr;
                            dataset.wholeGenomeResolution = Math.round(chr.size * (1000 / 500));    // Hardcoded in juicer
                        }
                        dataset.chromosomes.push(chr);
                        i++;
                    }

                    self.chromosomes = dataset.chromosomes;  // Needed for certain reading functions

                    dataset.bpResolutions = [];

                    nBpResolutions = binaryParser.getInt();
                    while (nBpResolutions-- > 0) {
                        dataset.bpResolutions.push(binaryParser.getInt());
                    }

                    if (this.loadFragData) {
                        dataset.fragResolutions = [];
                        nFragResolutions = binaryParser.getInt();
                        while (nFragResolutions-- > 0) {
                            dataset.fragResolutions.push(binaryParser.getInt());
                        }

                        if (nFragResolutions > 0) {
                            dataset.sites = [];
                            nSites = binaryParser.getInt();
                            while (nSites-- > 0) {
                                dataset.sites.push(binaryParser.getInt());
                            }
                        }
                    }

                    // Attempt to determine genomeId if not recognized
                    if (!Object.keys(knownGenomes).includes(dataset.genomeId)) {
                        tmp = matchGenome(dataset.chromosomes);
                        if (tmp) dataset.genomeId = tmp;
                    }

                    return self;

                })

        };

        function readFooter (dataset) {

            var range = {start: self.masterIndexPos, size: 4};

            return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))

                .then(function (data) {

                    var key, pos, size, binaryParser, nBytes;

                    if (!data) {
                        return null;
                    }

                    binaryParser = new igv.BinaryParser(new DataView(data));
                    nBytes = binaryParser.getInt();
                    range = {start: self.masterIndexPos + 4, size: nBytes};

                    return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))

                        .then(function (data) {

                            if (!data) {
                                return undefined;
                            }

                            var binaryParser = new igv.BinaryParser(new DataView(data));
                            self.masterIndex = {};
                            var nEntries = binaryParser.getInt();

                            while (nEntries-- > 0) {
                                key = binaryParser.getString();
                                pos = binaryParser.getLong();
                                size = binaryParser.getInt();
                                self.masterIndex[key] = {start: pos, size: size};
                            }

                            dataset.expectedValueVectors = {};

                            nEntries = binaryParser.getInt();

                            // while (nEntries-- > 0) {
                            //     type = "NONE";
                            //     unit = binaryParser.getString();
                            //     binSize = binaryParser.getInt();
                            //     nValues = binaryParser.getInt();
                            //     values = [];
                            //     while (nValues-- > 0) {
                            //         values.push(binaryParser.getDouble());
                            //     }
                            //
                            //     nChrScaleFactors = binaryParser.getInt();
                            //     normFactors = {};
                            //     while (nChrScaleFactors-- > 0) {
                            //         normFactors[binaryParser.getInt()] = binaryParser.getDouble();
                            //     }
                            //
                            //     // key = unit + "_" + binSize + "_" + type;
                            //     //  NOT USED YET SO DON'T STORE
                            //     //  dataset.expectedValueVectors[key] =
                            //     //      new ExpectedValueFunction(type, unit, binSize, values, normFactors);
                            // }

                            self.normExpectedValueVectorsPosition = self.masterIndexPos + 4 + nBytes;

                            return self;
                        })
                })
        };

    }
    /**
     * This function is used when the position of the norm vector index is unknown.  We must read through the expected
     * values to find the index
     *
     * @param dataset
     * @returns {Promise}
     */
    hic.HiCReader.prototype.readNormExpectedValuesAndNormVectorIndex = function (dataset) {

        var self = this,
            range, nEntries, nviStart, byteCount;

        if (this.normExpectedValueVectorsPosition === undefined) {
            return Promise.resolve();
        }

        if (this.normVectorIndex) {
            return Promise.resolve(this.normVectorIndex);
        }

        return skipExpectedValues.call(self, self.normExpectedValueVectorsPosition)

            .then(function (nvi) {

                nviStart = nvi;
                byteCount = 4;

                range = {start: nviStart, size: 4}

                return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))
            })

            .then(function (data) {

                var range, binaryParser, sizeEstimate;

                binaryParser = new igv.BinaryParser(new DataView(data));
                nEntries = binaryParser.getInt();

                sizeEstimate = nEntries * 30;
                range = {start: nviStart + byteCount, size: sizeEstimate}
                return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))

            })
            .then(function (data) {
                dataset.normalizedExpectedValueVectors = {};
                self.normVectorIndex = {};

                return processEntries(nEntries, data)
            })

            .then(function (ignore) {


                self.normalizationVectorIndexRange = {
                    start: nviStart,
                    size: byteCount
                };

                return self.normVectorIndex;

            })
            .catch(function (e) {
                igv.presentAlert("Error reading normalization vectors")
                console.error(e);
                self.normalizationVectorIndexRange = undefined;
            })


        function processEntries(nEntries, data) {

            var key, type, unit, binSize, p0, chrIdx, filePosition, sizeInBytes, sizeEstimate;

            var binaryParser = new igv.BinaryParser(new DataView(data));

            while (nEntries-- > 0) {

                if (binaryParser.available() < 100) {

                    nEntries++;   // Reset counter as entry is not processed

                    byteCount += binaryParser.position;

                    sizeEstimate = Math.max(1000, nEntries * 30);
                    range = {start: nviStart + byteCount, size: sizeEstimate}

                    return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))
                        .then(function (data) {
                            return processEntries(nEntries, data);
                        })
                }

                type = binaryParser.getString();      //15
                chrIdx = binaryParser.getInt();       //4
                unit = binaryParser.getString();      //3
                binSize = binaryParser.getInt();      //4
                filePosition = binaryParser.getLong();  //8
                sizeInBytes = binaryParser.getInt();     //4
                key = hic.getNormalizationVectorKey(type, chrIdx, unit, binSize);

                if (_.contains(dataset.normalizationTypes, type) === false) {
                    dataset.normalizationTypes.push(type);
                }
                self.normVectorIndex[key] = {filePosition: filePosition, size: sizeInBytes};

            }
            byteCount += binaryParser.position;
            return Promise.resolve(self);
        }


    };

    /**
     * This function is used when the position of the norm vector index is unknown.  We must read through the expected
     * values to find the index
     *
     * @param dataset
     * @returns {Promise}
     */
    function skipExpectedValues(start) {

        var self = this, range;

        var range = {start: start, size: 4};

        return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))

            .then(function (data) {
                var binaryParser = new igv.BinaryParser(new DataView(data));
                var nEntries = binaryParser.getInt();   // Total # of expected value chunks
                if (nEntries === 0) {
                    return range.start + range.size;
                }
                else {
                    return parseNext(start + 4, nEntries);
                }     // Skip 4 bytes for int
            })


        function parseNext(start, nEntries) {

            var range = {start: start, size: 500},
                chunkSize = 0,
                p0 = start;

            return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))

                .then(function (data) {
                    var binaryParser = new igv.BinaryParser(new DataView(data));
                    var nValues, nChrScaleFactors;
                    binaryParser.getString(); // type
                    binaryParser.getString(); // unit
                    binaryParser.getInt(); // binSize
                    nValues = binaryParser.getInt();
                    chunkSize += binaryParser.position + nValues * 8;
                    return start + chunkSize;
                })
                .then(function (start) {
                    var range = {start: start, size: 4};
                    return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))
                })
                .then(function (data) {
                    var binaryParser = new igv.BinaryParser(new DataView(data));
                    var nChrScaleFactors = binaryParser.getInt();
                    chunkSize += (4 + nChrScaleFactors * (4 + 8));
                    return chunkSize;
                })
                .then(function (chunkSize) {
                    nEntries--;
                    if (nEntries === 0) {
                        return Promise.resolve(p0 + chunkSize);
                    }
                    else {
                        return parseNext(p0 + chunkSize, nEntries);
                    }
                })

        }


        function parseEntry(binaryParser) {

            var p0 = binaryParser.position;

            var nValues, nChrScaleFactors;

            if (available() < 28) return false;

            var type = binaryParser.getString(); // type
            binaryParser.getString(); // unit
            binaryParser.getInt(); // binSize
            nValues = binaryParser.getInt();
            values = [];

            if (available() < nValues * 8 + 4) return false;

            while (nValues-- > 0) {
                binaryParser.getDouble();    // value
                //values.push(binaryParser.getDouble());
            }

            nChrScaleFactors = binaryParser.getInt();
            //normFactors = {};

            if (available() < nChrScaleFactors * (4 + 8)) return false;
            while (nChrScaleFactors-- > 0) {
                binaryParser.getInt();
                binaryParser.getDouble();
                //normFactors[binaryParser.getInt()] = binaryParser.getDouble();
            }

            console.log("Size = " + (binaryParser.position - p0));

            return true;
            // key = unit + "_" + binSize + "_" + type;
            // NOT USED YET SO DON'T STORE
            //   dataset.normalizedExpectedValueVectors[key] =
            //       new ExpectedValueFunction(type, unit, binSize, values, normFactors);

            function available() {
                return binaryParser.length - binaryParser.position - 1;
            }
        }
    }

    /**
     * Return a promise to load the normalization vector index
     *
     * @param dataset
     * @param range  -- file range {position, size}
     * @returns Promise for the normalization vector index
     */
    hic.HiCReader.prototype.readNormVectorIndex = function (dataset, range) {

        if (this.normVectorIndex) {
            return Promise.resolve(this.normVectorIndex);
        }

        var self = this;
        self.normalizationVectorIndexRange = range;


        return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {range: range}))

            .then(function (data) {

                var key, pos, size, binaryParser, p0, nEntries, type, chrIdx, unit, binSize, filePosition, sizeInBytes,
                    normalizationIndexPosition;

                if (!data) {
                    return undefined;
                }

                binaryParser = new igv.BinaryParser(new DataView(data));


                // Normalization vector index
                if (undefined === self.normVectorIndex) self.normVectorIndex = {};

                p0 = binaryParser.position;
                normalizationIndexPosition = range.start + p0;

                nEntries = binaryParser.getInt();
                while (nEntries-- > 0) {
                    type = binaryParser.getString();
                    chrIdx = binaryParser.getInt();
                    unit = binaryParser.getString();
                    binSize = binaryParser.getInt();
                    filePosition = binaryParser.getLong();
                    sizeInBytes = binaryParser.getInt();

                    key = hic.getNormalizationVectorKey(type, chrIdx, unit, binSize);

                    if (_.contains(dataset.normalizationTypes, type) === false) {
                        dataset.normalizationTypes.push(type);
                    }
                    self.normVectorIndex[key] = {filePosition: filePosition, size: sizeInBytes};
                }

                return self.normVectorIndex;

            })
    }

    hic.HiCReader.prototype.readMatrix = function (key) {

        var self = this,
            idx = self.masterIndex[key];

        if (idx === null || idx === undefined) {
            return Promise.resolve(undefined);
        }

        return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
            range: {
                start: idx.start,
                size: idx.size
            }
        }))

            .then(function (data) {

                    if (!data) {
                        return null;
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

                    return Promise.all([p1, p2])

                        .then(function (results) {
                            var sites1 = results[0];
                            var sites2 = results[1];

                            while (nResolutions-- > 0) {
                                var zd = parseMatixZoomData(chr1, chr2, sites1, sites2, dis);
                                zdList.push(zd);
                            }

                            return new Matrix(c1, c2, zdList);

                        })
                }
            )

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
            return Promise.resolve(undefined);
        }
        else {

            return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
                range: {
                    start: idx.filePosition,
                    size: idx.size
                }
            }))
                .then(function (data) {

                    if (!data) {
                        return undefined;
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
                                        records.push(new hic.ContactRecord(bin1, bin2, counts));
                                    }
                                }

                            }

                        } else {
                            throw new Error("Unknown block type: " + type);
                        }

                    }

                    return new hic.Block(blockNumber, zd, records);
                })


        }
    };


    function getSites(chrName) {

        var self = this;
        var sites, entry;

        sites = self.fragmentSitesCache[chrName];

        if (sites) {
            return Promise.resolve(sites);

        } else if (self.fragmentSitesIndex) {

            entry = self.fragmentSitesIndex[chrName];

            if (entry !== undefined && entry.nSites > 0) {

                return readSites(entry.position, entry.nSites)
                    .then(function (sites) {
                        self.fragmentSitesCache[chrName] = sites;
                        return sites;

                    })
            }
        }
        else {
            return Promise.resolve(undefined);
        }

    }

    function parseMatixZoomData(chr1, chr2, chr1Sites, chr2Sites, dis) {

        var unit, sumCounts, occupiedCellCount, stdDev, percent95, binSize, zoom, blockBinCount,
            blockColumnCount, zd, nBlocks, blockIndex, nBins1, nBins2, avgCount, blockNumber,
            filePosition, blockSizeInBytes;

        unit = dis.getString();

        dis.getInt();                // Old "zoom" index -- not used, must be read

        // Stats.  Not used yet, but we need to read them anyway
        sumCounts = dis.getFloat();
        occupiedCellCount = dis.getFloat();
        stdDev = dis.getFloat();
        percent95 = dis.getFloat();

        binSize = dis.getInt();
        zoom = {unit: unit, binSize: binSize};

        blockBinCount = dis.getInt();
        blockColumnCount = dis.getInt();

        zd = new MatrixZoomData(chr1, chr2, zoom, blockBinCount, blockColumnCount, chr1Sites, chr2Sites);

        nBlocks = dis.getInt();
        blockIndex = {};

        while (nBlocks-- > 0) {
            blockNumber = dis.getInt();
            filePosition = dis.getLong();
            blockSizeInBytes = dis.getInt();
            blockIndex[blockNumber] = {filePosition: filePosition, size: blockSizeInBytes};
        }
        zd.blockIndexMap = blockIndex;

        nBins1 = (chr1.size / binSize);
        nBins2 = (chr2.size / binSize);
        avgCount = (sumCounts / nBins1) / nBins2;   // <= trying to avoid overflows

        zd.averageCount = avgCount;
        zd.sumCounts = sumCounts;
        zd.stdDev = stdDev;
        zd.occupiedCellCount = occupiedCellCount;
        zd.percent95 = percent95;

        return zd;
    }

    hic.HiCReader.prototype.readNormalizationVector = function (type, chrIdx, unit, binSize) {

        var self = this,
            idx,
            key = hic.getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);


        if (this.normVectorIndex == null) {
            return Promise.resolve(undefined);
        }

        idx = this.normVectorIndex[key];
        if (!idx) {
            alert("Normalization option " + type + " not available at this resolution");
            return Promise.resolve(undefined);
        }

        return igv.xhr.loadArrayBuffer(self.path, igv.buildOptions(self.config, {
            range: {
                start: idx.filePosition,
                size: idx.size
            }
        }))
            .then(function (data) {

                var parser, nValues, values, allNaN, i;

                if (!data) {
                    return undefined;
                }

                // var inflate = new Zlib.Inflate(new Uint8Array(data));
                // var plain = inflate.decompress();
                // data = plain.buffer;

                parser = new igv.BinaryParser(new DataView(data));
                nValues = parser.getInt();
                values = [];
                allNaN = true;
                for (i = 0; i < nValues; i++) {
                    values[i] = parser.getDouble();
                    if (!isNaN(values[i])) {
                        allNaN = false;
                    }
                }
                if (allNaN) {
                    return undefined;
                } else {
                    return new hic.NormalizationVector(type, chrIdx, unit, binSize, values);
                }


            })

    }


    hic.HiCReader.prototype.readNormalizationVectorFile = function (url, chromosomes) {

        var self = this;
        var options = igv.buildOptions({});    // Add oauth token, if any

        return igv.xhr

            .loadString(url, options)

            .then(function (data) {

                var lines = data.split('\n'),
                    len = lines.length,
                    line, i, type, chr, binSize, unit, tokens, values, v, key, chrIdx, chrMap, vectors, types;

                types = new Set();
                vectors = {};
                chrMap = {};
                chromosomes.forEach(function (chr) {
                    chrMap[chr.name] = chr.index;
                    if (chr.name.startsWith("chr")) {
                        chrMap[chr.name.substring(3)] = chr.index;
                    } else {
                        chrMap["chr" + chr.name] = chr.index;
                    }
                })

                for (i = 0; i < len; i++) {
                    line = lines[i].trim();
                    if (line.startsWith("vector")) {

                        if (key) {
                            vectors[key] = new hic.NormalizationVector(type, chrIdx, unit, binSize, values)
                        }
                        values = [];

                        tokens = line.split("\t");
                        type = tokens[1];
                        chr = tokens[2];
                        binSize = tokens[3];
                        unit = tokens[4];


                        chrIdx = chrMap[chr];
                        if (chrIdx) {
                            types.add(type);
                            key = hic.getNormalizationVectorKey(type, chrIdx, unit.toString(), binSize);
                        } else {
                            key = undefined;
                            console.log("Unknown chromosome: " + chr);
                        }


                    }
                    else {
                        if (key && values) {
                            v = (line.length === 0 || line == ".") ? NaN : parseFloat(line);
                            values.push(v);
                        }
                    }
                }

                // Last one
                if (key && values && values.length > 0) {
                    vectors[key] = new hic.NormalizationVector(type, chrIdx, unit, binSize, values);
                }

                vectors.types = types;

                return vectors;
            })

    };


    function MatrixZoomData(chr1, chr2, zoom, blockBinCount, blockColumnCount, chr1Sites, chr2Sites) {
        this.chr1 = chr1;    // chromosome index
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

        zoomDataList.forEach(function (zd) {
            if (zd.zoom.unit === "BP") {
                self.bpZoomData.push(zd);
            } else {
                self.fragZoomData.push(zd);
            }
        });
    }

    Matrix.prototype.getZoomDataByIndex = function (index, unit) {
        var zdArray = "FRAG" === unit ? this.fragZoomData : this.bpZoomData;
        return zdArray[index];
    };


    Matrix.prototype.findZoomForResolution = function (binSize, unit) {

        var i, zdArray = "FRAG" === unit ? this.fragZoomData : this.bpZoomData;

        for (i = 1; i < zdArray.length; i++) {
            var zd = zdArray[i];
            if (zd.zoom.binSize < binSize) {
                return i - 1;
            }
        }
        return zdArray.length - 1;

    }

// Legacy implementation, used only in tests.
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


    function ExpectedValueFunction(normType, unit, binSize, values, normFactors) {
        this.normType = normType;
        this.unit = unit;
        this.binSize = binSize;
        this.values = values;
        this.normFactors = normFactors;
    }


    function matchGenome(chromosomes) {

        var keys = Object.keys(knownGenomes),
            i, l;

        if (chromosomes.length < 4) return undefined;

        for (i = 0; i < keys.length; i++) {
            l = knownGenomes[keys[i]];
            if (chromosomes[1].size === l[0] && chromosomes[2].size === l[1] && chromosomes[3].size === l[2]) {
                return keys[i];
            }
        }

        return undefined;


    }

    var knownGenomes = {

        "hg19": [249250621, 243199373, 198022430],
        "hg38": [248956422, 242193529, 198295559],
        "mm10": [195471971, 182113224, 160039680],
        "mm9": [197195432, 181748087, 159599783]

    }


    return hic;

})
(hic || {});
