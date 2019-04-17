(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["juicebox"] = factory();
	else
		root["juicebox"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./website/js/app.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./website/js/app.js":
/*!***************************!*\
  !*** ./website/js/app.js ***!
  \***************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _site__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./site */ "./website/js/site.js");
/*
 *  The MIT License (MIT)
 *
 * Copyright (c) 2019 The Regents of the University of California
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

$(document).ready(function () {
  var config = {
    mapMenu: {
      id: 'dataset_selector',
      items: 'res/mapMenuData.txt'
    },
    trackMenu: {
      id: 'annotation-selector',
      items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_$GENOME_ID.txt'
    },
    trackMenu2D: {
      id: 'annotation-2D-selector',
      items: 'https://hicfiles.s3.amazonaws.com/internal/tracksMenu_2D.$GENOME_ID.txt'
    },
    // List of URL shorteners.  First in the list is the default and will be used for shortening URLs
    // Others potentiall used for expanding short URLs.  At least 1 shortener is required for the
    // "Share" button.
    // NOTE: you must provide an API key (Google) or access token (Bitly) to use these services on your site
    urlShortener: [{
      provider: "google",
      apiKey: "ABCD",
      // TODO -- replace with your Google API Key
      hostname: "goo.gl"
    }, {
      provider: "bitly",
      apiKey: "ABCD",
      // TODO -- replace with your Bitly access token
      hostname: 'bit.ly'
    }],
    apiKey: "ABCD" // TODO -- replace with your Google API Key

  };
  _site__WEBPACK_IMPORTED_MODULE_0__["default"].init($('#app-container'), config);
});

/***/ }),

