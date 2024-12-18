// Set the time format
const parseTime = d3.timeParse("%Y");

// Load the dataset and formatting variables
d3.csv("./serieschrono-datagouv-csv_cleaned_v4.csv", d => {
  return {
    value: d.Valeurs,
    title: d.Titre,
    year: +d.Unite_temps,
    date: parseTime(d.Unite_temps),
    ordinates: d.Ordonnees,
    indicator: d.Indicateur,
    graphic_source: d.SourceGraphique,
    sub_indicator: d.Sous_indicateur,
    nomenclature: d.Nomenclature,
    declination: d.Declinaison,
    statistics: d.Statistique,
    geographical_area: d.Zone_geographique,
    longitude: d.longitude,
    latitude: d.latitude,
    account_unit: d.Unite_de_compte
  };
}).then(data => {
    // Sort the data
    data = data.sort((a, b) => d3.ascending(a.geographical_area, b.geographical_area) || d3.ascending(a.year, b.year));
  
    // Move the color scale here to share with both charts
    const areas = Array.from(new Set(data.map(d => d.geographical_area))).sort();
    const customColors = [
      "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
      "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
    ];
    
    const colors = d3.scaleOrdinal()
      .domain(areas)
      .range(customColors);
    
    console.log(data);
  
    // Set default year to 2020
    const defaultYear = 2020;
  
    // Filter regions that have data for the default year
    const regionsForDefaultYear = data
      .filter(d => d.year === defaultYear)
      .map(d => d.geographical_area);
    const uniqueRegions = Array.from(new Set(regionsForDefaultYear)).sort(d3.ascending);

    const uniqueYears = Array.from(new Set(data.map(d => d.year))).sort(d3.ascending);
  
    // Populate year dropdown
    const yearDropdown = d3.select("#yearDropdown");
    yearDropdown.selectAll("option")
      .data(uniqueYears)
      .join("option")
      .attr("value", d => d)
      .text(d => d)
      .property("selected", d => d === defaultYear); // Set 2020 as default
  
    // Populate region dropdown with valid regions for the default year
    const regionDropdown = d3.select("#regionDropdown");
    regionDropdown.selectAll("option")
      .data(uniqueRegions)
      .join("option")
      .attr("value", d => d)
      .text(d => d);
  
    // Call the pie chart creation function with defaults
    createPieChart(data, colors);
  
    // Trigger an update for the default selection
    yearDropdown.dispatch("change");
  });
  

// Pie chart function
const createPieChart = (data, colors) => {
  // Set dimensions and margins
  const width = 400, height = 400;
  const margins = { top: 20, right: 20, bottom: 20, left: 20 };

  const radius = Math.min(width, height) / 2 - margins.top;

  const svg = d3.select("#pie")
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  d3.select("#yearDropdown").on("change", update);
  d3.select("#regionDropdown").on("change", update);

  update();

  function update() {
    // Get the selected year and region
    const year = +d3.select("#yearDropdown").node().value;
    const geographical_area = d3.select("#regionDropdown").node().value;

    // Filter data based on the selected year and region
    const filteredData = data.filter(d => d.year === year && d.geographical_area === geographical_area);

    // If there's no data, display a message and clear the chart
    if (!filteredData.length) {
      console.warn(`No data available for year ${year} and region ${geographical_area}`);
      
      // Clear the pie chart and legend
      svg.selectAll("*").remove();
      d3.select("#legend").remove(); // Remove legend if no data
      
      // Display a no-data message
      d3.select("#messageContainer").remove();  // Remove any existing message container
      d3.select("body")  // Append the message to the body or a specific container
        .append("div")
        .attr("id", "messageContainer")
        .style("font-size", "16px")
        .style("color", "red")
        .style("text-align", "center")
        .style("margin-top", "20px")
        .text(`No data available for year ${year} and region ${geographical_area}`);
      
      return;
    }

    // If there is data, remove the no-data message (if it exists)
    d3.select("#messageContainer").remove();

    // Aggregate the data by indicator
    const aggregatedData = d3.rollups(
      filteredData,
      v => d3.sum(v, d => +d.value),
      d => d.indicator
    ).map(([key, value]) => ({ key, value }));

    // Compute total for percentage calculations
    const totalValue = d3.sum(aggregatedData, d => d.value);

    // Join the data to pie slices
    const pieData = pie(aggregatedData);

    // Draw or update pie slices
    const slices = svg.selectAll("path").data(pieData);

    slices.join(
      enter => enter.append("path")
        .attr("d", arc)
        .attr("fill", d => colors(d.data.key))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        // .append("title") // Tooltip
        .text(d => `${d.data.key}: ${(d.data.value / totalValue * 100).toFixed(2)}%`),
      update => update.transition()
        .duration(750)
        .attr("d", arc)
        .attr("fill", d => colors(d.data.key)),
      exit => exit.remove()
    );

    // Add hover effect
    slices.on("mouseover", function(event, d) {
      // Highlight the slice on hover
      d3.select(this)
        .transition()
        .duration(300)
        .attr("transform", "scale(1.1)")  // Slightly enlarge the slice
        .style("cursor", "pointer");

      // Show additional information on hover (e.g., a tooltip)
      d3.select("#tooltip")
        .style("visibility", "visible")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`${d.data.key}: ${(d.data.value / totalValue * 100).toFixed(2)}%`);
    });

    slices.on("mouseout", function() {
      // Reset the slice style after mouseout
      d3.select(this)
        .transition()
        .duration(300)
        .attr("transform", "scale(1)")  // Reset scale
        .style("cursor", "default");

      // Hide the tooltip
      d3.select("#tooltip")
        .style("visibility", "hidden");
    });

    // --- Add a Legend ---
    // Remove any previous legend
    d3.select("#legend").remove();

    // Sort the aggregated data in descending order by value
    aggregatedData.sort((a, b) => b.value - a.value);

    // Create a legend container
    const legend = d3.select("#pie")
      .append("div")
      .attr("id", "legend")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("margin-left", "420px") // Adjust position to the right of the pie chart
      .style("font-size", "12px")
      .style("color", "#333");

    // Append legend items
    legend.selectAll("div")
      .data(aggregatedData)
      .enter()
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "5px")
      .html(d => `
        <div style="width: 12px; height: 12px; background-color: ${colors(d.key)}; margin-right: 8px;"></div>
        <div>${d.key}: ${(d.value / totalValue * 100).toFixed(2)}%</div>
      `);
  }
};
