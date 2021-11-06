# juicebox.js

juicebox.js is an embeddable interactive contact map viewer for .hic files written in JavaScript and CSS. It is based 
on the desktop Juicebox visualization application. 

A public instance of [juicebox-web](https://github.com/igvteam/juicebox-web), a web application embedding a juicebox.js viewer, 
can be found at [https://aidenlab.org/juicebox](http://aidenlab.org/juicebox).  User documentation for the web
application can be found [here](https://igvteam.github.io/juicebox.js/).

# Quickstart

## Installation

juicebox.js consists of a single javascript file with no external dependencies.  

Pre-built files for ES5 (igv.min.js) and ES6 (igv.esm.min.js)
can be downloaded from [https://cdn.jsdelivr.net/npm/juicebox.js@2.2.0/dist/](https://cdn.jsdelivr.net/npm/juicebox.js@2.2.0/dist/). 

To import igv as an ES6 module

```javascript
import juicebox from "https://cdn.jsdelivr.net/npm/juicebox.js@2.2.0/dist/juicebox.esm.js";
``` 

Or as a script include (defines the "juicebox" global)

```html
<script src="hhttps://cdn.jsdelivr.net/npm/juicebox.js@2.2.0/dist/juicebox.min.js"></script>
```   
 
Alternatively you can install with npm  
 
 ```npm install juicebox```

and source the appropriate file for your module system (juicebox.min.js or juicebox.esm.js)  in node_modules/igv/dist.

## Usage

To create an juicebox instance supply a container div  and an initial configuration  

This function returns a promise for an **hicBrowser** object which can used to control the view.  For example, to open
a juicebox instance on a ENCODE hic file with associated CTCF track

```
   const config = {
        url: "https://www.encodeproject.org/files/ENCFF718AWL/@@download/ENCFF718AWL.hic",
        name: "GM12878",
        //locus: "22:33,319,567-36,009,566",   // <= optional initial locus
        tracks: [
            {
                url: "https://www.encodeproject.org/files/ENCFF000ARJ/@@download/ENCFF000ARJ.bigWig",
                name: "CTCF",
                min: 0,
                max: 25,
                color: "#ff8802"
            }
        ]
    }
    const container = document.getElementById("app-container");
    juicebox.init(container, config)
        .then(function (hicBrowser) {
            console.log("Juicebox loaded");
        })

```


## Development

### Requirements

Building juicebox.js requires Linux or MacOS, and  [node.js](https://nodejs.org/).

Other Unix environments will probably work but have not been tested.  Windows users can use [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

### Building

```  
git clone https://github.com/igvteam/juicebox.js.git
cd juicebox.js
npm install
npm run build
```

This creates a dist folder with the following files

* juicebox.js - ES5 compatible file.  A script include will define the "juicebox" global.
* juicebox.min.js - minified version of juicebox.js
* juicebox.esm.js --  ES6 module 
* css -- folder containing required css file **juicebox.css** and associated images


# Supported Browsers

juicebox.js require a modern web browser with support for Javascript ECMAScript 2015. 

# License


juicebox.js is [MIT](/LICENSE) licensed.


