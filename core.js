// Global
var gw2map;
var loading_finished = false;

$(function(){

	$('#map').html('<span id="loadinggif"><img src="imgs/loading.gif" alt="loading image" style="top:50%;left:50%;position:absolute;"></span>');

	// Display the list of servers :
	$.getJSON('https://api.guildwars2.com/v1/world_names.json', function(data) {
			var i = 0;

			// Clear the select
			$('#servers_list').find('option').remove('');

			$(data).each(function(){
				$('#servers_list').append('<option value='+data[i]['id']+'>'+data[i]['name']+'</option>')
				i++;
			});

			// Create the handler
			var items_handler = new Item_handler();

			// Also get infos for the events : 
			$.getJSON('https://api.guildwars2.com/v1/event_details.json', function(data){
				items_handler.initEventsInfos(data);

				// Display the map
				gw2map = new Map(items_handler);
				gw2map.initMap();

				loading_finished = true;
			});
	});

});

function load_events() {
	if (loading_finished) {
		// Display events 
		get_gw2_events($('#servers_list').find(':selected').val(), function(events_list) {
			// Display on the screen
			gw2map.showEvents(events_list);
		});
	}
}

// Useful
function isIn(element, array) {
	for(var it=0; it<array.length; it++) {
		if (array[it] == element) return true;
	}
	return false;
}