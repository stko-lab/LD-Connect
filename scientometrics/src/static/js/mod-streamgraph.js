/* globals $ dd d3 */

// Initialize Module
async function module_streamgraph() {

	$("#home").removeClass("active");
	$("#streamgraph").addClass("active");
	$("#keywordgraph").removeClass("active");
	$("#simpap").removeClass("active");
	$("#simauthor").removeClass("active");
	$("#authormap").removeClass("active");
	$("#countrycollab").removeClass("active");

	_STREAMGRAPH.setUpHTMLContainers($('#app'));

	chart(null, 'blue');
	
	$('#sg_chart').click(() => {
		$('#sg_container_lock').show();
		$('#sg_container_lock').mouseout(() => {
			$('#sg_container_lock').hide();
			$('#sg_container_lock').off('mouseout');
		});
	});
}

const capitalize = s => s.replace(/\w\S*/g, s_word => s_word[0].toUpperCase()+s_word.slice(1).toLowerCase());

function range(start, end) {
  	var list = [];
	for (var i = start; i <= end; i++) {
    	list.push(i);
	}
	return list;
}

function trim_arr(arr){
	let x = arr.filter((element, index) => {
  		return index % 2 === 0;
  	});
  	return x;
}

function get_keywords_data(a_keywords){

	// count keyword in years
	let h_keywords_years = {};
	for(let s_keyword of a_keywords) {
		let g_keyword = h_keywords[s_keyword];

		let {
			year: s_year,
		} = g_keyword;

		for(let [s_year, a_papers] of Object.entries(g_keyword.years)) {
			if(s_year != 0){
				Object.assign(h_keywords_years[s_year] = h_keywords_years[s_year] || {
					_year: +s_year,
				}, {
					[s_keyword]: a_papers.length,
				});
			}
		}
	}

	// backfill empty keyword years
	for(let s_year in h_keywords_years) {
		let g_year = h_keywords_years[s_year];
		for(let s_keyword of a_keywords) {
			if(!g_year[s_keyword]) g_year[s_keyword] = 0;
		}
	}

	return h_keywords_years
}

