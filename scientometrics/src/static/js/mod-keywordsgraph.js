var H_FULLKEYWORDS = {};
var D_SVG_DIV;
var s_current_year = '2013';


// load this module into dom container
async function loadKeywordGraph() {

	$("#home").removeClass("active");
	$("#streamgraph").removeClass("active");
	$("#keywordgraph").addClass("active");
	$("#simpap").removeClass("active");
	$("#simauthor").removeClass("active");
	$("#authormap").removeClass("active");
	$("#countrycollab").removeClass("active");

	var d_app = $('#app')[0];
	$('#app').html("");

	$('<div class="module-info" style="text-align:justify; float:left;color:#fff;width:1024px;"></div>')
		.text("This module shows the relationship between papers through shared keywords.  Hover over a node to see information about a paper and its keywords. Follow an edge to reach another paper with matching keywords. This force-based graph tries to reach equilibrium by repelling nodes (which represent papers) that occupy the same space, linked together by matching keywords.  Given the sheer number of keywords, the data have been split by years.  Select from the buttons shown below.")
		.appendTo(d_app);

	$("#app").hide().html($("#app").innerHTML).fadeIn('slow');

	// $('<div id="loading"><img src="/img/loading.gif"/></div>')
	// 	.appendTo(d_app);

	// initialize controls
	var q_controls = $('<div style="text-align:center"></div>').appendTo(d_app);

	// initialize svg container
	D_SVG_DIV = $('<div></div>').appendTo(d_app).get(0);

	// paper title box
	$('<div id="kg-paper-title">.</div>').appendTo(d_app);

	// authors list
	$('<div id="kg-authors"></div>').appendTo(d_app);

	// load search controls
	add_searching(d_app);

	function sort_object(obj) {
    	items = Object.keys(obj).map(function(key) {
        		return [key, obj[key]];
    	});
    	items.sort(function(first, second) {
        	return second[1] - first[1];
    	});
    	sorted_obj={};
    	$.each(items, function(k, v) {
        	use_key = v[0];
        	use_value = v[1];
        	sorted_obj[use_key] = use_value;
    	})
    	return(sorted_obj);
	}

	let s_years = [];
	let unique_years = {};

	for(let key of Object.keys(h_papers)){
		if(h_papers[key].keywords.length >= 1){
			s_years.push(h_papers[key].year);
		}
	}

	// create a list of year with count						
	for (var item of s_years) {
  		unique_years[item] = unique_years[item] ? unique_years[item] + 1 : 1;
	}

	for (let [year, count] of Object.entries(sort_object(unique_years))){

		// remove year labels with too few publications
		if(count >= 10){
			$('<div data-year="'+year+'" class="keywordyear" style="width:51px">'+year+'</div>')
			.click(function() {

				// remove active class from sibling
				$(this).siblings('.active').removeClass('active');

				// take over active state
				$(this).addClass('active');

				s_current_year = $(this).attr('data-year');

				// trigger graph
				query_papers($(this).attr('data-year'), load_graph);
			})
			.appendTo(q_controls);
		}
	}
	//$('#loading').fadeOut();
};


// empty the div
function blank_app() {
	return $(D_SVG_DIV).empty().get(0);
}

//
function add_searching(d_app) {

}

// query by year
function query_papers(s_current_year, f_okay) {
	
	// convert h_papers hash into array
	var a_papers = [];
	for(let key of Object.keys(h_papers)){
		if(h_papers[key].year == s_current_year){
			if(h_papers[key].keywords.length >= 1){
				a_papers.push(h_papers[key]);
			}					
		}		
    };
    // add links key-value pair to a_papers
    for(var i=0; i<a_papers.length; i++) {
    	Object.assign(a_papers[i], {links: 0});
	}

	// extract keywords to H_FULLKEYWORDS 
	a_papers.forEach(function(h_row) {
		var s_paper_id = h_row.id;
		if(s_paper_id != 'undefined'){
			var a_fullkeywords = H_FULLKEYWORDS[s_paper_id];
			if(!a_fullkeywords) a_fullkeywords = H_FULLKEYWORDS[s_paper_id] = [];

			var s_fullkeyword = h_row.keywords;
			a_fullkeywords.push(s_fullkeyword);
		}
	});

	// match keywords between every pair
	var a_links = match_keywords(a_papers);

	for(var i=0; i<a_links.length; i++) {
		var h_link = a_links[i];
		a_papers[h_link.source].links += 1;
		a_papers[h_link.target].links += 1;
	}

	a_papers.forEach(function(h_paper) {
		h_paper.weight = 1 / h_paper.links;
	});

	// construct force graph
	f_okay(a_papers, a_links);
}


