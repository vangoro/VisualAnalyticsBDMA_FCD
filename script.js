// Pie chart initialization function
d3.csv("./final_translated_data_V3.csv", d => ({
    value: +d.Valeurs,
    title: d.Titre,
    year: +d.Unite_temps,
    ordinates: d.Ordonnees,
    indicator: d.Indicateur,
    geographical_area: d.Zone_geographique,
  })).then(data => {
    // Filter for the year 2023
    const filteredData = data.filter(d => d.year === 2023);
  
    // Extract regions while excluding "France" and "Île-de-France" from the main dropdown
    const regions = Array.from(new Set(filteredData
        .map(d => d.geographical_area)
        .filter(region => region !== "France" && region !== "Ile-de-France")
    )).sort();
  
    // Populate the dropdown menu (datalist)
    const regionSuggestions = document.getElementById("regionSuggestions");
    regions.forEach(region => {
      const option = document.createElement("option");
      option.value = region;
      regionSuggestions.appendChild(option);
    });
  
    // Initialize with the first region and display it
    const defaultRegion = regions[0];
    document.getElementById("regionName").textContent = defaultRegion;
    createPieChart(filteredData.filter(d => d.geographical_area === defaultRegion), "#pie", "#legend");
  
    // Generate separate pie charts for France and Île-de-France
    createPieChart(filteredData.filter(d => d.geographical_area === "France"), "#francePie", "#franceLegend", "France");
    createPieChart(filteredData.filter(d => d.geographical_area === "Ile-de-France"), "#ileDeFrancePie", "#idfLegend", "Île-de-France");
    
    // Event listener for the search button
    document.getElementById("searchButton").addEventListener("click", () => {
      const regionInput = document.getElementById("regionSearch");
      const region = regionInput.value;
  
      if (regions.includes(region)) {
        console.log(`Selected region: ${region}`);
        document.getElementById("regionName").textContent = region;
        createPieChart(filteredData.filter(d => d.geographical_area === region), "#pie", "#legend");
      } else {
        alert("Region not found. Please select a valid region from the dropdown.");
      }
    });
  });
  
// General pie chart function
const createPieChart = (data, chartId, legendId, regionTitle = "") => {
    const width = 400, height = 400;
    const radius = Math.min(width, height) / 2;

    const container = d3.select(chartId).html(""); // Clear existing chart
    const svg = container
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Handle empty data case
    if (!data.length) {
        container.html("<p>No data available for this selection.</p>");
        return;
    }

    // Aggregate and sort data
    const aggregatedData = d3.rollups(
        data,
        v => d3.sum(v, d => d.value),
        d => d.indicator
    ).map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);

    const totalValue = d3.sum(aggregatedData, d => d.value);
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Color scale
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(aggregatedData, d => d.value)])
        .interpolator(d3.interpolateReds);

    // Draw slices
    const slices = svg.selectAll("path").data(pie(aggregatedData));

    slices.enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.value))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("transition", "all 0.3s ease")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .style("opacity", 0.7)
                .style("stroke", "black");

            // Highlight legend only for the main chart
            if (legendId === "#legend") {
                d3.select(`#legend-item-${d.data.key.replace(/\s+/g, '-')}`)
                    .style("font-weight", "bold");
            }
        })
        .on("mouseout", function (event, d) {
            d3.select(this)
                .style("opacity", 1)
                .style("stroke", "white");

            if (legendId === "#legend") {
                d3.select(`#legend-item-${d.data.key.replace(/\s+/g, '-')}`)
                    .style("font-weight", "normal");
            }
        })
        .append("title")
        .text(d => `${d.data.key}: ${(d.data.value / totalValue * 100).toFixed(2)}%`);

    slices.exit().remove();

    // **Generate a separate legend for each pie chart**
    const legend = d3.select(legendId).html(""); // Clear previous legend

    legend.selectAll("div")
        .data(aggregatedData)
        .enter()
        .append("div")
        .attr("id", d => `legend-item-${d.key.replace(/\s+/g, '-')}`)
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "5px")
        .html(d => `
            <div style="width: 12px; height: 12px; background-color: ${colorScale(d.value)}; margin-right: 8px;"></div>
            <span>${d.key}: ${(d.value / totalValue * 100).toFixed(2)}%</span>`);

    // If a title is specified, add it above the pie chart
    if (regionTitle) {
        container.insert("h3", ":first-child")
            .text(regionTitle)
            .style("text-align", "center")
            .style("color", "#333")
            .style("margin-bottom", "10px");
    }
};
