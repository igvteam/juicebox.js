---
layout: default
---

juicebox.js is an embeddable interactive contact map viewer for .hic files written in JavaScript and CSS.
It is based on the desktop Juicebox visualization application.  A public
instance can be found at [http://aidenlab.org/juicebox](http://aidenlab.org/juicebox).   Instructions for embedding
a juicebox.js instance can be found [here](docs/embedding).


## Quick Start guide for [aidenlab.org/juicebox](http://aidenlab.org/juicebox)

Begin by loading a contact map (hic) file using 'Load Contact Map > Select Contact Map'. The menu is searchable.
The viewer will initially open on the first chromosome in the file (e.g. 1-1).

**Navigation tips:**
* type a pair of chromosome names into the locus text box and hit return
* search by gene name by ("ADAMTS1")
* search by genome coordinates (ex "1:35,294,888-79,647,754" or "1:35,294,888-79,647,754 1:34,982,544-79,335,410")
* select a different resolution from the pulldown
* pan and zoom interactively

**Browsing tips:**
* Crosshairs: SHIFT
* Pan: Click & Drag
* Zoom: Double-click
* Sweep Zoom: ALT-Click & Drag
* Click 'Resolution' to toggle resolution lock

**Color scale:**

Heatmap pixels are colored from 0 (white) to {Color Scale} red. You can
adjust {Color scale} by entering a value in the text box or
using the - / + buttons.

**Tracks:**

Genome tracks and 2D annotations can be loaded from the "Load Tracks" menu.
The Encode option searches the database for all supported track types for supported
genomes.  This can take some time to initialize (5-10 seconds) on first use.

**Load by URL:**

Both .hic and track files can be loaded by URL.  All common genomic track
file formats are supported (bigwig, begbed, wig bedgraph, bed, gff3, and gtf).
The supported 2D annotation format is described at  https://github.com/theaidenlab/juicebox/wiki/Loading-Annotations-(Annotations-menu)#adding-2d-annotations).

**Sharing your maps:**

The visualization state can be captured and shared by using the "Share" button.





