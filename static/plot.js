function plotNitrogenBudget(container, Ger_input_dict, Ger_output_dict, year = 'average', title = 'Full Nitrogen Budget') {
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

    N_in_list.forEach(name => append_flux(name, Ger_input_dict[name][year], true));
    N_out_list.forEach(name => append_flux(name, Ger_output_dict[name][year], false));

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
            arrowwidth: 3.5,
            arrowcolor: colour_list[i]
        });

        // Value label
        annotations.push({
            x: x,
            y: N_top_list[i] + (delta > 0 ? 2 : -6),
            text: `${Math.abs(delta).toFixed(2)}`,
            showarrow: false,
            font: { color: colour_list[i], size: 14 },
            xanchor: 'center'
        });
    }

    // N surplus
    annotations.push({
        x: 2.8, y: Nsurp, ax: 2.8, ay: 0,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 1, arrowsize: 0.5, arrowwidth: 3.5, arrowcolor: 'black'
    });
    annotations.push({
        x: 2.65, y: Nsurp / 2,
        text: `N surplus<br>${Nsurp.toFixed(2)}`,
        showarrow: false,
        textangle: -90,
        font: { size: 14 }
    });

    // ΔN
    const delta_n = N_top_list[N_top_list.length - 1];
    const x_dN = xval_list[xval_list.length - 1] + dx_counter;
    annotations.push({
        x: x_dN, y: delta_n, ax: x_dN, ay: 0,
        xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, arrowhead: 1, arrowsize: 0.5, arrowwidth: 3.5, arrowcolor: 'black'
    });
    annotations.push({
        x: x_dN + 0.2, y: delta_n / 2,
        text: `ΔN<br>${delta_n.toFixed(2)}`,
        showarrow: false, textangle: -90,
        font: { size: 14 }
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
        showarrow: true, arrowhead: 1, arrowsize: 0.5, arrowwidth: 3.5, arrowcolor: 'black'
    });
    annotations.push({
        x: x_arrow - 0.15, y: y_tail + delta_y / 2,
        text: `N loss<br>${delta_y.toFixed(2)}`,
        showarrow: false, textangle: -90,
        font: { size: 14, color: 'black' }, align: 'center'
    });

    Plotly.newPlot(container, traces, {
        title: title,
        annotations: annotations,
        xaxis: {
            tickmode: 'array',
            tickvals: xval_list.concat([x_dN]),
            ticktext: label_list.concat(['']),
            tickfont: { size: 14 },
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
            title: 'Cumulative N flux [kgNha⁻¹yr⁻¹]',
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
        width: 800,
        height: 700,
        margin: { t: 80, b: 80, l: 80, r: 80 }
    });
}


