This pages documents the juicebox.js URL structure.  Note this is in active development and subject to change.

Note:  all parameter values must be URL encoded

Parameter | Description
--------- | -----------
hicUrl  | url to the current .hic file 
state  | string encoding current state of the map  (optional, see below)  
colorScale | max value and rgb components of the map color scale   (optional, see below)
track | string encoding url to tracks and associated state (optional, see below)


### state - comma separated string with following tokens

token | description
----- | ----------
1  | index of x axis chromosome.  Whole genome is represented by 0,  chr1 by index 1, chr2 index 3, etc
2  | index of y axis chromosome.
3  | index of resolution level,  lowest resolution is index 0
4  | x position of map origin in bins
5  | y position of map origin in bins
6  | pixel size  (size of each bin in screen pixels)
7  | normalization 

### colorScale - comma separated with 4 fields.  The color scale ranges from 0 (white) - max (color)
token | description
----- | -----------
1 | max value (contact map value at maximum color intensity)
2 | red component of max color (0-255)
3 | green component of max color (0-255)
4 | blud component of max color (0-255)

### track -  string encoding all tracks, with each track section delimited by triple bars ("|||").  Track fields are delimited by a single bar ("|") with the following tokens.

token | description
----- | --------
1  | url to the track file
2  | data range as a dash delimited string  (e.g. 0-50)
3  | color string, any javascript recognized color declaration (e.g.  "rgb(100, 0, 0)"