/***/ "./website/js/encode.js":
/*!******************************!*\
  !*** ./website/js/encode.js ***!
  \******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var EncodeDataSource = function EncodeDataSource(columnFormat) {
  this.columnFormat = columnFormat;
};

EncodeDataSource.prototype.retrieveData = function (genomeID, filter) {
  var self = this,
      assembly;
  assembly = genomeID;
  var url = "https://s3.amazonaws.com/igv.org.app/encode/" + assembly + ".txt.gz";
  return igv.xhr.loadString(url, {}).then(function (data) {
    return parseTabData(data, filter);
  }).then(function (records) {
    records.sort(encodeSort);
    return Promise.resolve(records);
  }); // .loadJson(urlString(assembly), {})
  // .then(function(json){
  //     return parseJSONData(json, assembly, self.fileFormats);
  // })
  // .then(function (data) {
  //     data.sort(encodeSort);
  //     return Promise.resolve(data);
  // });
};

function parseTabData(data, filter) {
  if (!data) return null;
  var dataWrapper, line;
  dataWrapper = igv.getDataWrapper(data);
  var records = [];
  dataWrapper.nextLine(); // Skip header

  while (line = dataWrapper.nextLine()) {
    var tokens = line.split("\t");
    var record = {
      "Assembly": tokens[1],
      "ExperimentID": tokens[0],
      "Experiment": tokens[0].substr(13).replace("/", ""),
      "Cell Type": tokens[2],
      "Assay Type": tokens[3],
      "Target": tokens[4],
      "Format": tokens[8],
      "Output Type": tokens[7],
      "Lab": tokens[9],
      "url": "https://www.encodeproject.org" + tokens[10],
      "Bio Rep": tokens[5],
      "Tech Rep": tokens[6],
      "Accession": tokens[11]
    };
    constructName(record);

    if (filter === undefined || filter(record)) {
      records.push(record);
    }
  }

  return records;
}

function constructName(record) {
  var name = record["Cell Type"] || "";

  if (record["Target"]) {
    name += " " + record["Target"];
  }

  if (record["Assay Type"].toLowerCase() !== "chip-seq") {
    name += " " + record["Assay Type"];
  }

  if (record["Bio Rep"]) {
    name += " " + record["Bio Rep"];
  }

  if (record["Tech Rep"]) {
    name += (record["Bio Rep"] ? ":" : " 0:") + record["Tech Rep"];
  }

  name += " " + record["Output Type"];
  name += " " + record["Experiment"];
  record["Name"] = name;
}

function encodeSort(a, b) {
  var aa1, aa2, cc1, cc2, tt1, tt2;
  aa1 = a['Assay Type'];
  aa2 = b['Assay Type'];
  cc1 = a['Cell Type'];
  cc2 = b['Cell Type'];
  tt1 = a['Target'];
  tt2 = b['Target'];

  if (aa1 === aa2) {
    if (cc1 === cc2) {
      if (tt1 === tt2) {
        return 0;
      } else if (tt1 < tt2) {
        return -1;
      } else {
        return 1;
      }
    } else if (cc1 < cc2) {
      return -1;
    } else {
      return 1;
    }
  } else {
    if (aa1 < aa2) {
      return -1;
    } else {
      return 1;
    }
  }
}

EncodeDataSource.prototype.tableData = function (data) {
  var self = this,
      mapped;
  mapped = data.map(function (row) {
    var displayKeys = self.columnFormat.map(function (col) {
      return col.title;
    });
    return displayKeys.map(function (key) {
      return row[key];
    });
  });
  return mapped;
};

EncodeDataSource.prototype.tableColumns = function () {
  return this.columnFormat;
};

EncodeDataSource.prototype.dataAtRowIndex = function (data, index) {
  var row = data[index];
  var format = getFormat(row);
  var type;

  if (format === 'bedpe-domain') {
    type = 'annotation';
  } else if (format === 'bedpe-loop') {
    type = 'interaction';
  }

  var obj = {
    url: row['url'],
    color: encodeAntibodyColor(row['Target']),
    name: row['Name'],
    format: format,
    type: type
  };
  return obj;

  function encodeAntibodyColor(antibody) {
    var colors, key;
    colors = {
      DEFAULT: "rgb(3, 116, 178)",
      H3K27AC: "rgb(200, 0, 0)",
      H3K27ME3: "rgb(130, 0, 4)",
      H3K36ME3: "rgb(0, 0, 150)",
      H3K4ME1: "rgb(0, 150, 0)",
      H3K4ME2: "rgb(0, 150, 0)",
      H3K4ME3: "rgb(0, 150, 0)",
      H3K9AC: "rgb(100, 0, 0)",
      H3K9ME1: "rgb(100, 0, 0)"
    };

    if (undefined === antibody || '' === antibody || '-' === antibody) {
      key = 'DEFAULT';
    } else {
      key = antibody.toUpperCase();
    }

    return colors[key];
  }

  function getFormat(row) {
    var format = row['Format'],
        outputType = row['Output Type'],
        assayType = row['Assay Type'];

    if (format === 'bedpe' && outputType && outputType.includes('domain')) {
      return 'bedpe-domain';
    } else if (format === 'tsv' && outputType.includes("interaction") && assayType.toLowerCase() === 'hic') {
      return "bedpe-loop";
    } else {
      return format.toLowerCase();
    }
  }
};

function urlString(assembly, fileFormat) {
  var str; // TODO - Test Error Handling with this URL.
  // str = "https://www.encodeproject.org/search/?type=experiment&assembly=/work/ea14/juicer/references/genome_collection/Hs2-HiC.chrom.sizes&files.file_format=bigWig&format=json&field=lab.title&field=biosample_term_name&field=assay_term_name&field=target.label&field=files.file_format&field=files.output_type&field=files.href&field=files.replicate.technical_replicate_number&field=files.replicate.biological_replicate_number&field=files.assembly&limit=all";

  str = "https://www.encodeproject.org/search/?" + "type=experiment&" + "assembly=" + assembly + "&" + //"files.file_format=" + fileFormat + "&" +
  "format=json&" + "field=lab.title&" + "field=biosample_term_name&" + "field=assay_term_name&" + "field=target.label&" + "field=files.file_format&" + "field=files.output_type&" + "field=files.href&" + "field=files.replicate.technical_replicate_number&" + "field=files.replicate.biological_replicate_number&" + "field=files.assembly&" + "limit=all";
  return str;
}

function parseJSONData(json, assembly, fileFormats) {
  var rows = [];
  json["@graph"].forEach(function (record) {
    var cellType, target, filtered, mapped, assayType;
    cellType = record.biosample_term_name;
    assayType = record.assay_term_name;
    target = record.target ? record.target.label : undefined;
    var id = record["@id"];

    if (record.files) {
      filtered = record.files.filter(function (file) {
        return assembly === file.assembly && (!fileFormats || fileFormats.has(file.file_format));
      });
      mapped = filtered.map(function (file) {
        var bioRep = file.replicate ? file.replicate.bioligcal_replicate_number : undefined,
            techRep = file.replicate ? file.replicate.technical_replicate_number : undefined,
            name = cellType || "";

        if (target) {
          name += " " + target;
        }

        if (assayType && assayType.toLowerCase() !== "chip-seq") {
          name += " " + assayType;
        }

        if (bioRep) {
          name += " " + bioRep;
        }

        if (techRep) {
          name += (bioRep ? ":" : " 0:") + techRep;
        }

        return {
          "Assembly": file.assembly,
          "ExperimentID": record['@id'],
          "Cell Type": cellType || '',
          "Assay Type": record.assay_term_name,
          "Target": target || '',
          "Lab": record.lab ? record.lab.title : "",
          "Format": file.file_format,
          "Output Type": file.output_type,
          "url": "https://www.encodeproject.org" + file.href,
          "Bio Rep": bioRep,
          "Tech Rep": techRep,
          "Name": name
        };
      });
    }

    Array.prototype.push.apply(rows, mapped);
  });
  return rows.map(function (row) {
    return Object.keys(row).map(function (key) {
      var val = row[key];
      return undefined === val || '' === val ? '-' : val;
    });
  });
}

/* harmony default export */ __webpack_exports__["default"] = (EncodeDataSource);

