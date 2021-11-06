---
layout: default
---

juicebox.js is an embeddable interactive contact map viewer for .hic files written in JavaScript and CSS.
It is based on the desktop Juicebox visualization application.  For developers who wish to embed juicebox.js, see the [README](https://github.com/igvteam/juicebox.js#REAME.MD)

A public juicebox.js instance can be found at [http://aidenlab.org/juicebox](http://aidenlab.org/juicebox).


## [aidenlab.org/juicebox](http://aidenlab.org/juicebox): Quick Start Guide  

Begin by loading a contact map (hic) file using `Load Contact Map > Select Contact Map`. The menu list is searchable.
The viewer will initially open on the first chromosome in the file on both axes of the map display.

### Navigation and Browsing Tips

__Navigate to locus__

* Type a pair of space-separated chromosome names into the locus text box and hit return.
* Jump to gene locus by entering a gene name, e.g. `ADAMTS1`.
* Jump to a specific locus by entering genome coordinates, e.g. `1:35,294,888-79,647,754` or `1:35,294,888-79,647,754 1:34,982,544-79,335,410`. Entering only one locus will display the same locus on both map axes.

__Pan and zoom__

* Pan by click-dragging in the map. 
* Zoom in by double-clicking on the map. 
* Sweep-zoom by holding down the ALT key while you click-drag in the map.
* Hold the SHIFT key to display crosshairs in the map, and move the cursor without holding down the mouse button.

__Change resolution__

* Select a different resolution from the pulldown menu.
* Note that changing resolution by zooming or with the resolution pulldown changes the bin size and thus the counts per bin. This necessitates a scale change.
* Click on the lock icon to fix the resolution at its current value when zooming.

### Contact Map Color Scale

* By default, the contact map is drawn as a red heatmap, with pixel colors ranging from white (for map value = 0) to red (for a specified max map value). 
* You can adjust the max map value by entering a value in the text box or using the - / + buttons. 
* To use a different color for the heatmap, click on the red square next to the color value box and select a color from the palette that pops up.

### Tracks

* Genome tracks and 2D annotations can be loaded from the `Load Tracks` menu.
* The ENCODE option searches a database for all supported track types for supported genomes. This can take some time to initialize (5-10 seconds) on first use.
* To manage properties of loaded tracks, click on the 3-line icon in the upper-right corner of the map panel and then click on `Tracks` or `2D Annotations`. A panel will pop up that will all you to change track colors, rearrange the track order, and remove tracks.

### Load Local File or by URL

In addition to the provided menus, .hic contact map files and track files can also be loaded from the local file system or by URL.  All common genomic track file formats are supported (bigwig, begbed, wig bedgraph, bed, gff3, and gtf).
The supported 2D annotation format is described in the [desktop Juicebox documentation](https://github.com/theaidenlab/juicebox/wiki/Loading-Annotations-(Annotations-menu)#adding-2d-annotations).

### Multiple Maps

View and compare two or more maps. Click on the `+` button above the map panel to create a new empty panel, and load another contact map. Note that all maps must be based on the same genome assembly. 

### Sharing Your Maps

For users of hosted instances at [aidenlab.org](https://aidenlab.org/juicebox] or [igv.org](https://igv.org/juicebox) the visualization state can be captured and shared by using the `Share` button.  The generated URLs encapsulate the current state of the application with the exception of locally loaded files (that is, files loaded from the user's local file system).  Files shared via juicebox URLs can be public or private, and can be shared with anyone who has access to the files.  The URLs do not have an expiration date.





