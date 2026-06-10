// ============================================================
// SHARED CONFIG
// ============================================================

const colors = {
    "Non-Indigenous":       "steelblue",
    "First Nations people": "#e07b39",
  };
  
  
  // ============================================================
  // LINE CHART
  // ============================================================
  
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
  
  let xScale, yScaleLeft, yScaleRight, lineGeneratorLeft, lineGeneratorRight;
  let currentRemoteness = "all";
  let currentStatus = "all";
  
  const margin = { top: 40, right: 80, bottom: 25, left: 70 };
  const width = 1000;
  const height = 500;
  const innerWidth  = width  - margin.left - margin.right;
  const innerHeight = height - margin.top  - margin.bottom;
  
  const filterByRemoteness = (data, remotenessId) =>
    remotenessId === "all" ? data : data.filter(d => d.remoteness === remotenessId);
  
  const rollupByYear = (data) =>
    d3.rollups(data, v => d3.sum(v, d => d.hospitalisations), d => d.year)
      .map(([year, hospitalisations]) => ({ year, hospitalisations }))
      .sort((a, b) => a.year - b.year);
  
  d3.csv("assets/data/INDIGENOUS.csv", d => ({
    year:            +d["Year"],
    status:           d["First Nations status"],
    remoteness:       d["ABS Remoteness Area"],
    hospitalisations: +d["Sum (Hospitalisations)"]
  })).then(data => {
    data.sort((a, b) => a.year - b.year);
    drawLineChart(data);
    populateLineFilters(data);
  });
  
  const drawLineChart = (data) => {
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
  
    innerChart.append("g").attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
  
    innerChart.append("g").attr("class", "y-axis-left")
      .call(d3.axisLeft(yScaleLeft).tickFormat(d3.format(",")));
  
    innerChart.append("g").attr("class", "y-axis-right")
      .attr("transform", `translate(${innerWidth}, 0)`)
      .style("opacity", 0);
  
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
  
    innerChart.append("path").attr("id", "line-main")
      .attr("d", lineGeneratorLeft(initialData))
      .attr("fill", "none").attr("stroke", "steelblue").attr("stroke-width", 2);
  
    innerChart.selectAll(".circle-main").data(initialData, d => d.year).join("circle")
      .attr("class", "circle-main").attr("r", 4)
      .attr("cx", d => xScale(d.year)).attr("cy", d => yScaleLeft(d.hospitalisations))
      .attr("fill", "steelblue");
  
    innerChart.append("path").attr("id", "line-nonindigenous")
      .attr("fill", "none").attr("stroke", colors["Non-Indigenous"]).attr("stroke-width", 2).style("opacity", 0);
    innerChart.append("path").attr("id", "line-firstnations")
      .attr("fill", "none").attr("stroke", colors["First Nations people"]).attr("stroke-width", 2).style("opacity", 0);
  
    const legend = innerChart.append("g").attr("id", "legend")
      .attr("transform", `translate(${innerWidth - 160}, 0)`).style("opacity", 0);
  
    [["Non-Indigenous", colors["Non-Indigenous"]], ["First Nations", colors["First Nations people"]]].forEach(([label, color], i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 24})`);
      row.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0).attr("stroke", color).attr("stroke-width", 2);
      row.append("circle").attr("cx", 9).attr("cy", 0).attr("r", 4).attr("fill", color);
      row.append("text").attr("x", 26).attr("y", 4).attr("font-size", "12px").attr("fill", "#1a1a18").text(label);
    });
  };
  
  const updateLineChart = (data) => {
    const chart = d3.select("#hosp-line-chart");
    const remFiltered = filterByRemoteness(data, currentRemoteness);
  
    if (currentStatus === "concurrent") {
      const niData = rollupByYear(remFiltered.filter(d => d.status === "Non-Indigenous"));
      const fnData = rollupByYear(remFiltered.filter(d => d.status === "First Nations people"));
  
      xScale.domain(d3.extent(niData, d => d.year));
      yScaleLeft.domain([d3.min(niData, d => d.hospitalisations) * 0.95, d3.max(niData, d => d.hospitalisations) * 1.05]);
      yScaleRight.domain([d3.min(fnData, d => d.hospitalisations) * 0.95, d3.max(fnData, d => d.hospitalisations) * 1.05]);
  
      const t = d3.transition().duration(500).ease(d3.easeCubicInOut);
  
      chart.select(".x-axis").transition(t).call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
      chart.select(".y-axis-left").transition(t).call(d3.axisLeft(yScaleLeft).tickFormat(d3.format(",")));
      chart.select(".y-axis-right").transition(t).style("opacity", 1).call(d3.axisRight(yScaleRight).tickFormat(d3.format(",")));
      chart.select(".label-left").text("Non-Indigenous");
      chart.select(".label-right").transition(t).style("opacity", 1).text("First Nations");
      chart.select("#line-main").style("opacity", 0);
      chart.selectAll(".circle-main").remove();
      chart.select("#line-nonindigenous").datum(niData).transition(t).style("opacity", 1).attr("d", lineGeneratorLeft);
      chart.select("#line-firstnations").datum(fnData).transition(t).style("opacity", 1).attr("d", lineGeneratorRight);
  
      const niDots = niData.map(d => ({ ...d, group: "Non-Indigenous" }));
      const fnDots = fnData.map(d => ({ ...d, group: "First Nations people" }));
  
      chart.selectAll(".circle-concurrent")
        .data([...niDots, ...fnDots], d => `${d.group}-${d.year}`)
        .join(
          enter => enter.append("circle").attr("class", "circle-concurrent").attr("r", 4)
            .attr("fill", d => colors[d.group])
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => d.group === "Non-Indigenous" ? yScaleLeft(d.hospitalisations) : yScaleRight(d.hospitalisations)),
          update => update,
          exit => exit.transition(t).style("opacity", 0).remove()
        )
        .transition(t)
          .attr("cx", d => xScale(d.year))
          .attr("cy", d => d.group === "Non-Indigenous" ? yScaleLeft(d.hospitalisations) : yScaleRight(d.hospitalisations));
  
      chart.select("#legend").transition(t).style("opacity", 1);
  
    } else {
      const statusFiltered = currentStatus === "all"
        ? remFiltered
        : remFiltered.filter(d => d.status === currentStatus);
  
      const updatedData = rollupByYear(statusFiltered);
  
      xScale.domain(d3.extent(updatedData, d => d.year));
      yScaleLeft.domain([d3.min(updatedData, d => d.hospitalisations) * 0.95, d3.max(updatedData, d => d.hospitalisations) * 1.05]);
  
      const t = d3.transition().duration(500).ease(d3.easeCubicInOut);
  
      chart.select(".x-axis").transition(t).call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
      chart.select(".y-axis-left").transition(t).call(d3.axisLeft(yScaleLeft).tickFormat(d3.format(",")));
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
  
      chart.select("#line-main").datum(updatedData).transition(t)
        .style("opacity", 1).attr("stroke", lineColor).attr("d", lineGeneratorLeft);
  
      chart.selectAll(".circle-main")
        .data(updatedData, d => d.year)
        .join(
          enter => enter.append("circle").attr("class", "circle-main").attr("r", 4)
            .attr("fill", lineColor).attr("cx", d => xScale(d.year)).attr("cy", d => yScaleLeft(d.hospitalisations)),
          update => update.transition(t).attr("fill", lineColor).attr("cx", d => xScale(d.year)).attr("cy", d => yScaleLeft(d.hospitalisations)),
          exit => exit.remove()
        );
    }
  };
  
  const populateLineFilters = (data) => {
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
            updateLineChart(data);
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
            updateLineChart(data);
          }
        });
  };
  
  
  // ============================================================
  // BAR CHART (rate per 100,000)
  // ============================================================
  
  d3.csv("assets/data/populations_final.csv", d => ({
    population:      +d.Population,
    year:            +d.Year,
    status:           d["First Nations status"],
    remoteness:       d["ABS Remoteness Area"],
    hospitalisations: +d["Sum (Hospitalisations)"],
    rate: (+d["Sum (Hospitalisations)"] / +d.Population) * 100000
  })).then(data => {
  
    const years       = [...new Set(data.map(d => d.year))].sort();
    const remotenesses = [...new Set(data.map(d => d.remoteness))];
  
    let selectedYear       = 2021;
    let selectedRemoteness = remotenesses[0];
  
    // Year buttons
    d3.select("#bar-year-filters")
      .selectAll("button")
      .data(years)
      .join("button")
        .attr("class", d => `filter ${d === selectedYear ? "active" : ""}`)
        .text(d => d)
        .on("click", function(event, d) {
          selectedYear = d;
          d3.select("#bar-year-filters").selectAll("button").classed("active", y => y === selectedYear);
          renderBarChart();
        });
  
    // Remoteness buttons
    d3.select("#bar-filters-remoteness")
      .selectAll("button")
      .data(remotenesses)
      .join("button")
        .attr("class", d => `filter ${d === selectedRemoteness ? "active" : ""}`)
        .text(d => d)
        .on("click", function(event, d) {
          selectedRemoteness = d;
          d3.select("#bar-filters-remoteness").selectAll("button").classed("active", r => r === selectedRemoteness);
          renderBarChart();
        });
  
    const bMargin = { top: 40, right: 30, bottom: 50, left: 70 };
    const bWidth  = 600;
    const bHeight = 400;
    const bInnerWidth  = bWidth  - bMargin.left - bMargin.right;
    const bInnerHeight = bHeight - bMargin.top  - bMargin.bottom;
  
    const svg = d3.select("#bar-chart-container")
      .append("svg")
      .attr("viewBox", `0 0 ${bWidth} ${bHeight}`)
      .style("border", "1px solid #ddd");
  
    const g = svg.append("g")
      .attr("transform", `translate(${bMargin.left}, ${bMargin.top})`);
  
    const xScale = d3.scaleBand().range([0, bInnerWidth]).padding(0.35);
    const yScale = d3.scaleLinear().range([bInnerHeight, 0]);
  
    const xAxis = g.append("g").attr("transform", `translate(0, ${bInnerHeight})`);
    const yAxis = g.append("g");
  
  
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -bInnerHeight / 2).attr("y", -55)
      .attr("text-anchor", "middle")
      .style("font-size", "11px").style("fill", "#666")
      .text("Hospitalisations per 100,000 population");
  
    const chartTitle = g.append("text")
      .attr("x", 0).attr("y", -15)
      .style("font-size", "13px").style("font-weight", "bold");
  
    function renderBarChart() {
      const filtered = data.filter(d => d.year === selectedYear && d.remoteness === selectedRemoteness);
      const fnRow = filtered.find(d => d.status === "First Nations people");
      const niRow = filtered.find(d => d.status === "Non-Indigenous");
      if (!fnRow || !niRow) return;
  
      const chartData = [
        { group: "First Nations",  rate: Math.round(fnRow.rate) },
        { group: "Non-Indigenous", rate: Math.round(niRow.rate) }
      ];
  
      const t = d3.transition().duration(400).ease(d3.easeCubicInOut);
  
      xScale.domain(chartData.map(d => d.group));
      yScale.domain([0, d3.max(chartData, d => d.rate) * 1.25]);
  
      xAxis.transition(t).call(d3.axisBottom(xScale).tickSize(0))
        .call(g => g.select(".domain").attr("stroke", "#ccc"));
      yAxis.transition(t).call(d3.axisLeft(yScale).ticks(5));
  
  
      chartTitle.text(`Year: ${selectedYear}  |  Remoteness: ${selectedRemoteness}`);
  
      g.selectAll(".bar")
        .data(chartData, d => d.group)
        .join(
          enter => enter.append("rect").attr("class", "bar")
            .attr("x", d => xScale(d.group))
            .attr("width", xScale.bandwidth())
            .attr("y", bInnerHeight).attr("height", 0)
            .attr("rx", 2)
            .attr("fill", d => d.group === "First Nations" ? "#1a3a6b" : "#2a9d8f"),
          update => update,
          exit => exit.remove()
        )
        .transition(t)
          .attr("x", d => xScale(d.group))
          .attr("width", xScale.bandwidth())
          .attr("y", d => yScale(d.rate))
          .attr("height", d => bInnerHeight - yScale(d.rate))
          .attr("fill", d => d.group === "First Nations" ? "#1a3a6b" : "#2a9d8f");
  
      g.selectAll(".bar-label")
        .data(chartData, d => d.group)
        .join(
          enter => enter.append("text").attr("class", "bar-label")
            .attr("text-anchor", "middle").style("font-size", "12px")
            .attr("x", d => xScale(d.group) + xScale.bandwidth() / 2)
            .attr("y", bInnerHeight),
          update => update,
          exit => exit.remove()
        )
        .transition(t)
          .attr("x", d => xScale(d.group) + xScale.bandwidth() / 2)
          .attr("y", d => yScale(d.rate) - 6)
          .text(d => d.rate);
    }
  
    renderBarChart();
  });