/***/ }),

/***/ "./website/js/modalTable.js":
/*!**********************************!*\
  !*** ./website/js/modalTable.js ***!
  \**********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Created by dat on 4/18/17.
 */
var ModalTable = function ModalTable(config) {
  this.config = config;
  this.datasource = config.datasource;
  this.browserHandler = config.browserHandler;
  teardownModalDOM(config);
  this.$table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>');
  config.$modalBody.append(this.$table);
  this.doRetrieveData = true;
  this.doBuildTable = true;
  this.$spinner = $('<div>');
  this.$table.append(this.$spinner);
  this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));
};

function teardownModalDOM(configuration) {
  var list;
  list = [configuration.$modal, configuration.$modalTopCloseButton, configuration.$modalBottomCloseButton, configuration.$modalGoButton];
  list.forEach(function ($e) {
    $e.unbind();
  });
  configuration.$modalBody.empty();
}

function getSelectedTableRowsData($rows) {
  var self = this,
      dt,
      result;
  result = [];

  if ($rows.length > 0) {
    $rows.removeClass('selected');
    dt = self.$table.DataTable();
    $rows.each(function () {
      result.push(self.datasource.dataAtRowIndex(self.datasource.data, dt.row(this).index()));
    });
  }

  return result.length > 0 ? result : undefined;
}

ModalTable.prototype.startSpinner = function () {
  this.$spinner.show();
};

ModalTable.prototype.stopSpinner = function () {
  this.$spinner.hide();
};

ModalTable.prototype.hidePresentationButton = function () {
  this.config.$modalPresentationButton.addClass('igv-app-disabled');
  this.config.$modalPresentationButton.text('Genome not supported by ENCODE');
};

ModalTable.prototype.willRetrieveData = function () {
  //this.startSpinner();
  $('#hic-encode-modal-button').hide();
  $('#hic-encode-loading').show();
};

ModalTable.prototype.didRetrieveData = function () {
  //this.config.didRetrieveData();
  $('#hic-encode-modal-button').show();
  $('#hic-encode-loading').hide();
};

ModalTable.prototype.didFailToRetrieveData = function () {
  this.stopSpinner();
  this.buildTable(false);
};

