// global papers database
let h_journal_categories = {};
let h_journals = {};
let h_papers = {};
let h_titles = {};
let h_authors = {};
let h_author_names = {};
let h_keywords = {};
let h_entity_sameAs = {};

(async() => {

	alert('Please select a journal category and a corresponding journal.');

	$("#home").addClass("active");

	let a_journal_categories = await query(/* syntax: sparql */ `
		select ?journal_category ?journal_category_name
		{
			?journal_category rdf:type iospress:Category;
							rdfs:label ?journal_category_name
		} order by ?journal_category_name
	`);

	for (let g_row of a_journal_categories)
	{
		h_journal_categories[g_row.journal_category.value] = g_row.journal_category_name.value;
	}
	console.log('All journal categories', h_journal_categories);

	// read sameAs json
	var request = new XMLHttpRequest();
	request.open("get", '/sameAs_json');
	request.onload = function() {
		h_entity_sameAs = JSON.parse(request.responseText);
	}
	request.send(null);

	for (var key in h_journal_categories) {
		var addOption = document.createElement("option");
		addOption.text = h_journal_categories[key];
		addOption.value = key;
		qs('#category').appendChild(addOption);
	}

	HomeLoadApp();　

})();

async function getJournalCategoryInfo(journal_category_selected)
{
	let a_journals = await query(/* syntax: sparql */ `
		select ?journal ?journal_name
		{
			?journal rdf:type iospress:Journal;
					iospress:category ?journal_category;
					rdfs:label ?journal_name.
			values ?journal_category {<${journal_category_selected}>}
		} order by ?journal_name
	`);
	for (let g_row of a_journals)
	{
		h_journals[g_row.journal.value] = g_row.journal_name.value;
	}
	console.log('Selected journal category:', journal_category_selected);
	console.log('All journals in this category:', h_journals);

	for (var key in h_journals) {
		var addOption = document.createElement("option");
		addOption.text = h_journals[key];
		addOption.value = key;
		qs('#journal').appendChild(addOption);
	}

}

