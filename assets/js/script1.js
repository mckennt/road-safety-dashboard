const filters_remoteness = [
    { id: "all",          label: "All",          isActive: true },
    { id: "Major Cities", label: "Major Cities", isActive: false },
    { id: "Regional",     label: "Regional",     isActive: false },
    { id: "Remote",       label: "Remote",       isActive: false },
    { id: "Missing",      label: "Missing",      isActive: false },
  ];
  
  let xScale, yScale, lineGenerator;
  
  d3.csv("assets/data/TOTAL_READ.csv", d => {
    return {
      year: +d["Year"],
      remoteness: d["ABS Remoteness Area"],
      hospitalisations: +d["Sum (Hospitalisations)"]
    };
  }).then(data => {
    data.sort((a, b) => a.year - b.year);
  
    const allData = d3.rollups(
      data,
      v => d3.sum(v, d => d.hospitalisations),
      d => d.year
    ).map(([year, hospitalisations]) => ({ year, hospitalisations }))
      .sort((a, b) => a.year - b.year);
  
    drawHospLineChart(allData);
    populateRemoteFilters(data);
  });
  
  const drawHospLineChart = data => {
    const margin = { top: 40, right: 170, bottom: 25, left: 60 };
    const width = 1000;
    const height = 500;
    const innerWidth  = width  - margin.left - margin.right;
    const innerHeight = height - margin.top  - margin.bottom;
  
    const svg = d3.select(".responsive-svg-container")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("border", "1px solid black");
  
    const innerChart = svg
      .append("g")
      .attr("id", "hosp-line-chart")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([0, innerWidth]);
  
    yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.hospitalisations) * 0.95,
        d3.max(data, d => d.hospitalisations) * 1.05
      ])
      .range([innerHeight, 0]);
  
    innerChart
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
  
    innerChart
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));
  
    innerChart
      .append("text")
      .text("Hospitalisations (count)")
      .attr("x", -margin.left + 10)
      .attr("y", -10)
      .attr("text-anchor", "start");
  
    innerChart
      .selectAll(".circle")
      .data(data)
      .join("circle")
        .attr("class", "circle")
        .attr("r", 4)
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.hospitalisations))
        .attr("fill", "steelblue");
  
    lineGenerator = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.hospitalisations));
  
    innerChart
      .append("path")
      .attr("id", "hosp-line-path")
      .attr("d", lineGenerator(data))
      .attr("fill", "none")
      .attr("stroke", "steelblue");
  };
  
  const populateRemoteFilters = (data) => {
  
    d3.select("#filters_remoteness")
      .selectAll(".filter")
      .data(filters_remoteness)
      .join("button")
        .attr("class", d => `filter ${d.isActive ? "active" : ""}`)
        .text(d => d.label)
        .on("click", (e, d) => {
          if (!d.isActive) {
            filters_remoteness.forEach(filter => {
              filter.isActive = filter.id === d.id;
            });
  
            d3.selectAll("#filters_remoteness .filter")
              .classed("active", filter => filter.id === d.id);
  
            updateLineChart(d.id, data);
          }
        });
  
    const updateLineChart = (filterId, data) => {
      const updatedData = filterId === "all"
        ? d3.rollups(
            data,
            v => d3.sum(v, d => d.hospitalisations),
            d => d.year
          ).map(([year, hospitalisations]) => ({ year, hospitalisations }))
            .sort((a, b) => a.year - b.year)
        : data.filter(d => d.remoteness === filterId)
              .sort((a, b) => a.year - b.year);
  
      xScale.domain(d3.extent(updatedData, d => d.year));
      yScale.domain([
        d3.min(updatedData, d => d.hospitalisations) * 0.95,
        d3.max(updatedData, d => d.hospitalisations) * 1.05
      ]);
  
      d3.select("#hosp-line-chart .x-axis")
        .transition().duration(500).ease(d3.easeCubicInOut)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
  
      d3.select("#hosp-line-chart .y-axis")
        .transition().duration(500).ease(d3.easeCubicInOut)
        .call(d3.axisLeft(yScale).tickFormat(d3.format(",")));
  
      d3.select("#hosp-line-path")
        .datum(updatedData)
        .transition().duration(500).ease(d3.easeCubicInOut)
        .attr("d", lineGenerator);
  
      d3.select("#hosp-line-chart")
        .selectAll(".circle")
        .data(updatedData, d => d.year)
        .join(
          enter => enter.append("circle")
            .attr("class", "circle")
            .attr("r", 4)
            .attr("fill", "steelblue")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.hospitalisations)),
          update => update
            .transition().duration(500).ease(d3.easeCubicInOut)
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.hospitalisations)),
          exit => exit.remove()
        );
    };
  
  };