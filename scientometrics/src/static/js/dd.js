
const R_SELECTOR = /^(\w*)([^]*)$/;
const R_EXTRACT = /^(?:([#.])([^#.:]+)|(?:[:]([^]*)$))/;
function dd(...a_args) {
	let d_element;
	let z_arg = a_args.shift();
	if(!z_arg) return;
	if('string' === typeof z_arg) {
		// text node
		if(':' === z_arg[0]) {
			return document.createTextNode(z_arg.slice(1));
		}

		let m_selector = R_SELECTOR.exec(z_arg);
		if(!m_selector) throw new Error('invalid selector syntax');

		// tag name
		d_element = document.createElement(m_selector[1] || 'div');

		// aux attributes
		let s_aux = m_selector[2];

		// id
		let m_extract = R_EXTRACT.exec(s_aux);
		while(m_extract) {
			switch(m_extract[1]) {
				// id
				case '#':
					d_element.id = m_extract[2];
					break;

				// class name
				case '.':
					d_element.className = m_extract[2];
					break;

				// text content
				case undefined:  // eslint-disable-line no-undefined
					d_element.textContent = m_extract[3];
					break;

				default:
					throw new Error('unrecognized selector instruction: '+s_aux);
			}

			s_aux = s_aux.substr(m_extract[0].length);
			m_extract = R_EXTRACT.exec(s_aux);
		}

		z_arg = a_args.shift();
		if(!z_arg) return d_element;
	}
	else {
		d_element = document.createElement('div');
	}

	// properties
	if(Object === z_arg.constructor) {
		Object.assign(d_element, z_arg);
		z_arg = a_args.shift();
		if(!z_arg) return d_element;
	}

	// attributes
	if(Object === z_arg.constructor) {
		for(let s_key in z_arg) {
			d_element.setAttribute(s_key, z_arg[s_key]);
		}
		z_arg = a_args.shift();
		if(!z_arg) return d_element;
	}

	// child nodes
	if(Array.isArray(z_arg)) {
		z_arg.forEach((d_child) => {
			if(d_child) {
				d_element.appendChild(d_child);
			}
		});
	}

	return d_element;
};
