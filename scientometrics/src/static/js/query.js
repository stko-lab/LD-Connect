const H_PREFIXES = {
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
	xsd: 'http://www.w3.org/2001/XMLSchema#',
	owl: 'http://www.w3.org/2002/07/owl#',
	dc: 'http://purl.org/dc/elements/1.1/',
	dcterms: 'http://purl.org/dc/terms/',
	foaf: 'http://xmlns.com/foaf/0.1/',
	iospress: 'http://ld.iospress.nl/rdf/ontology/',
	'iospress-category': 'http://ld.iospress.nl/rdf/category/',
	'iospress-datatype': 'http://ld.iospress.nl/rdf/datatype/',
	'iospress-index': 'http://ld.iospress.nl/rdf/index/',
	'iospress-alias': 'http://ld.iospress.nl/rdf/alias/',
	'iospress-artifact': 'http://ld.iospress.nl/rdf/artifact/',
	'iospress-contributor': 'http://ld.iospress.nl/rdf/contributor/',
	'iospress-organization': 'http://ld.iospress.nl/rdf/organization/',
	'iospress-geocode': 'http://ld.iospress.nl/rdf/geocode/',
	geosparql: 'http://www.opengis.net/ont/geosparql#',
	ago: 'http://awesemantic-geo.link/ontology/',
};

let S_PREFIXES = '';
for(let [si_prefix, p_prefix_iri] of Object.entries(H_PREFIXES)) {
	S_PREFIXES += `prefix ${si_prefix}: <${p_prefix_iri}>\n`;
}

async function query(srq_query) {
	let d_form = new FormData();
	d_form.append('query',  S_PREFIXES+srq_query);

	let d_res = await fetch(P_ENDPOINT, {
		method: 'POST',
		mode: 'cors',
		headers: {
			Accept: 'application/sparql-results+json',
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams([
			...(d_form),
		]),
	});

	return (await d_res.json()).results.bindings;
}
