### Dependencies
Juicebox dependencies.  

```html
<!-- CSS -->
<link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css">
<link rel="stylesheet" href="https://igv.org/web/beta/igv-beta.css">
<link rel="stylesheet" href="http://igv.org/web/jb/test/dist/juicebox.css">

<!-- Google fonts -- omit if using Bootstrap -->
<link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">

<!-- Javascript -->
<script src="https://igv.org/web/beta/igv-beta.min.js"></script>
<script src="http://igv.org/web/jb/test/dist/juicebox.js"></script>
```
### Usage
Create a `div` container with `id=app-container`:

```html
<div id="app-container">
<!-- Juicebox app will appear here -->
</div>
```

Add the following script in the page body

```js
<script type="text/javascript">
     document.addEventListener("DOMContentLoaded", function () {
        var appContainer = document.getElementById("app-container);
        var browser = hic.createBrowser(appContainer);
    });
</script>

```

To load a .hic map file 

```JavaScript
  
  browser.loadHicFile({
         url: url,    //  url string or File object
         name: name   //  display name for the map.  Optional, defaults to url
  }

```

To load a track

```JavaScript
  
  browser.loadTrack(config);

```
See https://github.com/igvteam/igv.js/wiki/Tracks for a description of the track config object.  The simplest possible track config contains a single property, the url.  For example

```JavaScript
  
  browser.loadTrack({url: "http://hgdownload.cse.ucsc.edu/goldenPath/hg19/encodeDCC/wgEncodeBroadHistone/wgEncodeBroadHistoneGm12878H3k4me3StdSig.bigWig"});

```