ModalTable.prototype.loadData = function (genomeId) {
  var self = this,
      assembly;
  this.willRetrieveData();
  assembly = ModalTable.getAssembly(genomeId);

  if (assembly) {
    this.datasource.retrieveData(assembly, function (record) {
      // to bigwig only for now
      return record["Format"].toLowerCase() === "bigwig";
    }).then(function (data) {
      self.datasource.data = data;
      self.doRetrieveData = false;
      self.didRetrieveData();
      self.buildTable(true);
    }).catch(function (e) {
      self.didFailToRetrieveData();
    });
  }
};

ModalTable.prototype.buildTable = function (success) {
  var self = this;

  if (true === success) {
    this.config.$modal.on('shown.bs.modal', function (e) {
      if (true === self.doBuildTable) {
        self.tableWithDataAndColumns(self.datasource.tableData(self.datasource.data), self.datasource.tableColumns());
        self.stopSpinner();
        self.doBuildTable = false;
      }
    });
    this.config.$modalGoButton.on('click', function () {
      var selected;
      selected = getSelectedTableRowsData.call(self, self.$dataTables.$('tr.selected'));

      if (selected) {
        self.browserHandler(selected);
      }
    });
  }

  this.config.$modalTopCloseButton.on('click', function () {
    $('tr.selected').removeClass('selected');
  });
  this.config.$modalBottomCloseButton.on('click', function () {
    $('tr.selected').removeClass('selected');
  });
};

ModalTable.prototype.tableWithDataAndColumns = function (tableData, tableColumns) {
  var config;
  this.stopSpinner();
  config = {
    data: tableData,
    columns: tableColumns,
    autoWidth: false,
    paging: true,
    scrollX: true,
    scrollY: '400px',
    scroller: true,
    scrollCollapse: true
  };
  this.$dataTables = this.$table.dataTable(config);
  this.$table.find('tbody').on('click', 'tr', function () {
    if ($(this).hasClass('selected')) {
      $(this).removeClass('selected');
    } else {
      $(this).addClass('selected');
    }
  });
};

ModalTable.getAssembly = function (genomeID) {
  var lut, assembly;
  lut = {
    dm3: 'dm3',
    mm10: 'mm10',
    hg19: 'hg19',
    hg38: 'GRCh38'
  };
  assembly = lut[genomeID];
  return assembly;
};

/* harmony default export */ __webpack_exports__["default"] = (ModalTable);

/***/ }),

/***/ "./website/js/site.js":
/*!****************************!*\
  !*** ./website/js/site.js ***!
  \****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _modalTable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modalTable */ "./website/js/modalTable.js");
/* harmony import */ var _encode__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./encode */ "./website/js/encode.js");
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
 * Created by Jim Robinson on 3/4/17.
 *
 * Page (site specific) code for the example pages.
 *
 */

 //import QRCode from './qrcode'

var juicebox = {};
/* harmony default export */ __webpack_exports__["default"] = (juicebox);
var apiKey = "ABCD",
    // TODO -- replace with your GOOGLE api key or Bitly access token to use URL shortener.
encodeTable,
    lastGenomeId,
    qrcode,
    contact_map_dropdown_id = 'hic-contact-map-dropdown',
    control_map_dropdown_id = 'hic-control-map-dropdown';