async function getJournalInfo(journal_selected)
{
	
	// authors fetch list
	let a_authors_fetch = [];

	// download all publications
	let a_publications = await query(/* syntax: sparql */ `
		select 
				?publication
				?id
				?title
				?date
				?year
				?author_list
		{
			?publication
					iospress:id ?id ;
					iospress:publicationTitle ?title ;
					iospress:publicationDate ?date ;
					iospress:articleInIssue	?issue ;
					.
			optional 
			{
				?publication iospress:publicationAuthorList ?author_list ;
			}

			?issue 
					iospress:issueInVolume ?volume;
					.
			?volume
					iospress:volumeInJournal ?journal;
					.
			
			bind(year(?date) as ?year)

			values ?journal {<${journal_selected}>}
		}
	`);

	// each publication
	for(let g_row of a_publications) {
		let {
				publication: {value:p_publication},
				id: {value:si_publication},
				title: {value:s_title},
				date: {value:s_date},
				//year: {value:s_year},
				//author_list: {value:p_author_list},
		} = g_row;

		if (typeof g_row.year === "undefined")
		{
			g_row.year = {"value": ""};
		}

		// create paper object
		let g_paper = {
				url: p_publication,
				id: si_publication,
				title: s_title,
				date: s_date,
				year: +g_row.year.value,
				authors: [],
				author_names: [],
				keywords: [],
		};

		// save to tables
		h_papers[p_publication] = g_paper;
		h_titles[s_title] = p_publication;

		// add to author list fetch
		if (typeof g_row.author_list === "undefined")
		{
			continue;
		}
		a_authors_fetch.push([p_publication, g_row.author_list.value]);

	}

	// fetch keywords
	let a_keywords = await query(/* syntax: sparql */ `
		select 
			?publication
			?keyword
		{
			?publication
				iospress:publicationIncludesKeyword ?keyword ;
				iospress:articleInIssue ?issue;
				.
			?issue 
				iospress:issueInVolume ?volume;
				.
			?volume
				iospress:volumeInJournal ?journal;
			.
						
			values ?journal {<${journal_selected}>}
		}	
	`);

	// each keyword
	for(let g_row of a_keywords) {
		let {
				publication: {value:p_publication},
				keyword: {value:s_keyword},
		} = g_row;

		// save to paper
		h_papers[p_publication].keywords.push(s_keyword);
		
		let g_keyword = (h_keywords[s_keyword] = h_keywords[s_keyword] || {
				years: {},
				total: 0,
		});

		g_keyword.total += 1;

		(g_keyword.years[h_papers[p_publication].year] = g_keyword.years[h_papers[p_publication].year] || [])
			.push(p_publication);
	}

	// author lists
	// each author position
	for(let i_rdfn=0;; i_rdfn++) {
		let a_authors = await query(/* syntax: sparql */ `
			select ?publication ?author ?author_name ?org_name ?country
			{
				?author_list rdf:_${i_rdfn} ?author .
				?author iospress:contributorFullName ?author_name ;
				optional 
				{
					?author iospress:contributorAffiliation ?org .
					?org iospress:geocodingInput ?org_name ;
						 iospress:geocodingOutput ?org_loc .
					?org_loc iospress-geocode:country ?country.
				}
				values (?publication ?author_list) {
					${a_authors_fetch.map(([p_publication, p_author_list]) => `(<${p_publication}> <${p_author_list}>)`).join('\n')}
				}
			}
		`);

		// no more authors
		if(!a_authors.length) break;

		// each author
		for(let g_row of a_authors) {
			let p_paper = g_row.publication.value;
			let p_author = g_row.author.value;

			// save to paper
			if (h_papers[p_paper].authors.indexOf(p_author) === -1) 
			{
				h_papers[p_paper].authors.push(p_author);
			}
			if (h_papers[p_paper].author_names.indexOf(g_row.author_name.value) === -1)
			{
				h_papers[p_paper].author_names.push(g_row.author_name.value);
			} 

			if (typeof g_row.country === "undefined")
			{
				g_row.country = {'value':""};
			}

			if (g_row.country.value === "Taiwan" || g_row.country.value === "Hong Kong")
			{
				g_row.country.value = "China";
			}

			if (typeof g_row.org_name === "undefined")
			{
				g_row.org_name = {'value':""};
			}

			(h_authors[p_author] = h_authors[p_author] || {
				name: g_row.author_name.value,
				papers: [],
				org: g_row.org_name.value,
				org_country: g_row.country.value,
				unique_id: h_entity_sameAs[p_author]
			}).papers.push(p_paper);
			(h_author_names[g_row.author_name.value] = h_author_names[g_row.author_name.value] || []).push(p_author);				
		}
	}

	console.log('Paper information of the selected journal:', h_papers);
	console.log('Keyword information of the selected journal:', h_keywords);
	console.log('Author information of the selected journal:', h_authors);

	if ($("#home").hasClass("active") == true) {
		$("#home").click();
	}

	if ($("#authormap").hasClass("active") == true) {
		$("#authormap").click();
	}

	if ($("#countrycollab").hasClass("active") == true) {
		$("#countrycollab").click();
	}

	if ($("#simauthor").hasClass("active") == true) {
		$("#simauthor").click();
	}

	if ($("#simpap").hasClass("active") == true) {
		$("#simpap").click();
	}

	if ($("#keywordgraph").hasClass("active") == true) {
		$("#keywordgraph").click();
	}

	if ($("#streamgraph").hasClass("active") == true) {
		$("#streamgraph").click();
	}
};

$("#category").change(function () {
	while (qs('#journal').lastChild.previousSibling)
	{
		qs('#journal').removeChild(qs('#journal').lastChild);
	}
	h_journals = {};
	h_papers = {};
	h_titles = {};
	h_authors = {};
	h_author_names = {};
	h_keywords = {};

	getJournalCategoryInfo($(this).val());
});

$("#journal").change(function () {
	h_papers = {};
	h_titles = {};
	h_authors = {};
	h_author_names = {};
	h_keywords = {};

	$('#app').hide().html("<div id='loading'><img src='/img/loading.gif'/></div>;").fadeIn('slow');

	getJournalInfo($(this).val());

});

