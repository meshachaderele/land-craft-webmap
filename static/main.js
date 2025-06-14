let map = L.map('map').setView([56, 10], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);


const variableSuffixMap = {
        N2O: "Emissions (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        NO3: "Leaching (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        DON_NH4: "Leaching (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        N2: "Emissions (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        NH3: "Volatilization (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        Dep: "N-Deposition (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        BNF: "Biological N Fixation (kt N<sub>2</sub>O-N yr<sup>-1</sup>)",
        Fert: "N-Fertilized (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        Harv: "N-Harvested (t N<sub>2</sub>O-N yr<sup>-1</sup>)",
        NO: "Emissions (t N<sub>2</sub>O-N yr<sup>-1</sup>)"
    };
const variableLabelMap = {
    N2O: "N<sub>2</sub>O",
    NO3: "NO<sub>3</sub>",
    DON_NH4: "DON + NH<sub>4</sub>",
    N2: "N<sub>2</sub>",
    NH3: "NH<sub>3</sub>",
    Dep: "",
    BNF: "",
    Fert: "",
    Harv: "",
    NO: "NO"
};


const landuseLabelMap = {
    cropgrass: "Crop & Grass Category",
    forest: "Forest Category",
    livestock: "Livestock Category",
};

const levelLabelMap = {
    national: "",
    region: "",
    kommune: "",
    treparter: "Treparter:",
    coastal_catchment: "Coastal Catchment:",
    id15_catchment: "ID15:"
};



// Add the GeoSearch control for searching locations
const provider = new window.GeoSearch.OpenStreetMapProvider();
const searchControl = new window.GeoSearch.GeoSearchControl({
    provider: provider,
    style: 'bar',
    autoComplete: true,
    autoCompleteDelay: 250,
    searchLabel: 'Search for Geo location'
});


function plotNitrogenBudget(container, Ger_input_dict, Ger_output_dict, year = 'average', title = "Full Nitrogen Budget") {
    const isMobile = window.innerWidth <= 768;
    const N_in_list = ['Fert', 'Dep', 'BNF'];
    const N_emit_list = ['N2O', 'NH3', 'N2', 'NO'];
    const N_out_list = ['Harv', 'NO3', 'DON_NH4'].concat(N_emit_list);

    const colour_dict = {
        'Fert': 'maroon', 'Dep': 'maroon', 'BNF': 'maroon',
        'Harv': 'green',
        'NO3': 'blue', 'DON_NH4': 'blue',
        'N2O': 'red', 'NH3': 'red', 'N2': 'red', 'NO': 'red'
    };

    const label_dict = {
        'Fert': 'Fert', 'Dep': 'Dep', 'BNF': 'BNF',
        'Harv': 'Harv', 'NO3': 'NO₃', 'DON_NH4': 'DON+NH₄',
        'N2O': 'N₂O', 'NH3': 'NH₃', 'N2': 'N₂', 'NO': 'NO'
    };

    let xval_list = [], N_top_list = [], N_bottom_list = [], colour_list = [], label_list = [];
    let x_counter = 1, dx_counter = 0.5, Nrunning_sum = 0;
    let Nsurp = null;

    function append_flux(name, value, is_input) {
        xval_list.push(x_counter);
        N_bottom_list.push(Nrunning_sum);
        let N_top = is_input ? Nrunning_sum + value : Nrunning_sum - value;
        N_top_list.push(N_top);
        colour_list.push(colour_dict[name] || 'gray');
        label_list.push(label_dict[name] || name);
        x_counter += dx_counter;
        Nrunning_sum = N_top;
        if (name === 'Harv') Nsurp = N_top;
    }

    N_in_list.forEach(name => append_flux(name, Ger_input_dict[name], true));
    N_out_list.forEach(name => append_flux(name, Ger_output_dict[name], false));

    let traces = [];
    let annotations = [];

    for (let i = 0; i < xval_list.length; i++) {
        let x = xval_list[i];
        let delta = N_top_list[i] - N_bottom_list[i];

        // Horizontal line
        traces.push({
            type: 'scatter',
            x: [x, x + dx_counter],
            y: [N_top_list[i], N_top_list[i]],
            mode: 'lines',
            line: { color: colour_list[i], width: 2 },
            opacity: 0.5,
            showlegend: false
        });

        // Arrow
        annotations.push({
            x: x, y: N_top_list[i], ax: x, ay: N_bottom_list[i],
            xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
            showarrow: true,
            arrowhead: 1,
            arrowsize: 0.5,
            arrowwidth: isMobile ? 2 : 3.5,
            arrowcolor: colour_list[i]
        });

        // Value label
        annotations.push({
            x: x,
            y: N_top_list[i] + (delta > 0 ? 2 : -6),
            text: `${Math.abs(delta).toFixed(2)}`,
            showarrow: false,
            font: { color: colour_list[i], size: isMobile ? 8 : 12},
            xanchor: 'center'
        });
    }

    // N surplus
    annotations.push({
        x: 2.8, y: Nsurp, ax: 2.8, ay: 0,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 1, arrowsize: 0.5, arrowwidth: isMobile ? 2 : 3.5, arrowcolor: 'black'
    });
    annotations.push({
        x: 2.65, y: Nsurp / 2,
        text: `N surplus<br>${Nsurp.toFixed(2)}`,
        showarrow: false,
        textangle: -90,
        font: { size: isMobile ? 8 : 12 }
    });

    // ΔN
    const delta_n = N_top_list[N_top_list.length - 1];
    const x_dN = xval_list[xval_list.length - 1] + dx_counter;
    annotations.push({
        x: x_dN, y: delta_n, ax: x_dN, ay: 0,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 1, arrowsize: 0.5, arrowwidth: isMobile ? 2 : 3.5, arrowcolor: 'black'
    });
    annotations.push({
        x: x_dN + 0.2, y: delta_n / 2,
        text: `ΔN<br>${delta_n.toFixed(2)}`,
        showarrow: false, textangle: -90,
        font: { size: isMobile ? 8 : 12 }
    });

    // N loss line
    traces.push({
        type: 'scatter',
        x: [3, x_dN],
        y: [Nsurp, Nsurp],
        mode: 'lines',
        line: { color: 'green', dash: 'dash', width: 2 },
        showlegend: false
    });

    // N loss arrow
    const x_arrow = xval_list[xval_list.length - 1] + 0.5 * dx_counter;
    const y_tail = N_top_list[N_top_list.length - 1];
    const y_head = Nsurp;
    const delta_y = y_head - y_tail;
    annotations.push({
        x: x_arrow, y: y_head, ax: x_arrow, ay: y_tail,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 1, arrowsize: 0.5, arrowwidth: isMobile ? 2 : 3.5, arrowcolor: 'black'
    });
    annotations.push({
        x: x_arrow - 0.15, y: y_tail + delta_y / 2,
        text: `N loss<br>${delta_y.toFixed(2)}`,
        showarrow: false, textangle: -90,
        font: { size: isMobile ? 8 : 12, color: 'black' }, align: 'center'
    });

    

    Plotly.newPlot(container, traces, {
        title: {
                text: title,
                font: {
                    size: isMobile ? 10 : 18
                }},
        annotations: annotations,
        xaxis: {
            //automargin: true,
            tickmode: 'array',
            tickvals: xval_list.concat([x_dN]),
            ticktext: label_list.concat(['']),
            tickfont: { size: isMobile ? 8 : 12 },
            showgrid: true,
            gridcolor: 'lightgray',
            showline: true,
            linecolor: 'black',
            linewidth: 2,
            zeroline: true,
            zerolinecolor: 'black',
            zerolinewidth: 1,
            ticks: 'outside', ticklen: 6, tickwidth: 2, tickcolor: 'black'
        },
        yaxis: {
            tickfont: { size: isMobile ? 8 : 12 },
            automargin: true,
            title: {
                    text: 'Cumulative N flux [kt N2O-N yr⁻¹]',
                    font: {
                        size: isMobile ? 10 : 14
                    }},
            showgrid: true,
            gridcolor: 'lightgray',
            showline: true,
            linecolor: 'black',
            linewidth: 2,
            zeroline: true,
            zerolinecolor: 'black',
            zerolinewidth: 1,
            ticks: 'outside', ticklen: 6, tickwidth: 2, tickcolor: 'black'
        },
        plot_bgcolor: 'white',
        width: isMobile ? 400 : undefined,
        height: isMobile ? 300 : undefined,
        margin: {t: isMobile ? 40 : 60,
                    b: isMobile ? 30 : 30,
                    l: isMobile ? 10 : 10,
                    r: isMobile ? 10 : 10}
    }, {responsive: true});
}




function searchFeature() {
    const query = document.getElementById("custom-search").value.trim();
    const level = document.getElementById("level").value;

    if (!query) {
        alert("Please enter a search value.");
        return;
    }

    if (!geoLayer) {
        alert("Map layer not loaded yet.");
        return;
    }

    const propertyMap = {
        national: "NAME_0",
        region: "REGIONNAVN",
        kommune: "NAME_2",
        treparter: "ogc_fid",
        coastal_catchment: "IdKystvand",
        id15_catchment: "Id15_oplan"
    };

    const propName = propertyMap[level];

    if (!propName) {
        alert("Search not supported for selected level.");
        return;
    }

    let found = false;
    geoLayer.eachLayer(layer => {
        const props = layer.feature.properties;
        const value = String(props[propName]);

        if (value.toLowerCase() === query.toLowerCase()) {
            found = true;
            map.fitBounds(layer.getBounds());

            // Highlight the matched feature
            layer.setStyle({
                weight: 3,
                color: '#ff0000',
                fillOpacity: 0.9
            });

            // Reset style after 3 seconds
            setTimeout(() => geoLayer.resetStyle(layer), 3000);

            // Trigger chart popup
            layer.fire('click');
        }
    });

    if (!found) {
        alert(`No matching feature found for "${query}" in ${levelLabelMap[level] || level}.`);
    }
}




map.addControl(searchControl);

const lowColor = "#370F90";
const highColor = "#F1F637";
const NUM_BINS = 10;

let bins = [];
let colors = [];
let maxVal = 0;


let geoLayer;

function interpolateColor(color1, color2, factor) {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `rgb(${r},${g},${b})`;
}


function getColor(value) {
    for (let i = NUM_BINS - 1; i >= 0; i--) {
        if (value >= bins[i]) return colors[i];
    }
    return colors[0];
}


function loadMapLayer() {
    if (geoLayer) map.removeLayer(geoLayer);

    const level = document.getElementById("level").value;
    const variable = document.getElementById("variable").value;
    const landuse = document.getElementById("landuse").value;

    // ✅ HANDLE full_n_budget separately
    if (variable === "full_n_budget") {
    fetch(`/geojson/${level}`)
        .then(res => res.json())
        .then(data => {
            const propertyMap = {
                national: "NAME_0",
                region: "REGIONNAVN",
                kommune: "NAME_2",
                treparter: "ogc_fid",
                coastal_catchment: "IdKystvand",
                id15_catchment: "Id15_oplan"
            };

            let totalMap = new Map(); // Use let so we can reassign it

            fetch(`/all_n_surplus?level=${level}&landuse=${landuse}`)
                .then(res => res.json())
                .then(allNsurplus => {
                    const values = Object.values(allNsurplus);
                    const minVal = Math.min(...values);
                    const maxVal = Math.max(...values);
                    const binSize = (maxVal - minVal) / NUM_BINS;

                    bins = [];
                    colors = [];
                    for (let i = 0; i < NUM_BINS; i++) {
                        bins.push(minVal + i * binSize);
                        colors.push(interpolateColor(lowColor, highColor, i / (NUM_BINS - 1)));
                    }

                    totalMap = new Map(Object.entries(allNsurplus)); // Now we reassign safely

                    geoLayer = L.geoJSON(data, {
                        style: feature => {
                            const name = String(feature.properties[propertyMap[level]]);
                            const value = totalMap.get(name) || 0;
                            return {
                                fillColor: getColor(value),
                                weight: 0.5,
                                opacity: 1,
                                color: 'grey',
                                fillOpacity: 0.7
                            };
                        },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function () {
                            const name = String(feature.properties[propertyMap[level]]);

                            // 🔥 Plot only when clicked — fetch image only
                            fetch(`/full-n-chart-data?level=${level}&name=${encodeURIComponent(name)}&landuse=${landuse}`)
                                .then(res => res.json())
                                .then(data => {
                                    const div = document.createElement("div");
                                    div.className = "popup-chart";

                                    const isMobile = window.innerWidth <= 768;

                                   const  title_p = `${landuseLabelMap[landuse]}<br>${levelLabelMap[level]}${name}`;

                                    // No need to set div.style.width/height explicitly
                                    plotNitrogenBudget(div, data.input, data.output, 'average', title_p);

                                    // Wait for Plotly to render before calculating offset
                                    setTimeout(() => {
                                        const popupWidth = div.offsetWidth;
                                        const center = map.getCenter();

                                        const popup = L.popup({
                                            closeButton: true,
                                            autoClose: true,
                                            className: 'custom-chart-popup',
                                            offset: L.point(-350, 0),  // dynamically center based on rendered width
                                            maxWidth: popupWidth
                                        })
                                        .setLatLng(center)
                                        .setContent(div)
                                        .openOn(map);

                                        map.on('popupclose', () => div.remove());
                                    }, 100); // Give Plotly time to render
                                })
                                .catch(err => console.error("Failed to load nitrogen chart data:", err));




                        });
                    }

                }).addTo(map);

                legend.remove();
                legend.addTo(map);
            });
        });

    return;
}


 


    fetch(`/totals?level=${level}&variable=${variable}`)
        .then(res => res.json())
        .then(totals => {
            const propertyMap = {
            national: "NAME_0",
            region: "REGIONNAVN",
            kommune: "NAME_2",
            treparter: "ogc_fid",
            coastal_catchment: "IdKystvand",
            id15_catchment: "Id15_oplan"
            };

            const propertyName = propertyMap[level];
            const totalMap = new Map();
            const allValues = [];

            totals.forEach(d => {
                const key = d[propertyName] || d[level];  // fallback if backend doesn't use propertyName
                if (key != null) {
                    totalMap.set(String(key), d[variable]);
                    allValues.push(d[variable]);
                }
            });

            //totals.forEach(d => {
                //totalMap.set(d[level], d[variable]);
                //allValues.push(d[variable]);
            //});

            const minVal = Math.min(...allValues);
            maxVal = Math.max(...allValues);
            const binSize = (maxVal - minVal) / NUM_BINS;

            bins = [];
            colors = [];
            for (let i = 0; i < NUM_BINS; i++) {
                bins.push(minVal + i * binSize);
                colors.push(interpolateColor(lowColor, highColor, i / (NUM_BINS - 1)));
            }

            fetch(`/geojson/${level}`)
                .then(res => res.json())
                .then(data => {
                    geoLayer = L.geoJSON(data, {
                        style: feature => {
                            /* const propertyMap = {
                                national: "NAME_0",
                                region: "REGIONNAVN",
                                kommune: "NAME_2",
                                treparter: "ogc_fid",
                                coastal_catchment: "IdKystvand",
                                id15_catchment: "Id15_oplan"
                            }; */
                            

                            //const name = String(feature.properties[propertyMap[level]] || "Unknown");
                            const name = String(feature.properties[propertyName] || "Unknown");
                            const value = totalMap.get(name) || 0;
                            return {
                                fillColor: getColor(value),
                                weight: 1,
                                opacity: 1,
                                color: '#333333',
                                fillOpacity: 0.7
                            };
                        },
                        onEachFeature: function (feature, layer) {
                            layer.on('click', function () {
                                const propertyMap = {
                                national: "NAME_0",
                                region: "REGIONNAVN",
                                kommune: "NAME_2",
                                treparter: "ogc_fid",
                                coastal_catchment: "IdKystvand",
                                id15_catchment: "Id15_oplan"
                            };

                       

                            const name = String(feature.properties[propertyMap[level]] || "Unknown");
                            
                                fetch(`/chart-data?level=${level}&name=${encodeURIComponent(name)}&variable=${variable}&landuse=${landuse}`)
                                    .then(res => res.json())
                                    .then(data => {
                                        const years = data.map(d => d.year);
                                        const values = data.map(d => d[variable]);
                                        const div = document.createElement('div');
                                        div.className = 'popup-chart';
                                        
                                        const isMobile = window.innerWidth <= 768;
                                        const titleFontSize = isMobile ? 10 : 18;
                                        const isNational = level === "national";
                                        const suffix = isNational ? "(kt N yr⁻¹)" : variableSuffixMap[variable];
                                        

                                        Plotly.newPlot(div, [{
                                            x: years,
                                            y: values,
                                            type: 'scatter',
                                            mode: 'lines+markers',
                                            line: { color: '#007BFF' },
                                            marker: { color: '#FF5733', size: 10 },
                                        }], {
                                            title: {
                                                text: `${landuseLabelMap[landuse]}<br>${levelLabelMap[level]}${name}`,
                                                font: {
                                                size: titleFontSize
                                                }
                                            },
                                            height: isMobile ? 300 : undefined,
                                            width: isMobile ? 400 : undefined,
                                          
                                            margin: {
                                                t: isMobile ? 40 : 60,
                                                b: isMobile ? 30 : 30,
                                                l: isMobile ? 30 : 40,
                                                r: isMobile ? 10 : 10
                                            },
                                            xaxis: {
                                                tickfont: { size: isMobile ? 8 : 12 },
                                                automargin: true,
                                                tickvals: years
                                                
                                            },
                                            yaxis: {
                                                tickfont: { size: isMobile ? 8 : 12 },
                                                automargin: true,
                                                title: {
                                                    text: `${variableLabelMap[variable]} ${suffix}`,
                                                    font: {
                                                        size: isMobile ? 10 : 14
                                                    }
                                                },
                                            }
                                        },{responsive: true});
                                        // layer.bindPopup(div).openPopup();
                                        setTimeout(() => {
                                        const center = map.getCenter();
                                        L.popup({
                                            closeButton: true,
                                            autoClose: true,
                                            className: 'custom-chart-popup',
                                            offset: L.point(-200, 0)
                                        })
                                        .setLatLng(center)
                                        .setContent(div)
                                        .openOn(map);
                                        console.log(document.querySelector('.leaflet-popup-close-button'));
                                        }, 100);

                                        
                                    });
                            });
                        }
                    }).addTo(map);

                    // Refresh legend
                    legend.remove();
                    legend.addTo(map);
                });
        });
}


// Legend Control
/* function formatLegendValue(val) {
    if (val == null || isNaN(val)) return "–";
    if (val >= 1) return val.toFixed(1);
    if (val >= 0.01) return val.toFixed(2);
    //return val.toExponential(2); // fallback for very small values
    return val
} */
    function formatLegendValue(val) {
        if (val == null || isNaN(val)) return "–";
        return Number(val).toFixed(2);
    }


const legend = L.control({ position: 'topright' });

legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.style.zIndex = '0';

    const level = document.getElementById("level").value;

    const variable = document.getElementById("variable").value;

    // Provide default bins/colors if none exist yet
    const safeBins = bins.length === NUM_BINS ? bins : [0, 0.00, 0.00, 0.00, 0.0, 0, 0.00, 0.00, 0.00, 0.0];
    const safeColors = colors.length === NUM_BINS ? colors : ['#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0', '#FFEDA0'];
    const isFullBudget = variable === "full_n_budget";
    const isNational = level === "national";
    const variableLabel = isFullBudget ? "N Surplus" : (variableLabelMap[variable] || "Variable");
    //const variableSuffix = isFullBudget ? "(kg N ha⁻¹ yr⁻¹)" : (variableSuffixMap[variable] || "(kt N yr⁻¹)");
    const variableSuffix = isFullBudget
  ? "(t N ha⁻¹ yr⁻¹)"
  : isNational
    ? "(kt N yr⁻¹)"
    : (variableSuffixMap[variable] || "(kt N yr⁻¹)");

    div.innerHTML += `<b>Average Cummulative ${variableLabel} <span style="display: block;">${variableSuffix}</span></b><br>`;
 

    for (let i = NUM_BINS - 1; i >= 0; i--) {
        const from = formatLegendValue(safeBins[i]);
        const to = safeBins[i + 1] ? formatLegendValue(safeBins[i + 1]) : formatLegendValue(maxVal);
        div.innerHTML += `<i style="background:${safeColors[i]}"></i> ${from}&ndash;${to}<br>`;
    }

    return div;
};

legend.addTo(map);

// Auto-load Kommune layer on page load
window.onload = loadMapLayer;


