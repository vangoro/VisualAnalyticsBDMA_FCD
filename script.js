// Pie chart initialization function
d3.csv("./final_translated_data_V2.csv", d => ({
  value: +d.Valeurs,
  title: d.Titre,
  year: +d.Unite_temps,
  ordinates: d.Ordonnees,
  indicator: d.Indicateur,
  geographical_area: d.Zone_geographique,
})).then(data => {
  // Filter for the year 2023
  const filteredData = data.filter(d => d.year === 2023);
  const regions = Array.from(new Set(filteredData.map(d => d.geographical_area))).sort();

  // Populate the dropdown menu (datalist)
  const regionSuggestions = document.getElementById("regionSuggestions");
  regions.forEach(region => {
      const option = document.createElement("option");
      option.value = region;
      regionSuggestions.appendChild(option);
  });

  // Initialize with the first region and display it
  const defaultRegion = regions[0];
  document.getElementById("regionName").textContent = defaultRegion;  // Set the default region name
  createPieChart(filteredData.filter(d => d.geographical_area === defaultRegion));

  // Event listener for the search button
  document.getElementById("searchButton").addEventListener("click", () => {
      const regionInput = document.getElementById("regionSearch");
      const region = regionInput.value;

      if (regions.includes(region)) {
          console.log(`Selected region: ${region}`);
          // Update the region name display
          document.getElementById("regionName").textContent = region;
          createPieChart(filteredData.filter(d => d.geographical_area === region));
      } else {
          alert("Region not found. Please select a valid region from the dropdown.");
      }
  });
});

// Pie chart function
const createPieChart = data => {
  const width = 400, height = 400;
  const margins = { top: 20, right: 20, bottom: 20, left: 20 };
  const radius = Math.min(width, height) / 2 - margins.top;

  const svg = d3.select("#pie")
      .html("")  // Clear existing chart before appending a new one
      .append("svg")
      .attr("viewBox", [0, 0, width, height])
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);

  // Handle empty data case
  if (!data.length) {
      d3.select("#pie").html("<p>No data available for this selection.</p>");
      return;
  }

  // Aggregate and sort data by value in descending order
  const aggregatedData = d3.rollups(
      data,
      v => d3.sum(v, d => d.value),
      d => d.indicator
  ).map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);

  const totalValue = d3.sum(aggregatedData, d => d.value);
  const pieData = pie(aggregatedData);

  // Create a color scale from light to dark red based on percentage
  const colorScale = d3.scaleSequential()
    .domain([0, d3.max(aggregatedData, d => d.value)])
    .interpolator(d3.interpolateReds); // From light to deep red

  const slices = svg.selectAll("path").data(pieData);

  slices.enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => colorScale(d.data.value))
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .append("title")
      .text(d => `${d.data.key}: ${(d.data.value / totalValue * 100).toFixed(2)}%`);

  slices.exit().remove();

  // Update legend inside #legend div
  const legend = d3.select("#legend").html(""); // Clear existing legend

  legend.selectAll("div")
      .data(aggregatedData)
      .enter()
      .append("div")
      .html(d => `
          <div style="width: 12px; height: 12px; background-color: ${colorScale(d.value)}; margin-right: 8px;"></div>
          <span>${d.key}: ${(d.value / totalValue * 100).toFixed(2)}%</span>
      `);
};
