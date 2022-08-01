/* globals dd replace_app */

async function module_paper_similarity() {

	$("#home").removeClass("active");
	$("#streamgraph").removeClass("active");
	$("#keywordgraph").removeClass("active");
	$("#simpap").addClass("active");
	$("#simauthor").removeClass("active");
	$("#authormap").removeClass("active");
	$("#countrycollab").removeClass("active");

	let h_papers_current = h_papers;
	let h_titles_current= h_titles;

	function build_distribution(a_data, s_color) 
	{
		let c_embeddings = 0;
		let a_childs = [];
		for (x_value in a_data) 
		{
			if (a_data[x_value]>0)
			{
				a_childs.push(dd('.papersim_bars', {
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
				a_childs.push(dd('.papersim_bars', {
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

		let s_search = qs('#papersearch').value;
		console.log('Current selected paper:',s_search);

		let g_paper = h_papers_current[h_titles_current[s_search]];
		var current_paper_url = g_paper.url;
		var rootPath = window.location.href.replace("/iospress_scientometrics", "");

		var current_paper_embeddings = [];
		$.ajax({
			url: rootPath+"d2v_info"+"?doc="+current_paper_url,
			type: 'GET',
			dataType: 'json',
			async: false,
			success: function(data, textStatus, xhr) {
				if (typeof data[0] === 'undefined')
				{
					alert('The pre-trained Doc2Vec model does not include information about the selected paper. Please select another papaer to continue similarity search.')
				}
				current_paper_embeddings = Object.values(data[0].values);
				console.log('Embeddings of the selected paper:', current_paper_embeddings);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log(errorThrown);
			}
		}); 

		var sim_papers_embeddings = {'sim_papers':[]};	
		$.ajax({
			url: rootPath+"d2v_sim"+"?doc="+current_paper_url,
			type: 'GET',
			dataType: 'json',
			async: false,
			success: function(data1, textStatus, xhr) {
				for (i = 0; i < data1.length; i++) {
					$.ajax({
						url: rootPath+"d2v_info"+"?doc="+data1[i]['word'],
						type: 'GET',
						dataType: 'json',
						async: false,
						success: function(data2, textStatus, xhr) {
							sim_papers_embeddings['sim_papers'].push({
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
				console.log('Embeddings of the most similar paper:', sim_papers_embeddings);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log(errorThrown);
			}
		}); 



		qs('#simpaper_mainpaper').appendChild(dd('div', {
			style: /* syntax: css.style */ `
				min-height:50px;border-top:solid 1px #666;padding-top:10px;margin-top:40px;
			`,
		}, [
			build_distribution(current_paper_embeddings.slice(0,20), '#669999'), 
			dd('div:'+g_paper.title, {
				style: /* syntax: css.style */ `float:left;font-size:1.2em;width:650px;`,
			}, [
				dd('br'),
				dd('span:'+g_paper.year, {
					style: /* syntax: css.style */ `float:left;color:#eee;font-size:0.8em;width:650px;`,
				}),
				dd('br'),
				dd('span:'+g_paper.keywords.join(', '), {
					style: /* syntax: css.style */ `color:#ccc;font-size:0.6em`,
				}),
			]),
		]));

		qs('#simpaper_mainpaper').appendChild(dd('br'));
		qs('#simpaper_mainpaper').appendChild(dd('br'));
		qs('#simpaper_results').appendChild(dd('b:Most Similar Papers Across All Journals (Up to 10)'));

		for(var x in sim_papers_embeddings.sim_papers) {
			(async () => {	
				let simpaper_info = {'url':undefined, 'title':undefined, 'year':undefined,'keywords':[]};
				let a_simpaper = await query(/* syntax: sparql */ `
					select ?publication ?title ?year ?keyword
					{
						?publication iospress:id ?id ;
									 iospress:publicationTitle ?title ;
									 iospress:publicationDate ?date .
						optional
						{
							?publication iospress:publicationIncludesKeyword ?keyword .
						}
						bind(year(?date) as ?year)
						values ?publication {<${sim_papers_embeddings.sim_papers[x].url}>}
					}
				`);

				if (a_simpaper.length != 0)
				{
					for (let g_row of a_simpaper) {
						simpaper_info.url = g_row.publication.value;
						simpaper_info.title = g_row.title.value;
						if ((typeof g_row.keyword === "undefined") == false)
						{
							simpaper_info.keywords.push(g_row.keyword.value);
						}
						if (typeof g_row.year === "undefined")
						{
							simpaper_info.year = "";
						}
						else 
						{
							simpaper_info.year = g_row.year.value;
						}
	
					}
	
					
					qs('#simpaper_results').appendChild(dd('div', {
						style: /* syntax: css.style */ `min-height:70px;border-top:solid 1px #666;padding-top:10px;`,
					}, [
						build_distribution(sim_papers_embeddings.sim_papers[x].embeddings.slice(0,20), '#eee'),
						dd('div:'+simpaper_info.title, {
							style: /* syntax: css.style */ `cursor: pointer;`,
							onclick: () => {
	
								qs('#papersearch').value = simpaper_info.title;
								
								h_papers_current = {};
								h_titles_current = {};
	
	
								h_papers_current[simpaper_info.url] = {
									'url':simpaper_info.url,
									'year':simpaper_info.year,
									'title':simpaper_info.title,
									'keywords':simpaper_info.keywords
								}
								h_titles_current[simpaper_info.title] = simpaper_info.url;
	
								while (qs('#simpaper_results').lastChild)
								{
									qs('#simpaper_results').removeChild(qs('#simpaper_results').lastChild);
			
								}
								while (qs('#simpaper_mainpaper').lastChild.previousSibling) 
								{
									qs('#simpaper_mainpaper').removeChild(qs('#simpaper_mainpaper').lastChild);
								}
								search();
							},
						}, {
							title: 'Click to search for similar papers to this paper',
						}, [
							dd('br'),
							dd('span:'+simpaper_info.year, {
								style: /* syntax: css.style */ `color:#669999;font-size:0.8em;`
							}),
							dd('br'),
							dd('span:'+simpaper_info.keywords.join(','), {
								style: /* syntax: css.style */ `color:#ccc;font-size:0.8em;`
							}),
						]),
					])
					);
				}


			})()

		}


		$('.papersim_bars').hover(function(e) {
			$('#papsim_tooltip').css({"display":"block"});
			var w = ($(document).width() - 1024)/2;
			$('#papsim_tooltip').css({"top":(e.pageY-10)});
			$('#papsim_tooltip').css({"left":(e.pageX-w)});
			$('#papsim_tooltip').html($(this).attr('data-keys').replace(/,/g,", "));
		}, function(e) {
			$('#papsim_tooltip').css({"display":"none"});
		});

		$("#simpaper_mainpaper").hide().html($("#simpaper_mainpaper").innerHTML).fadeIn('slow');
		$("#simpaper_results").hide().html($("#simpaper_results").innerHTML).fadeIn('slow');

	};

	replace_app([
		dd('.instruct', {
			style: /* syntax: css.style */ `text-align:justify; float:left; color:#fff;`,
		}, [
			dd('span', {
				innerHTML: /* syntax: html */ `
					Start by entering a few characters of a paper title. Select the paper
					from the list and click the <i>Find Similar Papers</i> button. 
					Similarity of papers is determined by their <a href='http://ld.iospress.nl/about/about-data/#download_section' style="color:pink">document embeddings</a> derived from 
					a Doc2Vec model.
					Hover over the graph to the left of the selected paper to see how it stacks up.
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

			dd('input#papersearch', {
				style: /* syntax: css.style */ `font-family:Ubuntu,sans-serif; width:800px; padding:5px 10px; font-size:1.0em; float:left;`,
				onfocus: () => qs('#papersearch').value = '',
				onkeydown: (de_evt) => (13 === de_evt.which)? (search(), false): true,
			}),

			dd('#simpaper_searchbutton:Find Similar Papers', {
				onclick: () => {
					if ($('#journal').val() == 'undefined')
					{
						alert('Please select a journal category and a corresponding journal.');
					}
					else if (qs('#papersearch').value == "")
					{
						alert('Please provide a paper from your selected journal.');
					}
					else
					{
						h_papers_current = h_papers;
						h_titles_current = h_titles;
						while (qs('#simpaper_results').lastChild)
						{
							qs('#simpaper_results').removeChild(qs('#simpaper_results').lastChild);
	
						}
						while (qs('#simpaper_mainpaper').lastChild.previousSibling) 
						{
							qs('#simpaper_mainpaper').removeChild(qs('#simpaper_mainpaper').lastChild);
						}
						search();
					}
				},
			}),

			dd('#simpaper_mainpaper', {
				style: /* syntax: css.style */ `color:#33cccc; text-align:center;`,
			}, [
				dd('div', {
					style: /* syntax: css.style */ `font-size:1.3em; margin-top:30px;`,
				}, [
					dd('br'),
					dd('br'),
					dd('br'),
					dd('br'),
					dd('br'),
				])
			]),

			dd('#simpaper_results', {
				style: /* syntax: css.style */ `color:#fff;text-align:left;padding-top:50px;`,
			}),

			dd('#simpaper_bottom', {
				style: /* syntax: css.style */ `color:#fff;text-align:left;`,
			}),
		]),

		dd('#papsim_tooltip', {
			style: /* syntax: css.style */ `border-radius:3px;padding:5px;position:absolute;color:#666;z-index:7;width:300px;background-color:#fff;display:none;box-shadow: 0px 0px 3px #666;`,
		}),
	]);
	
	$("#app").hide().html($("#app").innerHTML).fadeIn('slow');

	// autocomplete
	$('#papersearch').autocomplete({
		source: Object.keys(h_titles),
	});

}