// construct d3 force-based graph
function load_graph(h_nodes, h_links) {
 
	var width = 1024;
	var height = 600;

	var svg = d3.select(blank_app()).append('svg')
		.attr('width', width)
		.attr('height', height);

	// initialize tooltip
	var tip = d3.tip().attr('class', 'keyword-node-title').html((EVENT, d) => {
		if(H_FULLKEYWORDS[d.id]){
			var a_keywords_display = H_FULLKEYWORDS[d.id][0];
			//console.log('H_FULLKEYWORDS['+d.id+'] = ', H_FULLKEYWORDS[d.id][0]);
			// pop-up window of keywords
			return d.links+' paper'+(d.links !== 1? 's': '')+' share'+(d.links === 1? 's': '')+' similar keywords<br />This paper has '+(a_keywords_display.length)+' keyword'+(a_keywords_display.length !== 1? 's': '')+': <br />&bull; '+a_keywords_display.join('<br />&bull; ');	
		}
	});
	svg.call(tip);


	// find maximum number of links any node has
	var max_links = d3.max(h_nodes, function(d) {
		return d.links;
	});

	// find maximum number of keywords any node has
	var max_keywords = d3.max(h_nodes, function(d) {
		return d.keywords.length;
	});


	// create color scale for num links
	var color = d3.scaleSqrt()
		.domain([0, max_links*Math.pow(0.5, 2), max_links])
		.range(['blue','white','red']);

	// create radius scale for num keywords
	var radius = d3.scaleSqrt()
		.domain([1, max_keywords])
		.range([2, 9]);


	//
	var force = d3.forceSimulation(h_nodes)
		.force("charge", d3.forceManyBody().strength(-20))
		.force("link", d3.forceLink(h_links))
		.force("center", d3.forceCenter(width/2, height/2));
		//.charge(-30)
		//.linkDistance(185)
		//.size([width, height])
		//.nodes(h_nodes)
		//.links(h_links)
		//.start();

	//
	var link = svg.selectAll('.link')
		.data(h_links)
		.enter().append('line')
			.attr('class', 'link')
			.style('stroke-width', function(d) {
				return Math.sqrt(d.value);
			});

	var f_rdx = function(d) { return d.x };
	var f_rdy = function(d) { return d.y };

	//
	var node = svg.selectAll('.node')
		.data(h_nodes)
		.enter().append('circle')
			.attr('class', 'node')
			.attr('r', function(d) {
				return radius(d.keywords.length * 2);
			})
			.style('fill', function(d, i) {
				return color(d.links);
			})
			.call(d3.drag())
			.on('mouseover', (EVENT, d) => {
				tip.show(EVENT, d);
				$('#kg-paper-title').text(d.title+' ('+s_current_year+')');
				$('#kg-authors').empty();
				for(let name of d.author_names){
					$('<span />').text(name).appendTo('#kg-authors');
				}
			})
			.on('mouseout', tip.hide);


	//
	force.on('tick', function() {
		link
			.attr('x1', function(d) { return d.source.x; })
			.attr('y1', function(d) { return d.source.y; })
			.attr('x2', function(d) { return d.target.x; })
			.attr('y2', function(d) { return d.target.y; });
		node
			.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; });
	});

	// var legend = svg.selectAll('.legend')
	// 	.data(color.domain().slice(0, max_links))
	// 	.enter().append('g')
	// 		.attr('class', 'legend')
	// 		.attr('transform', function(d, i) {
	// 			return 'translate(0,'+(i*20)+')';
	// 		});

	// legend.append('rect')
	// 	.attr('x', width-18)
	// 	.attr('width', 18)
	// 	.attr('height', 18)
	// 	.style('fill', color);

	// legend.append('text')
	// 	.attr('x', width-24)
	// 	.attr('y', 9)
	// 	.attr('dy', '0.35em')
	// 	.style('text-anchor', 'end')
	// 	.text(function(d, i) {
	// 		return (i)+' links';
	// 	});


	// // legend
	// var legend = svg.append('g')
	// 	.attr('class', 'legend')
	// 	.attr('transform', 'translate(50,30)')
	// 	.style('font-size', '12px')
	// 	.call(d3.legend);
}


function match_keywords(a_papers) {

	// cache array length
	var n_keys = a_papers.length;

	var h_links = [];

	// n log(n) keyword-matching
	for(var i_left=0; i_left<n_keys-1; i_left++) {
		var a_keywords_left = a_papers[i_left].keywords;

		for(var i_right=i_left+1; i_right<n_keys; i_right++) {
			var a_keywords_right = a_papers[i_right].keywords;

			// count how many keywords match between this pair
			var c_matches = 0;

			// match keywords
			for(var i_keyword_left=0; i_keyword_left<a_keywords_left.length; i_keyword_left++) {
				for(var i_keyword_right=0; i_keyword_right<a_keywords_right.length; i_keyword_right++) {

					// found matching keyword!
					if(a_keywords_left[i_keyword_left] === a_keywords_right[i_keyword_right]) {
						c_matches += 1;
						break;
					}
				}
			}

			if(c_matches != 0) {
				h_links.push({
					source: i_left,
					target: i_right,
					value: c_matches,
				});
			}
		}
	}

	return h_links;
}
