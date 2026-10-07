import { describe, expect, it } from "vitest";
import { KEY_EQUATIONS_LATEX, renderEquationLaTeX } from "./math-renderer";

describe("math-renderer with KaTeX", () => {
  it("renders canonical TAS equation using KaTeX", () => {
    const html = renderEquationLaTeX("TAS");
    expect(html).toContain("katex");
    expect(html).toContain("TAS");
    expect(html).toContain("M");
  });

  it("renders CAS equation with square root and fraction", () => {
    const html = renderEquationLaTeX("CAS");
    expect(html).toContain("katex");
    expect(html).toContain("CAS");
  });

  it("renders Qdyn equation", () => {
    const html = renderEquationLaTeX("Qdyn");
    expect(html).toContain("katex");
    expect(html).toContain("TAS");
  });

  it("renders Lift Force equation", () => {
    const html = renderEquationLaTeX("Lift Force");
    expect(html).toContain("katex");
  });

  it("has LaTeX formulas for key input and result variables", () => {
    const essentialKeys = ["Hp", "CAS", "TAS", "Mach", "CL", "Qdyn", "Qc", "Reynolds", "Weight", "Sref", "cref", "CLmax", "NzPullup", "BankTurn", "HeadWind", "CrossWind"];
    for (const k of essentialKeys) {
      expect(KEY_EQUATIONS_LATEX[k]).toBeDefined();
      const rendered = renderEquationLaTeX(k);
      expect(rendered).toContain("katex");
    }
  });
  it("renders standardized Greek and runway notation without raw LaTeX", () => {
    const keys = ["Delta ISA", "BankTurn", "Sideslip", "Pressure Ratio δ", "Density Ratio σ", "Temperature Ratio θ", "Runway Angle"];
    for (const key of keys) {
      const html = renderEquationLaTeX(key);
      expect(html).toContain("katex");
      expect(html).not.toContain("\\\\text");
    }
    expect(renderEquationLaTeX("Runway Angle")).toContain("RWY");
  });

});
