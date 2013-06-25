$(function(){

Map = function(item_handler) {
	console.log('Map object.');
	this.map; // The leaflet map

	this.item_handler = item_handler; // Class that handles items on the map (names, regions, sectors, ...)

	this.markerLayer; // Markers for the events
}

// Create and show the map
Map.prototype.initMap = function() {
	// Create the map
	this.map = new L.map('map', {
		minZoom: 0,
		maxZoom: 7,
		crs: L.CRS.Simple
	}).setView([0, 0], 0);

	// Define some restrictions
	var southWest, northEast;
	southWest = unproject([0, 32768], this.map);
	northEast = unproject([32768, 0], this.map);
	this.map.setMaxBounds(new L.latLngBounds(southWest, northEast));

	// Put some cool pictures on it
	var tilesUrl = 'https://tiles.guildwars2.com/1/1/{z}/{x}/{y}.jpg'; //Tiles given by Anet :)
	
	var layer = new L.tileLayer(tilesUrl, {
		minZoom : 0,
		maxZoom: 7,
		continuousWorld: true
	});

	// Get regions infos
	var _this = this;
	$.getJSON('https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=1', function(data){
		_this.item_handler.setRegions(data.regions); // Put them in the handler

		// Get maps names
		$.getJSON('https://api.guildwars2.com/v1/map_names.json', function(data){
			_this.item_handler.initMainMaps(data); // Init the handler with these maps

			// Now, we can send everything to the handler, it'll sort the datas and only keep the
			// main maps infos

			// Get maps infos
			$.getJSON('https://api.guildwars2.com/v1/maps.json', function(data){
				_this.item_handler.initRect(data); // The handler just get the infos it wants about the main maps
			
				// Continue the story, the app is not finished to be loaded
				_this.map.addLayer(layer);
				return _this.showNames();
			});
		});
	});
}

// Show names of regions, maps on the global map
Map.prototype.showNames = function() {

	_this = this; // Cool thing, avoid insane Object-ception for the developer :/
	var marker, displayed_sectors = [];

	for (var region in this.item_handler.regions) {
		region = this.item_handler.regions[region];
		createMarker('region_name', region['name'], unproject(region['label_coord'], this.map), this.map);


		// Init maps for the region
		for (var game_map in region.maps) {
			game_map = region.maps[game_map];

			// The API gives also names of 'scenario' maps like 'The Scene of the Crime' in Lion's Arch.
			// So, we don't display them by checking if they are in the map_names.json file
			if ( isIn(game_map['name'], this.item_handler.getMapsNames()) ) {
				var bounds_sw = unproject(game_map['continent_rect'][0], this.map); 
				var bounds_ne = unproject(game_map['continent_rect'][1], this.map);
				var dim = new L.latLngBounds(bounds_sw, bounds_ne) ; // Dimensions of the map
				createMarker('gamemap_name', game_map['name'], dim.getCenter(), this.map);
				$('.gamemap_name').css('visibility', 'hidden'); // We hide it for the suprise if we zoom
			}

			// Init map with sectors
			for (var sector in game_map.sectors) {
				sector = game_map.sectors[sector];
				
				// Sometimes, there are repeated sectors for personal story maps. We just have to check 
				// if the sector is already displayed.
				if(!isIn(sector['name'], displayed_sectors)) {
					createMarker('sector_name', sector['name'], unproject(sector['coord'], this.map), this.map);
					$('.sector_name').css('visibility', 'hidden'); // Same logic as gamemap's

					// Finally, add to the list
					displayed_sectors.push(sector['name']);
				}
			} 
		}
	}

	// We also can delete the loading gif
	$('#loadinggif').remove();

	return this.zoomHandler();
}

// Regulate display of names
Map.prototype.zoomHandler = function() {
	_this = this; // Cool thing, avoid insane Object-ception for the developer :/

	this.map.on('zoomend', function(e){

		// Regions : Kryta, Orr, ...
		if(_this.map.getZoom() > 3) {
			$('.region_name').css('visibility', 'hidden');
		}
		else if(_this.map.getZoom() <= 3) {
			$('.region_name').css('visibility', 'visible');
		}

		// Maps : Queensdale, Caledon Forest, ...
		if(_this.map.getZoom() > 3 && _this.map.getZoom() <= 5) {
			$('.gamemap_name').css('visibility', 'visible');
		}
		else if(_this.map.getZoom() <= 3 || _this.map.getZoom() > 5) {
			$('.gamemap_name').css('visibility', 'hidden');
		}

		// Sectors : Trader's Forum, Troll's Teeth
		if(_this.map.getZoom() > 5) {
			$('.sector_name').css('visibility', 'visible');
		}
		else if(_this.map.getZoom() <= 5) {
			$('.sector_name').css('visibility', 'hidden');
		}
	});

	this.map.on('click', function(e){
		console.log('click on : ', e.latlng.toString());
	});
}

// Show events on the map
Map.prototype.showEvents = function(events) {
	
	if(this.markerLayer) this.markerLayer.clearLayers(); // Clear the map before

	var icon_active = createCustomIcon('active'),
		icon_warmup = createCustomIcon('warmup'),
		icon_success = createCustomIcon('success'),
		icon_fail = createCustomIcon('fail'),
		icon_preparation = createCustomIcon('preparation');

	// events  : event_id, event_name, event_status, map_name, map_id
	var markers_array = [];
	// Iteration over all the event and computing :)
	for(var event_obj in this.item_handler.events_infos) {
		event_id = event_obj; // Id of the event
		event_obj = this.item_handler.events_infos[event_obj]; // Datas about the event
		// Get infos about the map where the event is
		map_event = this.item_handler.main_maps[this.item_handler.getMapName(event_obj['map_id'])];
		
		// Compute the location, simple algebra
		event_center_x = event_obj['location']['center'][0];
		event_center_y = event_obj['location']['center'][1];
		
		percentageX = (event_center_x - map_event['map_rect'][0][0]) / (map_event['map_rect'][1][0] - map_event['map_rect'][0][0]);
		percentageY = 1-(event_center_y - map_event['map_rect'][0][1]) / (map_event['map_rect'][1][1] - map_event['map_rect'][0][1]);
		continentX = (map_event['continent_rect'][0][0] + (map_event['continent_rect'][1][0] - map_event['continent_rect'][0][0]) * percentageX);
		continentY = (map_event['continent_rect'][0][1] + (map_event['continent_rect'][1][1] - map_event['continent_rect'][0][1]) * percentageY);


		event_coords = unproject([continentX, continentY], this.map); // Finally : the coords for the event

		// Create a marker

		// if the event is *** and the option *** is checked
		if(events[event_id]['event_status'] == 'Active' && $('#active_events').is(':checked')) {
			markers_array.push(L.marker(event_coords, {icon: icon_active}).bindPopup('<span class=\'event_active\'>'+event_obj['name']+'</span>'));
		}
		else if(events[event_id]['event_status'] == 'Warmup' && $('#warmup_events').is(':checked')) {
			markers_array.push(L.marker(event_coords, {icon: icon_warmup}).bindPopup('<span class=\'event_warmup\'>'+event_obj['name']+'</span>'));
		}
		else if(events[event_id]['event_status'] == 'Success' && $('#succeeded_events').is(':checked')) {
			markers_array.push(L.marker(event_coords, {icon: icon_success}).bindPopup('<span class=\'event_success\'>'+event_obj['name']+'</span>'));
		}
		else if(events[event_id]['event_status'] == 'Fail' && $('#failed_events').is(':checked')) {
			markers_array.push(L.marker(event_coords, {icon: icon_fail}).bindPopup('<span class=\'event_fail\'>'+event_obj['name']+'</span>'));
		}
		else if(events[event_id]['event_status'] == 'Preparation' && $('#preparation_events').is(':checked')) {
			markers_array.push(L.marker(event_coords, {icon: icon_preparation}).bindPopup('<span class=\'event_preparation\'>'+event_obj['name']+'</span>'));
		}
	}
	this.markerLayer = L.layerGroup(markers_array);
	this.map.addLayer(this.markerLayer);
		
}

// Need to change the form of the coords
function unproject(coords, map) {
	return map.unproject(coords, map.getMaxZoom());
}

// Create a marker : className, name, coords, map
function createMarker(html_class_name, html_name, coords, on_this_map) {
	// Text displayed
	var icon_text = L.divIcon({
		className: html_class_name,
		html: html_name
	});
	// Create the marker
	var marker = L.marker(coords, {icon: icon_text});
	return marker.addTo(on_this_map);
}

function createCustomIcon(state) {
	if (state == 'active') return L.icon({iconUrl: './imgs/event_active.png', popupAnchor:[10,10]});
	else if(state == 'warmup') return L.icon({iconUrl: './imgs/event_warmup.png', popupAnchor:[10,10]});
	else if(state == 'success') return L.icon({iconUrl: './imgs/event_success.png', popupAnchor:[10,10]});
	else if(state == 'fail') return L.icon({iconUrl: './imgs/event_fail.png', popupAnchor:[10,10]});
	else if(state == 'preparation') return L.icon({iconUrl: './imgs/event_preparation.png', popupAnchor:[10,10]});
}

});