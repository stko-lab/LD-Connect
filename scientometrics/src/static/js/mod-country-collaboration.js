async function CountryCollab() {
  
  $("#home").removeClass("active");
	$("#streamgraph").removeClass("active");
	$("#keywordgraph").removeClass("active");
	$("#simpap").removeClass("active");
	$("#simauthor").removeClass("active");
	$("#authormap").removeClass("active");
	$("#countrycollab").addClass("active");

  let content = "";
  content += '<div class="module-info" style="text-align:left;width:1024px;height:60px;position:relative;color:#fff">'
             + 'The <i>Chord Diagram</i> below shows country collaboration patterns based on the co-authorship of the papers from the selected journal. The <i>arc length</i> represents the percentage of the total collaborative papers from each country. Hover over the <i>Chord</i> to view the country-to-country probabilistic affinity.</div>';
  content += '<div id ="cc"></div>';
  //content += "<div id='loading'><img src='/img/loading.gif'/></div>;"

  $('#app').hide().html(content).fadeIn('slow');

  const [matrix, names] = setUpMatrix();
  drawChords(matrix, names);
}

//*******************************************************************
//  SET UP MATRIX FOR COUNTRY COLLABORATION
//*******************************************************************
function setUpMatrix(){
  let country_link = [];
  for(let key of Object.keys(h_authors)){
      let paper = h_authors[key].papers[0];
      for(let author of h_papers[paper].authors){
          let c1 = h_authors[key].org_country;
          let c2 = h_authors[author].org_country;
          if( c1.length > 0 && c2.length > 0){
            if (c2 != c1){
              country_link.push({
                source: c1,
                target: c2,
                papers: paper,
             });
            }
          }
      }
  }

  let country_link_unique = get_unique(country_link);
  let names = Array.from(new Set(country_link_unique.flatMap(d => [d.source, d.target])));
  
  let index = new Map(names.map((name, i) => [name, i]));
  let matrix = Array.from(index, () => new Array(names.length).fill(0));
  for (let {source, target, count} of country_link_unique){
    matrix[index.get(source)][index.get(target)] += count;
  }
  return [matrix, names];

}

// get unique country link
function get_unique(country_link){

    // get unique country pairs for the same paper
    let unique = country_link.filter((v,i,a)=>a.findIndex(t=>(JSON.stringify(t) === JSON.stringify(v)))===i);

    // count unique papers for country pairs
    let counts = {};
    for (var i = 0; i < unique.length; i++) {
      counts[[unique[i].source, unique[i].target]] = 1 + (counts[[unique[i].source, unique[i].target]] || 0);
    }

    // update count in country_links
    let unique_country_link = [];
    for (var i = 0; i < unique.length; i++) {
      unique_country_link.push({
        source: unique[i].source,
        target: unique[i].target,
        count:counts[[unique[i].source, unique[i].target]],
      });
    }
    return unique_country_link.filter((v,i,a)=>a.findIndex(t=>(JSON.stringify(t) === JSON.stringify(v)))===i);   
  }

function chordRdr (matrix, mmap) {
  return function (d) {
    var i,j,s,t,g,m = {};
    if (d.source) {
      i = d.source.index; j = d.target.index;
      m.sname = mmap[i];
      m.sdata = d.source.value;
      m.svalue = +d.source.value;
      m.stotal = _.reduce(matrix[i], function (k, n) { return k + n }, 0);
      m.tname = mmap[j];
      m.tdata = d.target.value;
      m.tvalue = +d.target.value;
      m.ttotal = _.reduce(matrix[j], function (k, n) { return k + n }, 0);
    } else {
      m.gname = mmap[d.index];
      //m.gdata = g[0].data;
      m.gvalue = d.value;
    }
    m.mtotal = _.reduce(matrix, function (m1, n1) { 
      return m1 + _.reduce(n1, function (m2, n2) { return m2 + n2}, 0);
    }, 0);
    return m;
  }
}

//*******************************************************************
//  DRAW THE CHORD DIAGRAM
//*******************************************************************
function drawChords (matrix, mmap) {

      var w = 980, h = 800, r1 = h / 2, r0 = r1 - 100;
      var svg = d3.select('#cc').append("svg")
      //var svg = d3.select(d_app).append("svg")
            .attr("width", w)
            .attr("height", h)
            .style("margin-top","30px")
            .append("svg:g")
            .attr("id", "circle")
            .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")");
       svg.append("circle")
              .attr("r", r0 + 20);

      var rdr = chordRdr(matrix, mmap);

      // initiate the color scale
      var fill = d3.scaleOrdinal()
          .range(['#006d2c','#41ab5d','#a1d99b','#e5f5e0',
                  '#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#bd0026','#800026',
                  '#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#54278f',
                 '#c6dbef','#6baed6','#2171b5','#08306b']);

      var chord = d3.chord()
            .padAngle(.02)
            .sortSubgroups(d3.descending)
            .sortChords(d3.descending);

      var arc = d3.arc()
            .innerRadius(r0)
            .outerRadius(r0 + 20);

      var ribbon = d3.ribbonArrow()
            .radius(r0 - 1)
            .padAngle(1 / r0)

      var chords = chord(matrix);
      var g = svg.append("g")
          .datum(chords);

      var group = g.append("g")
          .attr("class", "groups")
          .selectAll("g")
          .data(chords.groups)
          .enter().append("g")

        group.append("path")
          .style("fill", function(d) { return fill(mmap[d.index]); })
          .style("stroke", "black")
          .attr("d", arc)
          .on("mouseover", fade(0.1))
          .on("mouseout", fade(1));

        group.append("title").text(function (d) {
          return groupTip(rdr(d));
        });


        group.append("text")
            .attr("dy", ".35em")
            .attr("class", "country-label")
            .attr("transform", function(d, i) {
              d.angle = (d.startAngle + d.endAngle) / 2;
              return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                  + "translate(" + (r0 + 26) + ")"
                  + (d.angle > Math.PI ? "rotate(180)" : "");
            })
            .text(function(d) { return mmap[d.index]; })
            .style("fill", "white")
            .style("font-family", "helvetica, arial, sans-serif")
            .style("font-size", "12px")
            .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; });
            
            
      //Draw the ribbons that go from group to group
      var ribbons = g.append("g")
        .attr("class", "ribbons")
        .selectAll("path")
        .data(chords)
        .enter().append("path")
        .attr("d", ribbon)
        .style("fill", function(d) {
          return fill(mmap[d.target.index]);
        })
        .style("stroke", function(d) {
          return d3.rgb(fill(mmap[d.target.index])).darker();
        });

      ribbons.append("title").text(function(d) {
        return chordTip(rdr(d));
      });


      function chordTip (d) {
        var p = d3.format(".2%"), q = d3.format(",.3r")
        return "Probabilistic Affinity:\n"
          + p(d.svalue/d.stotal) + " (" + q(d.svalue) + ") between "
          + d.sname + " and " + d.tname
      }

      function groupTip (d) {
        var p = d3.format(".1%"), q = d3.format(",.3r")
        return "Country Info:\n"
          + d.gname + " : " + q(d.gvalue) + "\n"
          + p(d.gvalue/d.mtotal) + " of Total Collaboration Matrix (" + q(d.mtotal) + ")"
      }

      function fade(opacity) {
        return function(d, i) {
          ribbons
          .filter(function(d) {
            return d.source.index != i.index && d.target.index != i.index;
          })
          .transition()
          .style("opacity", opacity);
        };
      }

      //$('#loading').fadeOut();

  } 

