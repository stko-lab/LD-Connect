/* globals dd replace_app */

async function module_author_map() {

	$("#home").removeClass("active");
	$("#streamgraph").removeClass("active");
	$("#keywordgraph").removeClass("active");
	$("#simpap").removeClass("active");
	$("#simauthor").removeClass("active");
	$("#authormap").addClass("active");
	$("#countrycollab").removeClass("active");

	let s_info = `
		This module shows the institution locations for all authors
		through the history of the selected journal. At a global view, locations are
		clustered.  Zoom in to view the locations of authors and click a marker
		for more information on the author at that location.
	`;


	replace_app([
		dd('#author_map:'+s_info, {
			style: /* syntax: css.style */ `text-align: justify; float: left; color: #fff;`,
		}),
		dd('#watercolor.map', {
			style: /* syntax: css.style */ `border-radius: 4px; width: 100%; height: 500px;`,
		}),
		// dd('#author_map_loading', [
		// 	dd('img', {
		// 		src: '/img/loading.gif',
		// 	}),
		// ]),
	]);

	$('#app').hide().html($('#app').innerHTML).fadeIn('slow');

	const S_LAYER = 'watercolor';
	let y_map_authors = new L.Map(S_LAYER, {
		center: new L.LatLng(35.26, 2.6),
		zoom: 2
	});

	y_map_authors.addLayer(new L.StamenTileLayer(S_LAYER, {
		detectRetina: true
	}));

	let a_authors = await query(/* syntax: sparql */ `
		select ?author ?org_name ?wkt {
			?author
				iospress:contributorAffiliation ?org ;
				.

			?org iospress:geocodingInput ?org_name .

			?org iospress:geocodingOutput/ago:geometry/geosparql:asWKT ?wkt .

			values ?author {
				${Object.keys(h_authors).map(s => `<${s}>`).join('\n')}
			}
		}
	`);

	let y_markers = new L.MarkerClusterGroup();
	let a_markers = [];

	let b_results = false;
	for(let g_row of a_authors) {
		b_results = true;

		let g_feature = wkt_parse(g_row.wkt.value);
		let a_crds = g_feature.geometry.coordinates;

		let y_marker = new L.marker([a_crds[1], a_crds[0]])
			.bindPopup(dd('.popup', [
				dd('b:'+h_authors[g_row.author.value].name),
				dd('br'),
				dd('span:'+g_row.org_name.value),
			]));

		a_markers.push(y_marker);
		y_markers.addLayer(y_marker);
	}

	y_map_authors.addLayer(y_markers);

	//$('#author_map_loading').fadeOut();
}
