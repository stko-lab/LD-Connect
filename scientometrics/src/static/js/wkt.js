const R_WKT_POINT = /^\s*(?:<([^>]+)>)?\s*point\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)\s*$/i;
const P_CRS_4326 = 'http://www.opengis.net/def/crs/EPSG/0/4326';

function wkt_parse(s_wkt) {
	let m_wkt = R_WKT_POINT.exec(s_wkt);
	if(m_wkt) {
		let [, p_crs, s_lng, s_lat] = m_wkt;

		if(p_crs !== P_CRS_4326) throw new Error(`Cannot use CRS: ${p_crs}`);

		return {
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [+s_lng, +s_lat],
			},
			properties: {},
		};
	}
	else {
		throw new Error(`Could not parse WKT: ${s_wkt}`);
	}
}
