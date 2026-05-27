d3.csv("assets/data/TOTAL_READ.csv", d => {
    if (d["ABS Remoteness Area"] !== "Major Cities") return null;
    return {
      year: +d["Year"],
      hospitalisations: +d["Sum (Hospitalisations)"]
    };
  }).then(data => {
  
    // d3.csv returns null rows when the callback returns null — filter them out
    data = data.filter(d => d !== null);
    data.sort((a, b) => a.year - b.year);
  
    console.log(data);
    console.log(data.length);
    console.log(d3.max(data, d => d.hospitalisations));
    console.log(d3.min(data, d => d.hospitalisations));
    console.log(d3.extent(data, d => d.hospitalisations));
  
    drawHospLineChart(data);
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
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([0, innerWidth]);
  
      const yScale = d3.scaleLinear()
      .domain([
        d3.min(data, d => d.hospitalisations) * 0.95,
        d3.max(data, d => d.hospitalisations) * 1.05
      ])
      .range([innerHeight, 0]);
  
    const bottomAxis = d3.axisBottom(xScale)
      .tickFormat(d3.format("d"));
  
    const leftAxis = d3.axisLeft(yScale)
      .tickFormat(d3.format(","));
  
    innerChart
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(bottomAxis);
  
    innerChart
      .append("g")
      .call(leftAxis);
  
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
  
    const lineGenerator = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.hospitalisations));
  
    innerChart
      .append("path")
      .attr("d", lineGenerator(data))
      .attr("fill", "none")
      .attr("stroke", "steelblue");
  };