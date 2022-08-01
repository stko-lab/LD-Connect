const P_ENDPOINT = document.body.getAttribute('data-endpoint');
const SC1_SCOPE = document.body.getAttribute('data-scope');
const P_SCOPE_TYPE = document.body.getAttribute('data-scope-type');

const SRQ_PUBLICATIONS = (() => {
	switch(P_SCOPE_TYPE) {
		case 'http://ld.iospress.nl/rdf/ontology/Book': {
			return `
				${SC1_SCOPE} ^iospress:chapterInBook ?publication .
			`;
		}

		case 'http://ld.iospress.nl/rdf/ontology/Series': {
			return `
				${SC1_SCOPE} ^iospress:bookInSeries/^iospress:chapterInBook ?publication .
			`;
		}

		case 'http://ld.iospress.nl/rdf/ontology/Volume': {
			return `
				${SC1_SCOPE} ^iospress:issueInVolume/^iospress:articleInIssue ?publication .
			`;
		}

		case 'http://ld.iospress.nl/rdf/ontology/Journal': {
			return `
				${SC1_SCOPE} ^iospress:volumeInJournal/^iospress:issueInVolume/^iospress:articleInIssue ?publication .
			`;
		}

		default: {
			throw new Error(`Invalid scope type: '${S_SCOPE_TYPE}'`);
		}
	}
})();

function replace_app(z_replace) {
	let d_app = document.querySelector('#app');
	while(d_app.firstChild) {
		d_app.removeChild(d_app.firstChild);
	}

	if(Array.isArray(z_replace)) {
		z_replace.forEach(d => d_app.appendChild(d));
	}
	else if('string' === typeof z_replace) {
		z_replace.innerHTML = z_replace;
	}
	else {
		throw new Error(`Cannot replace app using ${z_replace}`);
	}
}

const qs = (...a_args) => document.querySelector(...a_args);
const qsa = (...a_args) => document.querySelectorAll(...a_args);
