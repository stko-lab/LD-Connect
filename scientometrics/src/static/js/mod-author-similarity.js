/* globals dd replace_app */

async function module_author_similarity() {

	$("#home").removeClass("active");
	$("#streamgraph").removeClass("active");
	$("#keywordgraph").removeClass("active");
	$("#simpap").removeClass("active");
	$("#simauthor").addClass("active");
	$("#authormap").removeClass("active");
	$("#countrycollab").removeClass("active");

	let h_authors_current = h_authors;
	let h_author_names_current= h_author_names;

	function build_distribution(a_data, s_color) 
	{
		let c_embeddings = 0;
		let a_childs = [];
		for (x_value in a_data) 
		{
			if (a_data[x_value]>0)
			{
				a_childs.push(dd('.authorsim_bars', {
					style: /* syntax: css.style */ `
						top: 0;
						position: absolute;
						left: ${(c_embeddings+1)*5}px;
						background-color: ${s_color};
						width: 2px;
						margin: 1px;
						height: ${Math.log((1+a_data[x_value]*1000)*10)*2}px;
					`,
				}, {
					'data-keys': a_data[x_value].toString(),
				}));
			}
			else
			{
				a_childs.push(dd('.authorsim_bars', {
					style: /* syntax: css.style */ `
						bottom: 0;
						position: absolute;
						left: ${(c_embeddings+1)*5}px;
						background-color: ${s_color};
						width: 2px;
						margin: 1px;
						height: ${Math.log((1-a_data[x_value]*1000)*10)*2}px;
					`,
				}, {
					'data-keys': a_data[x_value].toString(),
				}));
			}

			c_embeddings += 1;
		}

		return dd('div', {
			style: /* syntax: css.style */ `
				position: relative;
				width: 150px;
				height: 50px;
				margin-bottom: 30px;
				float: left;
			`,
		}, [
			...a_childs,
		]);
	}


	let search = () => {

		let s_search = qs('#authorsearch').value;
		console.log("Current selected author:",s_search);

		console.log(h_authors_current[h_author_names_current[qs('#authorsearch').value][0]].unique_id);
		var current_author_url = h_authors_current[h_author_names_current[s_search][0]].unique_id;

		if (typeof h_authors_current[current_author_url] === 'undefined')
		{
			h_authors_current[current_author_url] = {'org':h_authors_current[h_author_names_current[s_search][0]].org};
		}
		var rootPath = window.location.href.replace("/iospress_scientometrics", "");

		var current_author_embeddings = [];
		$.ajax({
			url: rootPath+"transE_info"+"?author="+current_author_url,
			type: 'GET',
			dataType: 'json',
			async: false,
			success: function(data, textStatus, xhr) {
				console.log(data);
				if (typeof data[0] === 'undefined')
				{
					alert('The pre-trained TransE model does not include information about the selected author. Please select another author to continue similarity search.')
				}
				current_author_embeddings = Object.values(data[0].values);
				console.log('Embeddings of the selected author:', current_author_embeddings);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log(errorThrown);
			}
		}); 

		var sim_authors_embeddings = {'sim_authors':[]};
		$.ajax({
			url: rootPath+"transE_sim"+"?author="+current_author_url,
			type: 'GET',
			dataType: 'json',
			async: false,
			success: function(data1, textStatus, xhr) {
				for (i = 0; i < data1.length; i++) {
					$.ajax({
						url: rootPath+"transE_info"+"?author="+data1[i]['word'],
						type: 'GET',
						dataType: 'json',
						async: false,
						success: function(data2, textStatus, xhr) {
							sim_authors_embeddings['sim_authors'].push({
								'url':data1[i]['word'],
								'embeddings':Object.values(data2[0].values),
								'dist':data1[i]['dist']
							});
						},
						error: function(xhr, textStatus, errorThrown) {
							console.log(errorThrown);
						}
					});
				}
				console.log('Embeddings of the most similar authors:', sim_authors_embeddings);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log(errorThrown);
			}
		}); 
		
		qs('#simauthor_mainauthor').appendChild(dd('div', { //border-top:solid 1px #666;
			style: /* syntax: css.style */ `
				min-height:50px;border-top:solid 1px #666;padding-top:10px;margin-top:40px;
			`,
		}, [
			build_distribution(current_author_embeddings.slice(0,20), '#669999'), 
			dd('div:'+s_search, {/* syntax: css.style */
				style:  `float:left;font-size:1.2em;`,
			},[
				dd('br'),
			  	dd('span:'+h_authors_current[current_author_url].org, {
					style: /* syntax: css.style */ `float:left;color:#ccc;font-size:0.8em;width:650px;`,
				}),
			  ]),		
		])); 

		qs('#simauthor_mainauthor').appendChild(dd('br'));
		qs('#simauthor_mainauthor').appendChild(dd('br'));

		qs('#simauthor_results').appendChild(dd('b:Most Similar Authors Across All Journals (Up to 10)'));

		for (var x in sim_authors_embeddings.sim_authors) {
			(async () => {
				let a_simauthor = await query(/* syntax: sparql */ `
					select ?name ?org_name
					{
						?author iospress:contributorFullName ?name .
						optional 
						{
							?author iospress:contributorAffiliation ?org .
							?org iospress:geocodingInput ?org_name ;
								 iospress:geocodingOutput ?org_loc .
							?org_loc iospress-geocode:country ?country.
						}
						
						values ?author {<${sim_authors_embeddings.sim_authors[x].url}>}
					}
				`);
				if (typeof a_simauthor[0].org_name === "undefined")
				{
					a_simauthor[0].org_name = {'value':""};
				}

				qs('#simauthor_results').appendChild(dd('div', { 
					style: /* syntax: css.style */ `min-height:70px;border-bottom:solid 1px #666;padding-top:10px;`,
				}, [
					build_distribution(sim_authors_embeddings.sim_authors[x].embeddings.slice(0,20), '#eee'),
					dd('div:'+a_simauthor[0].name.value, {
						style: /* syntax: css.style */ `cursor: pointer;`,
						onclick: () => {
							qs('#authorsearch').value = a_simauthor[0].name.value;
							h_authors_current = {};
							h_authors_current[sim_authors_embeddings.sim_authors[x].url] = {
								'unique_id':sim_authors_embeddings.sim_authors[x].url,
								'org': a_simauthor[0].org_name.value
							};
							h_author_names_current[a_simauthor[0].name.value] = [];
							h_author_names_current[a_simauthor[0].name.value].push(sim_authors_embeddings.sim_authors[x].url);
							while (qs('#simauthor_results').lastChild)
							{
								qs('#simauthor_results').removeChild(qs('#simauthor_results').lastChild);
		
							}
							while (qs('#simauthor_mainauthor').lastChild.previousSibling) 
							{
								qs('#simauthor_mainauthor').removeChild(qs('#simauthor_mainauthor').lastChild);
							}
							search();
						},
					}, {
						title: 'Click to search for similar authors to this author',
					}, [
						dd('br'),
						dd('span:'+a_simauthor[0].org_name.value, {
							style:/* syntax: css.style */ `color:#669999;font-size:0.8em;`
						}),
					]),
				])
				);
			})()

		}

		$('.authorsim_bars').hover(function(e) {
			$('#authorsim_tooltip').css({"display":"block"});
			var w = ($(document).width() - 1024)/2;
			$('#authorsim_tooltip').css({"top":(e.pageY-10)});
			$('#authorsim_tooltip').css({"left":(e.pageX-w)});
			$('#authorsim_tooltip').html($(this).attr('data-keys').replace(/,/g,", "));
		}, function(e) {
			$('#authorsim_tooltip').css({"display":"none"});
		});

		$("#simauthor_mainauthor").hide().html($("#simauthor_mainauthor").innerHTML).fadeIn('slow');
		$("#simauthor_results").hide().html($("#simauthor_results").innerHTML).fadeIn('slow');

	};

	replace_app([
		dd('.instruct', {
			style: /* syntax: css.style */ `text-align:justify; float:left; color:#fff;`,
		}, [
			dd('span', {
				innerHTML: /* syntax: html */ `
					Start by entering a few characters of the author name. Select the author
					from the list and click the <i>Find Similar Authors</i> button. 
					Similarity of authors is determined by their <a href='http://ld.iospress.nl/about/about-data/#download_section' style="color:pink">knowledge graph embeddings</a> derived from a TransE model. 
					Hover over the graph to the left of the selected author to see how it stacks up.
					<br/>
				`,
			}),
			dd('span', {
				style: /* syntax: css.style */ `font-weight:bold; color:#FFB6C1;`,
			}, [
				dd('br'),
				dd(`:Using RDF-based linked data from IOS Press`),
				dd('br'),
				dd('br'),
			]),
		]),

		dd('.ui-widget', {
			style: /* syntax: css.style */ `text-align:left;`,
		}, [

			dd('input#authorsearch', {
				style: /* syntax: css.style */ `font-family:Ubuntu,sans-serif; width:800px; padding:5px 10px; font-size:1.0em; float:left;`,
				onfocus: () => qs('#authorsearch').value = '',
				onkeydown: (de_evt) => (13 === de_evt.which)? (search(), false): true,
			}),

			dd('#simauthor_searchbutton:Find Similar Authors', {
				onclick: () => {
					if ($('#journal').val() == 'undefined')
					{
						alert('Please select a journal category and a corresponding journal.');
					}
					else if (qs('#authorsearch').value == "")
					{
						alert('Please provide an author from your selected journal.');
					}
					else
					{
						h_authors_current = h_authors;
						h_author_names_current = h_author_names;
						while (qs('#simauthor_results').lastChild)
						{
							qs('#simauthor_results').removeChild(qs('#simauthor_results').lastChild);
	
						}
						while (qs('#simauthor_mainauthor').lastChild.previousSibling) 
						{
							qs('#simauthor_mainauthor').removeChild(qs('#simauthor_mainauthor').lastChild);
						}
						search();
					}
				},
			}),

			dd('#simauthor_mainauthor', { /* syntax: css.style */
				style:  `color:#33cccc; text-align:center;`,
			}, [
				dd('div', {  /* syntax: css.style */ 
					style: `font-size:1.3em; margin-top:30px;`, 
				}, [
					dd('br'),
					dd('br'),
					dd('br'),
					dd('br'),
					dd('br'),
				])
			]),

			dd('#simauthor_results', { 
				style: /* syntax: css.style */ `color:#fff;text-align:left;padding-top:50px;`,
			}),

			dd('#simauthor_bottom', {
				style: /* syntax: css.style */ `color:#fff;text-align:left;`,
			}),

		]),

		dd('#authorsim_tooltip', {/* syntax: css.style */
			style: `border-radius:3px;padding:5px;position:absolute;color:#666;z-index:7;width:300px;background-color:#fff;display:none;box-shadow: 0px 0px 3px #666;`,
		}),
	]);

	$("#app").hide().html($("#app").innerHTML).fadeIn('slow');

	// autocomplete
	$('#authorsearch').autocomplete({
		source: Object.keys(h_author_names),
	});


}
