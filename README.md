# BMHCmap
Map exhibit for the Brethren Mennonite Heritage Center, Harrisonburg, VA

There are two html pages: index.html, which is the map data editor, and mapDisplay.html, which is the map display engine.

Data Files:

	Used by both the data editor and the map display:
		
		bmhcTags.js
		is a list of all accepted tags. This file defines the set of tags that users of the data editor can use to describe assemblies. The administrator is free to add tags to this file with any text editor. The map display also reads this file to populate its pulldown list of tags.

	For the data editor:
	
		bmhcData.js
		contains all the information on "assemblies" (congregations, districts, 
		conferences, and etc.) and the various events comprising their histories
		(their location, membership, affiliations, perhaps some photos, etc.).
		The purpose of the data editor is to edit and add to this file.

	For the map display: These files are compiled from bmhcData.js, as described in the suite.
	
		map.geojson 
		is what drives the map display.

		mapAffiliations.js
		is a list of all affiliations so that the mapDisplay can list them as filter choices. 
		The same compiler as produces map.geojson also produces this file.
		
	

Work flow:

Files: The data editor reads file bmhcData.js and bmhcTags.js, and 
permits you to download the file bmhcDataX.js.

The map display engine reads file map.geojson which determines what shows up on the map, 
and file mapAffiliations.js which gives it the pulldown list of affiliation options.
 
The data editor (index.html) reads the file bmhcData.js,
but only permits you to download a file (with the additions and changes you have made)
called bmhcDataX.js. To get your data reflected in the map you must email your file (bmhcDataX.js)
to the map administrator. They will integrate it into a new bmhcData.js.

The administrator must not only upgrade bmhcData.js, they must then compile it into 
the format required by the map display. For that they do

    node compileDataToGeojson.js

which reads bmhcData.js and writes mapX.geojson and mapAffiliationsX.js. The administrator 
should verify that all is well by comparison with the existing map.geojson 
and mapAffiliations.js.
If so, they should upgrade map.geojson to a copy of the new mapX.geojson, and 
ditto mapAffiliations.js.

Subsequently the map display engine will reflect the new data.

