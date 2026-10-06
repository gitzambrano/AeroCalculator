import json
from pathlib import Path

WEB_SHORT_MARKUP = {
    "Hp": "H<sub>p</sub>",
    "Hg": "H<sub>g</sub>",
    "Sref": "S<sub>ref</sub>",
    "cref": "c<sub>ref</sub>",
    "CLmax": "C<sub>L,max</sub>",
    "NzPullup": "N<sub>z</sub> (Pull-up)",
    "NzTurn": "N<sub>z</sub> (Turn)",
    "Pressure Altitude": "H<sub>p</sub>",
    "Geometric Altitude": "H<sub>g</sub>",
    "Density Altitude": "H<sub>ρ</sub>",
    "Temperature Altitude": "H<sub>T</sub>",
    "Total Temperature": "T<sub>t</sub>",
    "Stall Speed Vs": "V<sub>s</sub>",
    "Vs Factor": "V<sub>s</sub> Factor",
    "Lift Coefficient CL": "C<sub>L</sub>",
}

def main():
    catalog_path = Path("docs/quantity_catalog.json")
    if not catalog_path.exists():
        print("Catalog not found")
        return
    with open(catalog_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    lines = [
        "// Auto-generated catalog from docs/quantity_catalog.json",
        "export interface CatalogItem {",
        "  title: string;",
        "  desc: string;",
        "  eq: string;",
        "  model: string;",
        "  unit: string;",
        "}",
        "",
        "export const CATALOG: Record<string, CatalogItem> = {"
    ]

    seen = set()
    for section in ["results", "inputs"]:
        for k, v in data.get(section, {}).items():
            if k in seen:
                continue
            seen.add(k)
            full = v.get("full", k)
            short = v.get("short", k)
            display_short = WEB_SHORT_MARKUP.get(k, WEB_SHORT_MARKUP.get(short, short))
            title = f"{full} • {display_short}"
            desc = v.get("definition", "")
            eq = v.get("equation", "")
            model = v.get("limits", "")
            unit = v.get("unit", "")
            lines.append(f"  {json.dumps(k)}: {{")
            lines.append(f"    title: {json.dumps(title)},")
            lines.append(f"    desc: {json.dumps(desc)},")
            lines.append(f"    eq: {json.dumps(eq)},")
            lines.append(f"    model: {json.dumps(model)},")
            lines.append(f"    unit: {json.dumps(unit)},")
            lines.append("  },")

    # Add airplane profile entry
    lines.append('  "Aircraft Profile": {')
    lines.append('    title: "Aircraft Profile • Geometry & Weights",')
    lines.append('    desc: "Saved aircraft aerodynamic and mass configuration. Supplies reference wing area Sref, mean aerodynamic chord cref, operating weights, and flap CLmax values.",')
    lines.append('    eq: "L = q \\\\cdot S_{\\\\mathrm{ref}} \\\\cdot C_L",')
    lines.append('    model: "Saved profiles are preserved in local storage and can be exported or imported.",')
    lines.append('    unit: "m², m, kg",')
    lines.append('  },')

    lines.append("};")
    lines.append("")

    out_path = Path("web/src/catalog.ts")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("Successfully generated web/src/catalog.ts")

if __name__ == "__main__":
    main()
