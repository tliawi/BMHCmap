# BMHCmap
Map exhibit for the Brethren Mennonite Heritage Center, Harrisonburg, VA

Work flow:

There are two html pages: index.html, which is the map data editor, and mapDisplay.html, which
is the map display engine.

Files: The data editor reads file bmhcData.js, and permits you to download the file bmhcDataX.js.
The map display engine reads file map.geojson which determines what shows up on the map.
File map.geojson is derived from bmhcData.js as described below.

File bmchData.js contains all the information on "assemblies" (congregations, and their affiliated 
districts, conferences, and etc.) and the various events comprising their histories
(their location, membership, affiliations, perhaps some photos, etc.).
 
The data editor (index.html) reads the file bmhcData.js,
but only permits you to download a file (with the additions and changes you have made)
called bmhcDataX.js. To get your data reflected in the map you must email your file (bmhcDataX.js)
to the map administrator. They will integrate it into a new bmhcData.js.

The administrator must not only upgrade bmhcData.js, they must then compile it into the format required
by the map display. For that they do

    node compileDataToGeojson.js

which reads bmhcData.js and writes mapX.geojson. Again, verify that all is well
by comparison with the existing map.geojson.
If so, upgrade map.geojson to a copy of the new mapX.geojson.
Subsequently the map display engine will reflect the new data.