juicebox.init = function ($container, config) {
  var genomeChangeListener, $appContainer, query, $hic_share_url_modal, $e;
  hic.captionManager = new hic.CaptionManager($('#hic-caption'));
  $('#hic-encode-modal-button').hide();
  $('#hic-encode-loading').show();

  if (config.urlShortener) {
    hic.setURLShortener(config.urlShortener);
  } else {
    $("#hic-share-button").hide();
  }

  genomeChangeListener = {
    receiveEvent: function receiveEvent(event) {
      var genomeId = event.data;

      if (lastGenomeId !== genomeId) {
        // lastGenomeId = genomeId;
        if (config.trackMenu) {
          var tracksURL = config.trackMenu.items.replace("$GENOME_ID", genomeId);
          loadAnnotationSelector($('#' + config.trackMenu.id), tracksURL, "1D");
        }

        if (config.trackMenu2D) {
          var annotations2dURL = config.trackMenu2D.items.replace("$GENOME_ID", genomeId);
          loadAnnotationSelector($('#' + config.trackMenu2D.id), annotations2dURL, "2D");
        }

        createEncodeTable(genomeId);
      }
    }
  };
  config = config || {};
  $appContainer = $container;
  apiKey = config.apiKey;

  if (apiKey) {
    if (apiKey === "ABCD") apiKey = "AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0";
    hic.setApiKey(apiKey);
  }

  query = hic.extractQuery(window.location.href);

  if (query && query.hasOwnProperty("juiceboxURL")) {
    hic.expandURL(query["juiceboxURL"]).then(function (jbURL) {
      query = hic.extractQuery(jbURL);
      createBrowsers(query).then(postCreateBrowser);
    });
  } else {
    createBrowsers(query).then(postCreateBrowser);
  }

  function postCreateBrowser() {
    if (config.mapMenu) {
      populatePulldown(config.mapMenu);
    }

    $hic_share_url_modal = $('#hic-share-url-modal');

    function maybeShortenURL(url) {
      if (url.length < 2048) {
        return hic.shortenURL(url);
      } else {
        igv.presentAlert("URL too long to shorten");
        return Promise.resolve(url);
      }
    }

    $hic_share_url_modal.on('show.bs.modal', function (e) {
      var queryString, href, idx;
      href = new String(window.location.href); // This js file is specific to the aidenlab site, and we know we have only juicebox parameters.
      // Strip href of current parameters, if any

      idx = href.indexOf("?");
      if (idx > 0) href = href.substring(0, idx);
      hic.shortJuiceboxURL(href).then(function (jbUrl) {
        getEmbeddableSnippet(jbUrl).then(function (embedSnippet) {
          var $hic_embed_url;
          $hic_embed_url = $('#hic-embed');
          $hic_embed_url.val(embedSnippet);
          $hic_embed_url.get(0).select();
        });
        maybeShortenURL(jbUrl).then(function (shortURL) {
          var shareUrl = shortURL || jbUrl; // Shorten second time
          // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

          var tweetContainer, config, $hic_share_url;
          $hic_share_url = $('#hic-share-url');
          $hic_share_url.val(shareUrl);
          $hic_share_url.get(0).select();
          tweetContainer = $('#tweetButtonContainer');
          tweetContainer.empty();
          config = {
            text: 'Contact map: '
          };
          $('#emailButton').attr('href', 'mailto:?body=' + shareUrl);

          if (shareUrl.length < 100) {
            window.twttr.widgets.createShareButton(shareUrl, tweetContainer.get(0), config).then(function (el) {}); // QR code generation

            if (qrcode) {
              qrcode.clear();
              $('hic-qr-code-image').empty();
            } else {
              config = {
                width: 128,
                height: 128,
                correctLevel: QRCode.CorrectLevel.H
              };
              qrcode = new QRCode(document.getElementById("hic-qr-code-image"), config);
            }

            qrcode.makeCode(shareUrl);
          }
        });
      });
    });
    $hic_share_url_modal.on('hidden.bs.modal', function (e) {
      $('#hic-embed-container').hide();
      $('#hic-qr-code-image').hide();
    });
    $('#hic-track-dropdown').parent().on('shown.bs.dropdown', function () {
      var browser;
      browser = hic.Browser.getCurrentBrowser();

      if (undefined === browser || undefined === browser.dataset) {
        igv.presentAlert('Contact map must be loaded and selected before loading tracks');
      }
    });
    $('#hic-embed-button').on('click', function (e) {
      $('#hic-qr-code-image').hide();
      $('#hic-embed-container').toggle();
    });
    $('#hic-qr-code-button').on('click', function (e) {
      $('#hic-embed-container').hide();
      $('#hic-qr-code-image').toggle();
    });
    $('#dataset_selector').on('change', function (e) {
      var $selected, url, browser;
      url = $(this).val();
      $selected = $(this).find('option:selected');
      browser = hic.Browser.getCurrentBrowser();

      if (undefined === browser) {
        igv.presentAlert('ERROR: you must select a map panel by clicking the panel header.');
      } else {
        loadHicFile(url, $selected.text());
      }

      $('#hic-contact-map-select-modal').modal('hide');
      $(this).find('option').removeAttr("selected");
    });
    $('.selectpicker').selectpicker();
    $('#hic-load-local-file').on('change', function (e) {
      var file, suffix;

      if (undefined === hic.Browser.getCurrentBrowser()) {
        igv.presentAlert('ERROR: you must select a map panel.');
      } else {
        file = $(this).get(0).files[0];
        suffix = file.name.substr(file.name.lastIndexOf('.') + 1);

        if ('hic' === suffix) {
          loadHicFile(file, file.name);
        } else {
          hic.Browser.getCurrentBrowser().loadTracks([{
            url: file,
            name: file.name
          }]);
        }
      }

      $(this).val("");
      $('#hic-load-local-file-modal').modal('hide');
    });
    $('#hic-load-url').on('change', function (e) {
      var url, suffix, paramIdx, path;

      if (undefined === hic.Browser.getCurrentBrowser()) {
        igv.presentAlert('ERROR: you must select a map panel.');
      } else {
        url = $(this).val();
        loadHicFile(url);
      }

      $(this).val("");
      $('#hic-load-url-modal').modal('hide');
    });
    $('#track-load-url').on('change', function (e) {
      var url;

      if (undefined === hic.Browser.getCurrentBrowser()) {
        igv.presentAlert('ERROR: you must select a map panel.');
      } else {
        url = $(this).val();
        hic.Browser.getCurrentBrowser().loadTracks([{
          url: url
        }]);
      }

      $(this).val("");
      $('#track-load-url-modal').modal('hide');
    });
    $('#annotation-selector').on('change', function (e) {
      var path, name;

      if (undefined === hic.Browser.getCurrentBrowser()) {
        igv.presentAlert('ERROR: you must select a map panel.');
      } else {
        path = $(this).val();
        name = $(this).find('option:selected').text();
        var _config = {
          url: path,
          name: name
        };

        if (path.indexOf("hgdownload.cse.ucsc.edu") > 0) {
          _config.indexed = false; //UCSC files are never indexed
        }

        hic.Browser.getCurrentBrowser().loadTracks([_config]);
      }

      $('#hic-annotation-select-modal').modal('hide');
      $(this).find('option').removeAttr("selected");
    });
    $('#annotation-2D-selector').on('change', function (e) {
      var path, name;

      if (undefined === hic.Browser.getCurrentBrowser()) {
        igv.presentAlert('ERROR: you must select a map panel.');
      } else {
        path = $(this).val();
        name = $(this).find('option:selected').text();
        hic.Browser.getCurrentBrowser().loadTracks([{
          url: path,
          name: name
        }]);
      }

      $('#hic-annotation-2D-select-modal').modal('hide');
      $(this).find('option').removeAttr("selected");
    });
    $('.juicebox-app-clone-button').on('click', function (e) {
      var browser, config;
      config = {
        initFromUrl: false,
        updateHref: false
      };
      hic.createBrowser($container.get(0), config).then(function (browser) {
        browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
        hic.Browser.setCurrentBrowser(browser);
      });
    });
    $('#hic-copy-link').on('click', function (e) {
      var success;
      $('#hic-share-url')[0].select();
      success = document.execCommand('copy');

      if (success) {
        $('#hic-share-url-modal').modal('hide');
      } else {
        alert("Copy not successful");
      }
    });
    $('#hic-embed-copy-link').on('click', function (e) {
      var success;
      $('#hic-embed')[0].select();
      success = document.execCommand('copy');

      if (success) {
        $('#hic-share-url-modal').modal('hide');
      } else {
        alert("Copy not successful");
      }
    });
    $e = $('button[id$=-map-dropdown]');
    $e.parent().on('show.bs.dropdown', function () {
      var id = $(this).children('.dropdown-toggle').attr('id');
      juicebox.currentContactMapDropdownButtonID = id;
    });
    $e.parent().on('hide.bs.dropdown', function () {});
    hic.eventBus.subscribe("BrowserSelect", function (event) {
      updateBDropdown(event.data);
    });
  }

  function getEmbeddableSnippet(jbUrl) {
    return new Promise(function (fulfill, reject) {
      var idx, embedUrl, params, width, height;
      idx = jbUrl.indexOf("?");
      params = jbUrl.substring(idx);
      embedUrl = (config.embedTarget || getEmbedTarget()) + params;
      width = $appContainer.width() + 50;
      height = $appContainer.height();
      fulfill('<iframe src="' + embedUrl + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>'); // Disable shortening the embedUrl for now -- we don't want to bake in the embedTarget
      // shortenURL(embedUrl)
      //     .then(function (shortURL) {
      //         fulfill('<iframe src="' + shortURL + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>');
      //     });
    });
  }
  /**
   * Get the default embed html target.  Assumes an "embed.html" file in same directory as this page
   */


  function getEmbedTarget() {
    var href, idx;
    href = new String(window.location.href);
    idx = href.indexOf("?");
    if (idx > 0) href = href.substring(0, idx);
    idx = href.lastIndexOf("/");
    return href.substring(0, idx) + "/embed.html";
  }

  function createBrowsers(query) {
    var parts, q, browser, i;

    if (query && query.hasOwnProperty("juicebox")) {
      q = query["juicebox"];

      if (q.startsWith("%7B")) {
        q = decodeURIComponent(q);
      }

      q = q.substr(1, q.length - 2); // Strip leading and trailing bracket

      parts = q.split("},{");
      return hic.createBrowser($container.get(0), {
        queryString: decodeURIComponent(parts[0])
      }).then(function (browser) {
        browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
        browser.eventBus.subscribe("MapLoad", checkBDropdown);

        if (parts && parts.length > 1) {
          var p = [];

          for (i = 1; i < parts.length; i++) {
            p.push(hic.createBrowser($container.get(0), {
              queryString: decodeURIComponent(parts[i])
            }).then(function (browser) {
              browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
              browser.eventBus.subscribe("MapLoad", checkBDropdown);
            }));
          }

          Promise.all(p).then(function (browserList) {
            syncBrowsers();
          });
        } // Must manually trigger the genome change event on initial load


        if (browser && browser.genome) {
          genomeChangeListener.receiveEvent({
            data: browser.genome.id
          });
        }

        return browser;
      });
    } else {
      return hic.createBrowser($container.get(0), {}).then(function (browser) {
        browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
        browser.eventBus.subscribe("MapLoad", checkBDropdown); // Must manually trigger the genome change event on initial load

        if (browser && browser.genome) {
          genomeChangeListener.receiveEvent({
            data: browser.genome.id
          });
        }

        return browser;
      });
    }
  }
};

function syncBrowsers() {
  hic.syncBrowsers(hic.allBrowsers);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = hic.allBrowsers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var browser = _step.value;
      updateBDropdown(browser);
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return != null) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
}