function chart(csvpath, color) {

	// select top 20 keywords
	let a_keywords = Object.entries(h_keywords).sort((g_a, g_b) => g_b[1].total - g_a[1].total).map(el => el[0]).slice(0, 20);

	// Object Key: year, Value: keywords and count
	let	h_keywords_years = get_keywords_data(a_keywords);

	let a_data = Object.values(h_keywords_years);

	// generate a full year array
	let min_year = parseInt(Object.keys(h_keywords_years)[0]);
	let max_year = parseInt(Object.keys(h_keywords_years)[Object.keys(h_keywords_years).length-1]);	
	let year_array = range(min_year,max_year).map(String);

	// stack the data
	let a_series = d3.stack()
		.keys(a_keywords)
		.offset(d3.stackOffsetSilhouette)
			(a_data);
	
	// set the dimensions
	let x_width = $('#sg_container').width();
	let x_height = 250;

	// add x axis
	let y_x = d3.scaleLinear()
		.domain(d3.extent(a_data, g => g._year))
		.range([0, x_width]);

	// add y axis
	let y_y = d3.scaleLinear()
		.domain([
			// d3.min(a_series, g => d3.min(g, g0 => g0[0])),
			0,
			d3.max(a_series, g => d3.max(g, g0 => {
				// debugger;
				return g0[1];
			})),
		])
		.range([x_height-10, 0]);

	let y_color = d3.scaleOrdinal(["#393b79","#5254a3","#6b6ecf","#9c9ede","#637939","#8ca252","#b5cf6b","#cedb9c","#8c6d31","#bd9e39","#e7ba52","#e7cb94","#843c39","#ad494a","#d6616b","#e7969c","#7b4173","#a55194","#ce6dbd","#de9ed6"]);
	
	let y_axis_x = d3.axisTop(y_x)
		.tickFormat('');

	// area
	let y_area = d3.area()
		.curve(d3.curveCardinal)
		.x(g => y_x(g.data._year))
		.y0(g => y_y(g[0]))
		.y1(g => y_y(g[1]));

	// create svg element
	let y_svg = d3.select('#sg_chart').append('svg')
		.attr('viewBox', [0, 0, x_width, x_height]);

	// append graph element
	y_svg.append('g')
		.selectAll('path')
		.data(a_series)
		.join('path')
			.attr('class', 'layer')
			.attr('fill', g => y_color(g.key))
			.attr('d', y_area)
		;

	// y-axis display
	y_svg.append('g')
		.call(y_axis_x);

	// x-axis display
	y_svg.append('g')
		.attr('class', 'x-axis')
		.attr('display', 'none')
		.attr('transform', 'translate(0,' + x_height + ')')
		.call(d3.axisTop(y_x).tickFormat(''));

	let y_tooltip = d3.select('#sg_container')
		.append('div')
		.attr('class', 'remove')
		.style('position', 'absolute')
		.style('z-index', '20')
		.style('visibility', 'hidden')
		.style('top', '30px')
		.style('left', '55px');	

	y_svg.selectAll('.layer')
		.attr('opacity', 1)
		.attr('cursor', 'pointer')
		.on('mouseover', (event,d) => {
			y_svg.selectAll('.layer').transition()
				.duration(250)
				.attr('opacity', (d, j) => j != i ? 0.6 : 1);
		})

		.on('mousemove', function(event,d,i) {

			let si_keyword = d.key;
			let [x_cursor_x, x_cursor_y] = d3.pointer(event, this);
			let invertedx = String(Math.round(y_x.invert(x_cursor_x)));
			let n_year_idx = year_array.indexOf(invertedx);

			n_year = 'undefined'; n_count = 'undefined';
			if(n_year_idx != -1){
				n_year = year_array[n_year_idx];
				if(Object.keys(h_keywords_years).indexOf(n_year) > -1){
					n_count = h_keywords_years[n_year][si_keyword];
				} else {
					n_count = 0;
				}
			}

			d3.select(this)
				.classed('hover', true)
				.attr('stroke', '#fff')
				.attr('stroke-width', '2px');

			y_tooltip.style('left', `${x_cursor_x+20}px`);
			y_tooltip.style('top', `${x_cursor_y}px`);

			y_tooltip.html(/* syntax: html */ `
				<div style="text-align:left;background-color:#fff;border-radius:3px;padding:10px 20px;font-size:0.9em;width:250px">
					Keyword: <b>${capitalize(si_keyword)}</b><br/>
					Year: ${n_year}<br/>
					Count: ${n_count}
				</div>
			`).style('visibility', 'visible');

			displayDetails(d.key, n_year);
		})

		.on('mouseout', function(event,d) {
			y_svg.selectAll('.layer')
				.transition()
				.duration(250)
				.attr('opacity', '1');
			d3.select(this)
				.classed('hover', false)
				.attr('stroke-width', '0px');

			y_tooltip.html(/* syntax: html */ `
				<p>${d.key}<br>${0}</p>
			`).style('visibility', 'hidden');
		});

	// timewrapper -- year-axis at top
	let content = '';
	let year_axis = [];
	if(year_array.length > 22){
		year_axis = trim_arr(year_array);
	} else{
		year_axis = year_array;
	}
	let newwidth = x_width/(year_axis.length-1)-3;
	for(var i=0; i<year_axis.length; i++) {
		content += "<div style='position:absolute;margin-top:5px;text-align:left;float:left;color:#666;left:"+(newwidth*i)+"px'>"+year_axis[i]+'</div>';
	}
	$('#timewrapper').html(content);

	function displayDetails(key, date) {
		
		// load years content
		let yearscontent = '';
		for (let s_keyword of a_keywords){
			if(key == s_keyword) {
				for(let [s_year, a_papers] of Object.entries(h_keywords[s_keyword].years)){
					if(s_year > 0){
						yearscontent += "<div style='text-align:left;padding:3px 10px;margin-top:1px;width:95%;border-radius:3px;background-color:#111;'><span style='font-weight:bold;color:rgb(156, 158, 222)'>"+s_year+': </span> ' + a_papers.length + '</div>';
					}
				}
			}
		}
		$('#wrapperYearsContent').html(yearscontent);

		// load titles content
		let titlecontent = '';
		for(let s_keyword of a_keywords) {
			if(key == s_keyword) {
				for(let [s_year, a_papers] of Object.entries(h_keywords[s_keyword].years)){
					if(date == s_year) {
						for(var paper_id of a_papers) {
							let title = h_papers[paper_id].title;
							if(title.length > 0){
								titlecontent += "<div style='text-align:left;padding:3px 10px;margin-top:1px;width:95%;border-radius:3px;background-color:#111;'>"+title+'</div>';
							}
						}
					}
				}
			}
		}
		$('.authoryear').html('('+date+')');
		$('#wrapperPaperContent').html(titlecontent);

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

		// load authors content
		let authorcontent = '';
		let author_list = [];
		let unique_author = {};
		for(let s_keyword of a_keywords) {
			if(key == s_keyword) {
				for(let [s_year, a_papers] of Object.entries(h_keywords[s_keyword].years)){
					if(date == s_year) {
						for(var paper_id of a_papers) {

							// append unique author of all papers with same keyword and year in a list
							for (var author_name of h_papers[paper_id].author_names){
								author_list.push(author_name);
							}
						}

						// create a list of authors with count						
						for (var item of author_list) {
  							unique_author[item] = unique_author[item] ? unique_author[item] + 1 : 1;
						}

						for (let [author, count] of Object.entries(sort_object(unique_author))){
							let author_id = h_author_names[author][0];
							if(author.length > 0){
								authorcontent += "<div style='text-align:left;padding:3px 10px;margin-top:1px;width:95%;border-radius:3px;background-color:#111;'><span style='font-weight:bold;color:rgb(156, 158, 222)'>"+ "<a href = "+author_id+" style='color:rgb(156,158,222)' target='_blank'>"+capitalize(author)+"</a>" +': </span> ' + count + '</div>';
							}
						}
					}
				}
			}
		}
		$('#wrapperAuthorsContent').html(authorcontent);
	}
	$('#loading').fadeOut();
}

