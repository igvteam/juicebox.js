# Embedding juicebox.js

juicebox.js is an embeddable JavaScript component for visualization of contact maps in the .hic format.  This page describes steps for embedding a map in a
web page.  The embedded map has an API for loading maps and tracks, but
does not contain menus to load these tracks.   For a prototype web page
complete with load menus and an embedded map click [here](site).

**Current release:** [0.9.2](https://igv.org/web/jb/release/0.9.2).

### Summary

1. Create an empty div element into which juicebox will embed itself.  In the examples
below the div has the id `juicebox-container`.

2. Execute JavaScript after the document has loaded to create a juicebox browser object and embed itself into the container created in step 1.   This is usually
executed from a document `DOMContentLoaded` event listener or, if using
jQuery,  a `$.ready()` function.

3. Use the browser object API to load maps and tracks.


### Dependencies

Juicebox dependencies are listed below.   The exact URLs to IGV and Juicebox
will vary depending on the version you are using.

```html
<!-- CSS -->
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://igv.org/web/beta/igv-beta.css">
<link rel="stylesheet" href="http://igv.org/web/jb/release/0.9.2/juicebox-0.9.2.css">

<!-- Google fonts -- omit if using Bootstrap -->
<link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">

<!-- Javascript -->
<script src="https://igv.org/web/beta/igv-beta.min.js"></script>
<script src="https://igv.org/web/jb/release/0.9.2/juicebox-0.9.2.min.js"></script>
```

### Usage

Create a `div` container for the Juicebox appliction.

```html
<div id="juicebox-container">
<!-- Juicebox app will appear here -->
</div>
```

Add the following script in the page body.  In this example the Juicebox browser
is attached to the `window` object (global scope) but this is not required.
See the Browser API section below for configuration options.

```js
<script type="text/javascript">
     document.addEventListener("DOMContentLoaded", function () {
        var appContainer, config;

        appContainer = document.getElementById("juicebox-container");
        config = {};

        window.juiceboxBrowser = hic.createBrowser(appContainer, config);
    });
</script>
```


### Browser API

#### Browser configuration options

The second argument to `hic.createBrowser` is an optional configuration object.  All properties are optional.

Name  | Description
:------------- | :-------------
**url**  | URL to a .hic file
**name**| Name of the initial dataset specified in the URL property
**state**| String encoding the intial state  (see below)
**colorScale** | String encoding the initial color scale (see below)
**tracks** | Array of track configuration objects.  See <https://github.com/igvteam/igv.js/wiki/Tracks> for a description of the track config object.

**state** string (comma delimited list):

```
index of chromosome 1,
index of chromosome 2,
index of resolution,
x (left), [position of map origin in bin coordinates]
y (top), [position map origin in bin coordinates]
pixelSize, [size of each map bin in screen pixels]
normlization
```
**colorScale** string (comma delimited list):

```
contact count at maximum intensity,
red component at maximum intensity,
green commponent at maximum intensity,
blue component at maximum intensity
```


#### To load a .hic map file

```js 
juiceboxBrowser.loadHicFile({
    url: url,    //  url string or File object
    name: name   //  display name for the map.  Optional, defaults to url
})

```


#### To load tracks


```JavaScript
  juiceboxBroswer.loadTracks([config1, config2, ...]);

```

See <https://github.com/igvteam/igv.js/wiki/Tracks> for a description of the track config object.  The simplest possible track config contains a single property, the URL.  For example


```JavaScript
  
  juicboxBowser.loadTracks([{
     url: "http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneGm12878H3k4me3StdSig.bigWig"
  }]);

```

