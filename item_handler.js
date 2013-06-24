$(function(){

/*
regions : 
id | label_coords | name | maps
main_maps : 
id | name | map_rect | continent_rect
*/

// Deal with different infos incoming from the API
Item_handler = function() {
	this.regions; // Regions on the map. This also include everything in theses regions : maps & sectors
	this.main_maps = []; // Maps on the map. This only include maps that are not instances (story, ...).
	this.main_maps_names = []; // Only the names here
}

// Useless setter, just to have a better readability in the code...
Item_handler.prototype.setRegions = function(regions) {
	this.regions = regions;
}

// Initialize main maps with this
Item_handler.prototype.initMainMaps = function(maps) {
	for(var i=0; i<maps.length; i++){
		this.main_maps.push({
			'map_id': maps[i]['id'],
			'name': maps[i]['name'],
			'map_rect': [[0,0], [0,0]],
			'continent_rect': [[0,0], [0,0]]
		});
		this.main_maps_names.push(maps[i]['name']); // We also write the names only in an array
	}
}

// Get more infos about the maps : update map_rect & continent_rect
Item_handler.prototype.initRect = function(maps) {
	for(var elt in maps.maps) {
		elt = maps.maps[elt];
		// If the map is one of the main maps
		if( isIn(elt['map_name'], this.main_maps_names) ){
			// Update map_rect & continent_rect
			var place = getRow(elt['map_name'], this.main_maps);
			this.main_maps[place]['map_rect'] = elt['map_rect'];
			this.main_maps[place]['continent_rect'] = elt['map_rect'];
		}
		// Else, we do nothing
	}
}

// Return an array with the names only
Item_handler.prototype.getMapsNames = function() {
	return this.main_maps_names;
}

// Get the row for the array
function getRow(name, array) {
	for(var i=0; i<array.length; i++) {
		if (array[i]['name'] == name) return i;
	}
}

});