//----------------------------------------------------------------------------------------------------
// Global variables
let _STREAMGRAPH = {};

_STREAMGRAPH.setUpHTMLContainers = function(container) {
	let content = '';

	content += '<div class="module-info" style="width:100%;text-align:left;color:#fff">'
	+'This <i>Stream Graph</i> shows the top 20 keywords (author assigned and inferred) from the selected journal.  Hover over the <i>Stream Graph</i> to view the keyword along with the authors and papers that include the keyword as well as the count of that keyword per year.  Click on a stream to <i>lock it</i> and scroll through the information boxes below.'
	+'</div>';
	content += '<div id="sg_container_lock" style="position:absolute;height:250px;width:1024px;margin-left:50%;left:-512px;top:180px;z-index:100;display:none;"></div>';
	content += '<div id="sg_container" style="position:relative;height:700px;background-color:#000;">';


	content += '<div style="height:30px;overflow:hidden;margin-left:20px;" id="timewrapper"></div>';
	content += '<div style="clear:both;overflow:hidden;margin-top:5px;" class="sg_chart" id="sg_chart"></div>';

	content += '<div id="wrapperAuthors" style="float:left;height:250px;width:25%;overflow-x:hidden;overflow-y:auto;margin:2px;">';
	content += '<div style="border-radius:3px;margin-top:5px;padding:3px 10px;color:#fff;font-weight:bold;background-color:rgb(156, 158, 222);width:100%;font-size:1.0em;">Authors <span class="authoryear"></span></div>';
	content += '<div id="wrapperAuthorsContent" style="color:#fff;font-size:0.9em;overflow:auto;"></div></div>';

	content += '<div id="wrapperPapers" style="float:left;height:250px;width:58%;overflow-x:hidden;overflow-y:auto;margin:2px;">';
	content += '<div style="border-radius:3px;margin-top:5px;padding:3px 10px;color:#fff;font-weight:bold;background-color:rgb(156, 158, 222);width:100%;font-size:1.0em;">Papers <span class="authoryear"></span></div>';
	content += '<div id="wrapperPaperContent" style="color:#fff;font-size:0.9em;overflow:auto;"></div></div>';

	content += '<div id="wrapperYears" style="float:left;height:250px;width:15.5%;overflow-x:hidden;overflow-y:auto;margin:2px;">';
	content += '<div style="border-radius:3px;margin-top:5px;padding:3px 10px;color:#fff;font-weight:bold;background-color:rgb(156, 158, 222);width:100%;font-size:1.0em;">Years</div>';
	content += '<div id="wrapperYearsContent" style="color:#fff;font-size:0.9em;"></div></div>';

	content += '<div style="height:300px;overflow:hidden;width:680px;" id="sg_map"></div>';

	content += "<div id='loading'><img src='/img/loading.gif'/></div>;"

	$('#app').hide().html(content).fadeIn('slow');
};
