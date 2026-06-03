const filters_remoteness = [
  { id: "all",          label: "All",          isActive: true },
  { id: "Major Cities", label: "Major Cities", isActive: false },
  { id: "Regional",     label: "Regional",     isActive: false },
  { id: "Remote",       label: "Remote",       isActive: false },
];

const filters_status = [
  { id: "all",                  label: "All",             isActive: true },
  { id: "First Nations people", label: "First Nations",   isActive: false },
  { id: "Non-Indigenous",       label: "Non-Indigenous",  isActive: false },
  { id: "concurrent",           label: "Both Concurrent", isActive: false },
];

const colors = {
  "Non-Indigenous":       "steelblue",
  "First Nations people": "#e07b39",
};

let xScale, yScaleLeft, yScaleRight, lineGeneratorLeft, lineGeneratorRight;
let currentRemoteness = "all";
let currentStatus = "all";

const margin = { top: 40, right: 80, bottom: 25, left: 70 };
const width = 1000;
const height = 500;
const innerWidth  = width  - margin.left - margin.right;
const innerHeight = height - margin.top  - margin.bottom;

// ── helpers ─────────────────────────────────────────────────────────────

const filterByRemoteness = (data, remotenessId) =>
  remotenessId === "all" ? data : data.filter(d => d.remoteness === remotenessId);

const rollupByYear = (data) =>
  d3.rollups(data, v => d3.sum(v, d => d.hospitalisations), d => d.year)
    .map(([year, hospitalisations]) => ({ year, hospitalisations }))
    .sort((a, b) => a.year - b.year);

// ── draw ─────────────────────────────────────────────────────────────────

d3.csv("assets/data/INDIGENOUS.csv", d => ({
  year:            +d["Year"],
  status:           d["First Nations status"],
  remoteness:       d["ABS Remoteness Area"],
  hospitalisations: +d["Sum (Hospitalisations)"]
})).then(data => {
  data.sort((a, b) => a.year - b.year);
  drawChart(data);
  populateFilters(data);
});

