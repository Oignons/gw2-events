$(function(){

Map = function() {
	console.log('Map object.');
	this.map; // The leaflet map
	this.regions; // Regions on the map
	this.map_names = [];
	this.markers_region_array = [];
	this.markers_maps_array = [];
	this.markers_sector_array = [];
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
		_this.regions = data.regions;
		// Get maps names
		$.getJSON('https://api.guildwars2.com/v1/map_names.json', function(data){
			$(data).each(function(i) {
				_this.map_names.push(data[i]['name']);
			});


			// Continue the story
			_this.map.addLayer(layer);
			return _this.showNames();
		});
	});

};

// Show names of regions, maps on the global map
Map.prototype.showNames = function() {

	_this = this; // Cool thing, avoid insane Object-ception for the developer :/
	var marker, displayed_sectors = [];

	for (var region in this.regions) {
		region = this.regions[region];

		// Display text
		var region_text = L.divIcon({
			className: 'region_name',
			html: region['name']
		});
		marker = L.marker(unproject(region['label_coord'], this.map), {icon: region_text});
		this.markers_region_array.push({
			'name': region['name'],
			'marker': marker
		});
		marker.addTo(this.map);

		// Init maps for the region
		for (var game_map in region.maps) {
			game_map = region.maps[game_map];

			// The API gives also names of 'scenario' maps like 'The Scene of the Crime' in Lion's Arch.
			// So, we don't display them by checking if they are in the map_names.json file
			if ( isIn(game_map['name'], this.map_names) ) {
				// Text
				var gamemap_text = L.divIcon({
					className: 'gamemap_name',
					html: game_map['name']
				});
				// Area
				var bounds_sw = unproject(game_map['continent_rect'][0], this.map); 
				var bounds_ne = unproject(game_map['continent_rect'][1], this.map);
				var dim = new L.latLngBounds(bounds_sw, bounds_ne) ; // Dimensions of the map
				marker = L.marker(dim.getCenter(), {icon: gamemap_text}); // Center the text
				this.markers_maps_array.push({
					'name': game_map['name'],
					'marker': marker
				});
				marker.addTo(this.map);
				$('.gamemap_name').css('visibility', 'hidden'); // We hide it for the suprise if we zoom
			}

			// Init map with sectors
			for (var sector in game_map.sectors) {
				sector = game_map.sectors[sector];
				
				// Sometimes, there are repeated sectors for personal story maps. We just have to check 
				// if the sector is already displayed.
				if(!isIn(sector['name'], displayed_sectors)) {
					// Text
					var sector_text = L.divIcon({
						className: 'sector_name',
						html: sector['name']
					});
					marker = L.marker(unproject(sector['coord'], this.map), {icon: sector_text});
					this.markers_sector_array.push({
						'name': sector['name'],
						'marker': marker
					});
					marker.addTo(this.map);
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

		// Maps : Queens Dale, Caledon Forest, ...
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
}

// Show events on the map
Map.prototype.showEvents = function(events) {

	/*
	var rect, area, dim;
	// Style
	var rect_style = {
		color: "grey",
		fill: true,
		fillOpacity: 0.2
	}
	// Map
	var map = this.map;
	$.getJSON('areas.json', function(data){
		$(data).each(function(iter) {
			// data[iter] : area
			area = data[iter];
			// Dimension
			dim = new L.latLngBounds(L.latLng(area['swLat'], area['swLng']), L.latLng(area['neLat'], area['neLng']));
			// Add each area with a rectangle
			rect = new L.rectangle(dim, rect_style);
			// Add some cool stuff here
			var marker = L.marker(dim.getCenter()).addTo(map);
			marker.on('click', function(e) {
				// Show events : marker.bindPopup('Hello !').openPopup();
				// data[iter]['id'] and events[it][3] for the IDs
				event_on_map_html = ''; // Html to show
				$(events).each(function(it) {
					// If the event is on the map
					if (events[it][3] ==  data[iter]['id']) { // Check if the event is on the map
						// Check if the event is active and the option is checked
						if(events[it][1] == 'Active' && $('#active_events').is(':checked')) {
							event_on_map_html += '<span class=\'event_active\'>'+events[it][0]+'</span><br/>';
						}
						// Same for warmup
						else if(events[it][1] == 'Warmup' && $('#warmup_events').is(':checked')) {
							event_on_map_html += '<span class=\'event_warmup\'>'+events[it][0]+'</span><br/>';
						}
						// Same for success, fail & preparation
						else if(events[it][1] == 'Success' && $('#succeeded_events').is(':checked')) {
							event_on_map_html += '<span class=\'event_success\'>'+events[it][0]+'</span><br/>';
						}
						else if(events[it][1] == 'Fail' && $('#failed_events').is(':checked')) {
							event_on_map_html += '<span class=\'event_fail\'>'+events[it][0]+'</span><br/>';
						}
						else if(events[it][1] == 'Preparation' && $('#preparation_events').is(':checked')) {
							event_on_map_html += '<span class=\'event_preparation\'>'+events[it][0]+'</span><br/>';
						}
					}
				});
				marker.bindPopup(event_on_map_html).openPopup();
			});
			// Add the rectangle to the map
			rect.addTo(map);
		});
	});*/
	
}

// Need to change the form of the coords
function unproject(coords, map) {
	return map.unproject(coords, map.getMaxZoom());
}

// Useful
function isIn(element, array) {
	for(var it=0; it<array.length; it++) {
		if (array[it] == element) return true;
	}
	return false;
}

});