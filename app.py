from flask import Flask, render_template, jsonify, request
import geopandas as gpd
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # ✅ Use non-GUI backend for servers
import matplotlib.pyplot as plt

import io
import base64

app = Flask(__name__)

# Load data once at startup
kommune_geo = gpd.read_file("data/kommune.geojson")
region_geo = gpd.read_file("data/region2.geojson")
treparter_geo = gpd.read_file("data/treparter.geojson")
id15_geo = gpd.read_file("data/id15.geojson")
coastal_geo = gpd.read_file("data/coastal.geojson")
national_geo = gpd.read_file("data/national.geojson")
emissions_df = pd.read_parquet("data/data_aggregated.parquet")


# Valid options
valid_levels = ["national", "kommune", "region", "treparter", "id15_catchment", "coastal_catchment"]
valid_variables = ["N2O", "NO3", "N2", "DON_NH4", "NH3", "Dep", "BNF", "Fert", "Harv", "NO"]

"""
def get_n_budget_dicts(df, level, name, landuse):
    valid_variables = ["N2O", "NO3", "N2", "NH3", 'DON_NH4', "Dep", "BNF", "Fert", "Harv", "NO"]

    if landuse:
        df = df[df["landuse"] == landuse]

    if level == "national":
        subset = df.groupby("year")[valid_variables].sum()
    else:
        df[level] = df[level].astype(str)
        subset = df[df[level] == name].groupby("year")[valid_variables].sum()

    avg = subset.mean()

    Ger_input_dict = {
        k: {'average': avg[k] / KG_TO_KILOTONNE}
        for k in ["Fert", "Dep", "BNF"]
    }
    Ger_output_dict = {
        k: {'average': avg[k] / KG_TO_KILOTONNE}
        for k in ["Harv", "NO3", "DON_NH4", "N2O", "NH3", "N2", "NO"]
    }

    return Ger_input_dict, Ger_output_dict

"""

import json

with open("data/n_budget_dicts_updt.json") as f:
    n_budget_data = json.load(f)

def get_n_budget_from_json(level, name, landuse):
    key = f"{level}__{name if level != 'national' else 'ALL'}__{landuse}"
    entry = n_budget_data.get(key)

    if entry:
        return entry["input"], entry["output"]
    else:
        return {}, {}  # or raise Exception("Key not found")



@app.route("/")
def index():
    return render_template("index.html")

@app.route("/geojson/<level>")
def geojson(level):
    if level == "national":
        return national_geo[["NAME_0", "geometry"]].to_json()
    elif level == "kommune":
        return kommune_geo[["NAME_2", "geometry"]].to_json()
    elif level == "region":
        return region_geo[["REGIONNAVN", "geometry"]].to_json()
    elif level == "treparter":
        treparter_geo["ogc_fid"] = treparter_geo["ogc_fid"].astype(str)
        return treparter_geo[["ogc_fid", "geometry"]].to_json()
    elif level == "id15_catchment":
        return id15_geo[["Id15_oplan", "geometry"]].to_json()
    elif level == "coastal_catchment":
        return coastal_geo[["IdKystvand", "geometry"]].to_json()
    
    return jsonify({"error": "Invalid level"}), 400


TONNE = 1e3  # constant for conversion
KG_TO_KILOTONNE = 1e6

@app.route("/chart-data")
def chart_data():
    level = request.args.get("level")
    name = request.args.get("name")
    variable = request.args.get("variable")
    landuse = request.args.get("landuse")

    if not all([level, variable, landuse]):
        return jsonify({"error": "Missing parameters"}), 400

    if level not in valid_levels + ["national"] or variable not in valid_variables:
        return jsonify({"error": "Invalid parameters"}), 400

    df = emissions_df.copy()
    if landuse:
        df = df[df["landuse"] == landuse]

    if level == "national":
        subset = df.groupby("year")[variable].sum().reset_index()
        subset[variable] = subset[variable] / KG_TO_KILOTONNE  # kg → kt
        return jsonify(subset.to_dict(orient="records"))

    if not name:
        return jsonify({"error": "Missing 'name' parameter for non-national levels"}), 400

    df[level] = df[level].astype(str)
    subset = df[df[level] == name].groupby("year")[variable].sum().reset_index()
    subset[variable] = subset[variable] / TONNE  # kg → t
    return jsonify(subset.to_dict(orient="records"))


@app.route("/full-n-chart-data")
def full_n_plot():
    level = request.args.get("level")
    name = request.args.get("name")
    landuse = request.args.get("landuse")

    valid_levels = ["kommune", "region", "treparter", "id15_catchment", "coastal_catchment", "national"]

    # Validate required parameters
    if not level or not landuse:
        return jsonify({"error": "Missing required parameters: 'level' and 'landuse'"}), 400

    if level != "national" and not name:
        return jsonify({"error": "Missing 'name' parameter for non-national level"}), 400

    if level not in valid_levels:
        return jsonify({"error": f"Invalid level: {level}"}), 400

    # Get precomputed N budget data from JSON
    Ger_input_dict, Ger_output_dict = get_n_budget_from_json(level, name, landuse)

    if not Ger_input_dict or not Ger_output_dict:
        return jsonify({"error": "No data found for the provided parameters"}), 404

    return jsonify({
        "input": Ger_input_dict,
        "output": Ger_output_dict
    })

# at country level, kilotonnes and tonnes for other levels


@app.route("/all_delta_n")
def all_delta_n():
    level = request.args.get("level")
    landuse = request.args.get("landuse")

    if not all([level, landuse]):
        return jsonify({"error": "Missing 'level' or 'landuse' parameter"}), 400

    if level not in valid_levels:
        return jsonify({"error": "Invalid level"}), 400

    results = {}
    prefix = f"{level}__"
    suffix = f"__{landuse}"

    for key in n_budget_data:
        if key.startswith(prefix) and key.endswith(suffix):
            parts = key.split("__")
            if len(parts) == 3:
                name = parts[1]
                delta_n = n_budget_data[key].get("delta_n")
                if delta_n is not None:
                    results[name] = round(delta_n, 2)

    return jsonify(results)





@app.route("/totals")
def totals():
    level = request.args.get("level")
    variable = request.args.get("variable")
    landuse = request.args.get("landuse")
    

    if not variable or variable not in valid_variables:
        return jsonify({"error": "Missing or invalid variable"}), 400

    df = emissions_df.copy()
    if landuse:
        df = df[df["landuse"] == landuse]

    if level == "national":
        yearly_totals = df.groupby('year')[variable].sum().reset_index()
        total = yearly_totals[variable].mean()
        total = float(total / KG_TO_KILOTONNE)
        return jsonify([{"national": "Denmark", variable: float(total)}])

    if level not in valid_levels:
        return jsonify({"error": "Invalid level"}), 400

    yearly_totals = df.groupby([level, 'year'])[variable].sum().reset_index()
    totals = yearly_totals.groupby(level)[variable].mean().reset_index()
    totals[variable] = (totals[variable] / TONNE).astype(float)  # kg → kt
    return jsonify(totals.to_dict(orient="records"))



if __name__ == "__main__":
    app.run(debug=True)