function checkBDropdown() {
  updateBDropdown(hic.Browser.getCurrentBrowser());
}

function updateBDropdown(browser) {
  if (browser) {
    if (browser.dataset) {
      $('#hic-control-map-dropdown').removeClass('disabled');
    } else {
      $('#hic-control-map-dropdown').addClass('disabled');
    }
  }
}

function loadHicFile(url, name) {
  var synchState, browsersWithMaps, isControl, browser, query, config, uriDecode;
  browsersWithMaps = hic.allBrowsers.filter(function (browser) {
    return browser.dataset !== undefined;
  });

  if (browsersWithMaps.length > 0) {
    synchState = browsersWithMaps[0].getSyncState();
  }

  isControl = juicebox.currentContactMapDropdownButtonID === control_map_dropdown_id;
  browser = hic.Browser.getCurrentBrowser();
  config = {
    url: url,
    name: name,
    isControl: isControl
  };

  if (igv.isString(url) && url.includes("?")) {
    query = hic.extractQuery(url);
    uriDecode = url.includes("%2C");
    igv.Browser.decodeQuery(query, config, uriDecode);
  }

  if (isControl) {
    browser.loadHicControlFile(config).then(function (dataset) {});
  } else {
    browser.reset();
    browsersWithMaps = hic.allBrowsers.filter(function (browser) {
      return browser.dataset !== undefined;
    });

    if (browsersWithMaps.length > 0) {
      config["synchState"] = browsersWithMaps[0].getSyncState();
    }

    browser.loadHicFile(config).then(function (ignore) {
      if (!isControl) {
        hic.syncBrowsers(hic.allBrowsers);
      }

      $('#hic-control-map-dropdown').removeClass('disabled');
    });
  }
}

