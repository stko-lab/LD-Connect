async function HomeLoadApp() {

  $("#home").addClass("active");
	$("#streamgraph").removeClass("active");
	$("#keywordgraph").removeClass("active");
	$("#simpap").removeClass("active");
	$("#simauthor").removeClass("active");
	$("#authormap").removeClass("active");
	$("#countrycollab").removeClass("active");

  var hm_content = '<div class="module-info" style="text-align:left;width:100%;color:#fff"><p>';
      hm_content += '<a style="color:rgb(156,158,222)">Scientometrics</a> play an increasingly important role in facilitating the understanding of different research fields as well as research topics within them. This scientometric system, <a href="http://stko-roy.geog.ucsb.edu:7200/iospress_scientometrics/" style="color:pink">IOS Press scientometrics</a>, allows users to visually explore how the journals of different research fields have changed and grown over the past few years as well as their spatial characteristics. Moreover, embedding-based similarity search is achieved on both authors and papers to find their counterparts. The work on this scientometric system is built upon <a href="http://ld.iospress.nl" style="color:pink">LD Connect</a>, and is funded by <a href = "https://www.iospress.com" style="color:pink">IOS Press</a> in collaboration with <a href = "https://github.com/stko-lab" style="color:pink">STKO Lab</a> at UC Santa Barbara.  Select a journal category and a corresponding journal from the drop-down list and a module from the menu above to explore the IOS Press data in further details.</p><p>The map below is a <i>Choropleth Map</i> visualization showing the countries of authors in the selected journal. The country is colored in proportion to the number of authors contributing. Countries with higher than average authors are shaded in darker colors while those with fewer than average are shown in lighter shades.</p></div>';

  hm_content += "<div id='map-container' style='position:relative;width:100%;text-align:center;height:500px;'><svg id='cartomap' style='background-color:#000;width:100%;height:100%;margin:0;'></svg></div> ";
  //hm_content += "<div id='loading'><img src='/img/loading.gif'/></div>;"
  $('#app').hide().html(hm_content).fadeIn('slow');


  choropleth_map();

  //$('#loading').fadeOut();

}

//count array and covert to object
const arrToInstanceCountObj = arr => arr.reduce((obj, e) => {
      obj[e] = (obj[e] || 0) + 1;
      return obj;
  }, {});

// get country list with count
function getCountryData(){
    let country_list = [];
    for (author of Object.keys(h_authors)) {
      let country = h_authors[author].org_country;
      if(country.length > 0){
        country_list.push(country);
      }
    }
    let country_obj = arrToInstanceCountObj(rename(country_list));
    return country_obj;
  }

// matching names with the topojson file
function rename(country_list){
  let US_list = ['US', 'USA'];
  let Netherland_list = ['The Netherlands', 'the Netherlands'];
  let UK_list = ['UK', 'U.K.'];
  for(var i = 0; i < country_list.length; i++){
    if(US_list.indexOf(country_list[i]) > -1){
      country_list[i] = "United States";
    }
    if(UK_list.indexOf(country_list[i])> -1){
      country_list[i] = "United Kingdom";
    }
    if(Netherland_list.indexOf(country_list[i]) > -1){
      country_list[i] = "Netherlands";
    }
    if(country_list[i] == "Republic of Korea"){
      country_list[i] = "Korea";
    }
    if(country_list[i] == "Czech Republic"){
      country_list[i] = "Czech Rep.";
    }
    if(country_list[i] == "Slovak Republic"){
      country_list[i] = "Slovakia";
    }
  }
  return country_list;
}

function choropleth_map(){

  const svg = d3.select('#cartomap').append('svg');
  let div = d3.select('#cartomap').append("div");
  let projection = d3.geoEquirectangular() //define projection to use
        .center([0,5])
        .scale(150) //set how far zoom in
        .rotate([-160,0]); 

  let path = d3.geoPath()
                .projection(projection);

  // format tooltip
  function callout(g, value) {
    if (!value) return g.style("display", "none");

      g.style("display", null)
        .style("pointer-events", "none")
        .style("font", "10px sans-serif");

      var path = g
          .selectAll("path")
          .data([null])
          .join("path")
          .attr("fill", "white")
          .attr("stroke", "black");

      var text = g
        .selectAll("text")
        .data([null])
        .join("text")
        .call(function(text) {
          text.selectAll("tspan")
          .data((value + "").split("/\n/"))
          .join("tspan")
          .attr("x", 0)
          .attr("y", function(d, i) {
           return i * 1.1 + "em";
          })
          .style("font-weight", function(_, i) {
            return i ? null : "bold";
          })
          .text(function(d) {
            return d;
          });
        });

      var x = text.node().getBBox().x;
      var y = text.node().getBBox().y;
      var w = text.node().getBBox().width;
      var h = text.node().getBBox().height;

      text.attr("transform", "translate(" + -w / 2 + "," + (15 - y) + ")");
      path.attr("d","M" + (-w / 2 - 10) + ",5H-5l5,-5l5,5H" +
        (w / 2 + 10) + "v" + (h + 20) + "h-" + (w + 20) +"z");
  }

  d3.json('/lib/world1.topojson').then(function(topology){
   
    let data = getCountryData();
   
    let arr = Object.values(data);
    let lo = Math.min(...arr);
    let hi = Math.max(...arr);
    let range = (hi-lo)/6;

    //const colorScale = d3.scaleOrdinal(d3.schemeBlues[7]);
    if(Object.keys(data).length == 0){
      var colorScale = d3.scaleOrdinal(d3.schemeBlues[7]);
    } else{
      var colorScale = d3.scaleThreshold()
        .domain([lo, lo+range, lo+range*2, lo+range*3, hi-range*2, hi-range, hi])
        .range(d3.schemeBlues[7]);
    } 
    

    svg.append("g")
          .selectAll("path")
          .data(topojson.feature(topology, topology.objects.states)
           .features)
          .join("path")
            .attr("d", path)
            .attr("class","country")
            .attr("stroke", "grey")
            .attr("fill", function (d) {
                d.total = data[d.id]|| 0;
                return colorScale(d.total);
            });

    var tooltip = svg.append("g");
    svg.selectAll(".country")
        .on("mouseover", function (event, d) {
          tooltip.call(callout, 
            d.properties.name + ": " + d.total);
          d3.select(this)
            .attr("stroke","black")
            .raise();
        })
        .on("mousemove", function(event,d) {
            tooltip.attr("transform", "translate("+d3.pointer(event,this)[0] + "," + d3.pointer(event,this)[1] +")");
        })
        .on("mouseout", function() {
          tooltip.call(callout, null);
          d3.select(this)
            .attr("stroke", null)
            .lower();
        });
  });

  var zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', function(event) {
          svg.selectAll('path')
           .attr('transform', event.transform);
      });
    
  //svg.call(zoom);

}