const drawChart = (data) => {
  const svg = d3.select(".responsive-svg-container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("border", "1px solid black");

  const innerChart = svg
    .append("g")
    .attr("id", "hosp-line-chart")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const initialData = rollupByYear(data);

  xScale = d3.scaleLinear()
    .domain(d3.extent(initialData, d => d.year))
    .range([0, innerWidth]);

  yScaleLeft = d3.scaleLinear()
    .domain([
      d3.min(initialData, d => d.hospitalisations) * 0.95,
      d3.max(initialData, d => d.hospitalisations) * 1.05
    ])
    .range([innerHeight, 0]);

  yScaleRight = d3.scaleLinear()
    .domain([0, 1000])
    .range([innerHeight, 0]);

  // axes
  innerChart.append("g").attr("class", "x-axis")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  innerChart.append("g").attr("class", "y-axis-left")
    .call(d3.axisLeft(yScaleLeft).tickFormat(d3.format(",")));

  innerChart.append("g").attr("class", "y-axis-right")
    .attr("transform", `translate(${innerWidth}, 0)`)
    .style("opacity", 0);

  // axis labels
  innerChart.append("text").attr("class", "label-left")
    .text("Hospitalisations")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2).attr("y", -margin.left + 15)
    .attr("text-anchor", "middle").attr("font-size", "12px");

  innerChart.append("text").attr("class", "label-right")
    .attr("transform", "rotate(90)")
    .attr("x", innerHeight / 2).attr("y", -innerWidth - margin.right + 15)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .style("opacity", 0);

  lineGeneratorLeft  = d3.line().x(d => xScale(d.year)).y(d => yScaleLeft(d.hospitalisations));
  lineGeneratorRight = d3.line().x(d => xScale(d.year)).y(d => yScaleRight(d.hospitalisations));

  // main single line
  innerChart.append("path").attr("id", "line-main")
    .attr("d", lineGeneratorLeft(initialData))
    .attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2);

  innerChart.selectAll(".circle-main").data(initialData, d => d.year).join("circle")
    .attr("class", "circle-main").attr("r", 4)
    .attr("cx", d => xScale(d.year)).attr("cy", d => yScaleLeft(d.hospitalisations))
    .attr("fill", "steelblue");

  // concurrent lines — hidden initially
  innerChart.append("path").attr("id", "line-nonindigenous")
    .attr("fill", "none").attr("stroke", colors["Non-Indigenous"]).attr("stroke-width", 2).style("opacity", 0);
  innerChart.append("path").attr("id", "line-firstnations")
    .attr("fill", "none").attr("stroke", colors["First Nations people"]).attr("stroke-width", 2).style("opacity", 0);

  // legend — hidden initially
  const legend = innerChart.append("g").attr("id", "legend")
    .attr("transform", `translate(${innerWidth - 160}, 0)`).style("opacity", 0);

  [["Non-Indigenous", colors["Non-Indigenous"]], ["First Nations", colors["First Nations people"]]].forEach(([label, color], i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 24})`);
    row.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0).attr("stroke", color).attr("stroke-width", 2);
    row.append("circle").attr("cx", 9).attr("cy", 0).attr("r", 4).attr("fill", color);
    row.append("text").attr("x", 26).attr("y", 4).attr("font-size", "12px").attr("fill", "#1a1a18").text(label);
  });
};

// ── update (line chart) ──────────────────────────────────────────────────

const updateChart = (data) => {
  const chart = d3.select("#hosp-line-chart");
  const remFiltered = filterByRemoteness(data, currentRemoteness);

  if (currentStatus === "concurrent") {
    const niData = rollupByYear(remFiltered.filter(d => d.status === "Non-Indigenous"));
    const fnData = rollupByYear(remFiltered.filter(d => d.status === "First Nations people"));

    xScale.domain(d3.extent(niData, d => d.year));
    yScaleLeft.domain([
      d3.min(niData, d => d.hospitalisations) * 0.95,
      d3.max(niData, d => d.hospitalisations) * 1.05
    ]);
    yScaleRight.domain([
      d3.min(fnData, d => d.hospitalisations) * 0.95,
      d3.max(fnData, d => d.hospitalisations) * 1.05
    ]);

    const t = d3.transition().duration(500).ease(d3.easeCubicInOut);

    chart.select(".x-axis").transition(t)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    chart.select(".y-axis-left").transition(t)
      .call(d3.axisLeft(yScaleLeft).tickFormat(d3.format(",")));
    chart.select(".y-axis-right").transition(t)
      .style("opacity", 1)
      .call(d3.axisRight(yScaleRight).tickFormat(d3.format(",")));

    chart.select(".label-left").text("Non-Indigenous");
    chart.select(".label-right").transition(t).style("opacity", 1).text("First Nations");

    chart.select("#line-main").style("opacity", 0);
    chart.selectAll(".circle-main").remove();

    chart.select("#line-nonindigenous")
      .datum(niData).transition(t)
      .style("opacity", 1).attr("d", lineGeneratorLeft);

    chart.select("#line-firstnations")
      .datum(fnData).transition(t)
      .style("opacity", 1).attr("d", lineGeneratorRight);

    const niDots = niData.map(d => ({ ...d, group: "Non-Indigenous" }));
    const fnDots = fnData.map(d => ({ ...d, group: "First Nations people" }));

    chart.selectAll(".circle-concurrent")
      .data([...niDots, ...fnDots], d => `${d.group}-${d.year}`)
      .join(
        enter => enter.append("circle")
          .attr("class", "circle-concurrent")
          .attr("r", 4)
          .attr("fill", d => colors[d.group])
          .attr("cx", d => xScale(d.year))
          .attr("cy", d => d.group === "Non-Indigenous"
            ? yScaleLeft(d.hospitalisations)
            : yScaleRight(d.hospitalisations)),
        update => update,
        exit => exit.transition(t).style("opacity", 0).remove()
      )
      .transition(t)
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => d.group === "Non-Indigenous"
          ? yScaleLeft(d.hospitalisations)
          : yScaleRight(d.hospitalisations));

    chart.select("#legend").transition(t).style("opacity", 1);

  } else {
    const statusFiltered = currentStatus === "all"
      ? remFiltered
      : remFiltered.filter(d => d.status === currentStatus);

    const updatedData = rollupByYear(statusFiltered);

    xScale.domain(d3.extent(updatedData, d => d.year));
    yScaleLeft.domain([
      d3.min(updatedData, d => d.hospitalisations) * 0.95,
      d3.max(updatedData, d => d.hospitalisations) * 1.05
    ]);

    chart.select(".x-axis").transition().duration(500).ease(d3.easeCubicInOut)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    chart.select(".y-axis-left").transition().duration(500).ease(d3.easeCubicInOut)
      .call(d3.axisLeft(yScaleLeft).tickFormat(d3.format(",")));
    chart.select(".y-axis-right").transition().duration(300).style("opacity", 0);
    chart.select(".label-left").text("Hospitalisations");
    chart.select(".label-right").transition().duration(300).style("opacity", 0);

    chart.select("#line-nonindigenous").style("opacity", 0);
    chart.select("#line-firstnations").style("opacity", 0);
    chart.selectAll(".circle-concurrent").remove();
    chart.select("#legend").transition().duration(300).style("opacity", 0);

    const lineColor = currentStatus === "First Nations people" ? colors["First Nations people"]
      : currentStatus === "Non-Indigenous" ? colors["Non-Indigenous"]
      : "steelblue";

    chart.select("#line-main")
      .datum(updatedData)
      .transition().duration(500).ease(d3.easeCubicInOut)
      .style("opacity", 1)
      .attr("stroke", lineColor)
      .attr("d", lineGeneratorLeft);

    chart.selectAll(".circle-main")
      .data(updatedData, d => d.year)
      .join(
        enter => enter.append("circle")
          .attr("class", "circle-main").attr("r", 4)
          .attr("fill", lineColor)
          .attr("cx", d => xScale(d.year))
          .attr("cy", d => yScaleLeft(d.hospitalisations)),
        update => update
          .transition().duration(500).ease(d3.easeCubicInOut)
          .attr("fill", lineColor)
          .attr("cx", d => xScale(d.year))
          .attr("cy", d => yScaleLeft(d.hospitalisations)),
        exit => exit.remove()
      );
  }
};

// ── filters (line chart) ─────────────────────────────────────────────────

const populateFilters = (data) => {

  d3.select("#filters_remoteness")
    .selectAll(".filter")
    .data(filters_remoteness)
    .join("button")
      .attr("class", d => `filter ${d.isActive ? "active" : ""}`)
      .text(d => d.label)
      .on("click", (e, d) => {
        if (!d.isActive) {
          filters_remoteness.forEach(f => f.isActive = f.id === d.id);
          d3.selectAll("#filters_remoteness .filter").classed("active", f => f.id === d.id);
          currentRemoteness = d.id;
          updateChart(data);
        }
      });

  d3.select("#filters_status")
    .selectAll(".filter")
    .data(filters_status)
    .join("button")
      .attr("class", d => `filter ${d.isActive ? "active" : ""}`)
      .text(d => d.label)
      .on("click", (e, d) => {
        if (!d.isActive) {
          filters_status.forEach(f => f.isActive = f.id === d.id);
          d3.selectAll("#filters_status .filter").classed("active", f => f.id === d.id);
          currentStatus = d.id;
          updateChart(data);
        }
      });
};






//more or less all to be removed
// ── donut chart ──────────────────────────────────────────────────────────

const drawDonutChart = (data, selectedYear) => {

  const dWidth  = 1000;
  const dHeight = 500;
  const radius = Math.min(dWidth, dHeight) / 2 - 20;

  const colour = d3.scaleOrdinal()
    .domain(["Major Cities", "Regional", "Remote", "Missing"])
    .range(d3.schemeSet2);

  const pie = d3.pie()
    .value(d => d.count)
    .sort(null);

  const arcGenerator = d3.arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius);

  const arcHover = d3.arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius + 12);

  const svg = d3.select("#donut-chart")
    .append("svg")
      .attr("viewBox", `0, 0, ${dWidth}, ${dHeight}`)
      .style("border", "1px solid black")
      .style("background-color", "#F8F4E8");

  const innerChart = svg
    .append("g")
      .attr("transform", `translate(${dWidth / 2}, ${dHeight / 2})`);

  innerChart.append("g").attr("class", "slices");
  innerChart.append("g").attr("class", "labels");

  svg.node().__pie__          = pie;
  svg.node().__arcGenerator__ = arcGenerator;
  svg.node().__arcHover__     = arcHover;
  svg.node().__colour__       = colour;
  svg.node().__innerChart__ = innerChart.node();

  updateDonutChart(data, selectedYear);
};

const updateDonutChart = (data, selectedYear) => {

  const svgNode      = d3.select("#donut-chart svg").node();
  const pie          = svgNode.__pie__;
  const arcGenerator = svgNode.__arcGenerator__;
  const arcHover     = svgNode.__arcHover__;
  const colour       = svgNode.__colour__;
  const innerChart   = d3.select(svgNode.__innerChart__);

  const filtered = data.filter(d => d.year === selectedYear);

  innerChart.select(".slices")
    .selectAll("path")
    .data(pie(filtered))
    .join("path")
      .attr("d", arcGenerator)
      .attr("fill",   d => colour(d.data.area))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .on("mouseover", function() { d3.select(this).attr("d", arcHover); })
      .on("mouseout",  function() { d3.select(this).attr("d", arcGenerator); });

  innerChart.select(".labels")
    .selectAll(".label")
    .data(pie(filtered))
    .join("text")
      .attr("class", "label")
      .attr("transform", d => `translate(${arcGenerator.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "15px")
      .style("fill", "black")
      .text(d => d.data.area);
};




d3.csv("assets/data/TOTAL_READ.csv", d => {
  return {
    year: +d["Year"],
    area: d["ABS Remoteness Area"],
    count: +d["Sum (Count of cases)"]
  };
}).then(data => {

  console.log(data);
  console.log(data.length);
  console.log(d3.max(data, d => d.count));
  console.log(d3.min(data, d => d.count));
  console.log(d3.extent(data, d => d.count));

  const years = [...new Set(data.map(d => d.year))].sort();
  let selectedYear = years[years.length - 1];

  const controls = d3.select("#year-filters");

  controls.selectAll("button")
    .data(years)
    .join("button")
      .text(d => d)
      .classed("active", d => d === selectedYear)
      .on("click", function(event, d) {
        selectedYear = d;
        controls.selectAll("button").classed("active", y => y === selectedYear);
        updateDonutChart(data, selectedYear);
      });

  drawDonutChart(data, selectedYear);
});