function populatePulldown(menu) {
  var parent;
  parent = $("#" + menu.id);
  igv.xhr.loadString(menu.items).then(function (data) {
    var lines = igv.splitLines(data),
        len = lines.length,
        tokens,
        i;

    for (i = 0; i < len; i++) {
      tokens = lines[i].split('\t');

      if (tokens.length > 1) {
        parent.append($('<option value="' + tokens[0] + '">' + tokens[1] + '</option>'));
      }
    }

    parent.selectpicker("refresh");
  }).catch(function (error) {});
}

function createEncodeTable(genomeId) {
  var config, columnFormat, encodeDatasource, loadTracks;

  if (encodeTable && genomeId === lastGenomeId) {// do nothing
  } else {
    lastGenomeId = genomeId;

    if (encodeTable) {
      discardEncodeTable();
    }

    columnFormat = [{
      title: 'Cell Type',
      width: '7%'
    }, {
      title: 'Target',
      width: '8%'
    }, {
      title: 'Assay Type',
      width: '20%'
    }, {
      title: 'Output Type',
      width: '20%'
    }, {
      title: 'Bio Rep',
      width: '5%'
    }, {
      title: 'Tech Rep',
      width: '5%'
    }, {
      title: 'Format',
      width: '5%'
    }, {
      title: 'Experiment',
      width: '7%'
    }, {
      title: 'Accession',
      width: '8%'
    }, {
      title: 'Lab',
      width: '20%'
    }];
    encodeDatasource = new _encode__WEBPACK_IMPORTED_MODULE_1__["default"](columnFormat);

    loadTracks = function loadTracks(configurationList) {
      hic.Browser.getCurrentBrowser().loadTracks(configurationList);
    };

    config = {
      $modal: $('#hicEncodeModal'),
      $modalBody: $('#encodeModalBody'),
      $modalTopCloseButton: $('#encodeModalTopCloseButton'),
      $modalBottomCloseButton: $('#encodeModalBottomCloseButton'),
      $modalGoButton: $('#encodeModalGoButton'),
      datasource: encodeDatasource,
      browserHandler: loadTracks
    };
    encodeTable = new _modalTable__WEBPACK_IMPORTED_MODULE_0__["default"](config);
    encodeTable.loadData(genomeId);
  }
}

function discardEncodeTable() {
  encodeTable = undefined;
}

function loadAnnotationSelector($container, url, type) {
  var elements;
  $container.empty();
  elements = [];
  elements.push('<option value=' + '-' + '>' + '-' + '</option>');
  igv.xhr.loadString(url).then(function (data) {
    var lines = data ? igv.splitLines(data) : [];
    lines.forEach(function (line) {
      var tokens = line.split('\t');

      if (tokens.length > 1 && ("2D" === type || igvSupports(tokens[1]))) {
        elements.push('<option value=' + tokens[1] + '>' + tokens[0] + '</option>');
      }
    });
    $container.append(elements.join(''));
  }).catch(function (error) {});
}

function igvSupports(path) {
  // For now we will pretend that igv does not support bedpe, we want these loaded as 2D tracks
  if (path.endsWith(".bedpe") || path.endsWith(".bedpe.gz")) {
    return false;
  }

  var config = {
    url: path
  };
  igv.inferTrackTypes(config);
  return config.type !== undefined;
}

/***/ })

/******/ });
});
//# sourceMappingURL=bundle.js.map