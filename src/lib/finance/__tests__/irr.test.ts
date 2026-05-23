import { describe, it, expect } from "vitest";
import { irr } from "../irr";

describe("irr — internal rate of return (bisection)", () => {
  it("pays 100 now, returns 110 in 1 year → 10% IRR exact", () => {
    const r = irr([
      { year: 0, amount: -100 },
      { year: 1, amount: 110 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.1, 5);
  });

  it("pays 100 now, returns 121 in 2 years → 10% IRR exact", () => {
    // (1+r)^2 = 1.21 → r = 0.10
    const r = irr([
      { year: 0, amount: -100 },
      { year: 2, amount: 121 },
    ]);
    expect(r!).toBeCloseTo(0.1, 5);
  });

  it("breakeven (pays 100, receives 100 same year) is 0% IRR", () => {
    // Two flows at same year cannot bracket. Use 1-year zero growth.
    const r = irr([
      { year: 0, amount: -100 },
      { year: 1, amount: 100 },
    ]);
    expect(r!).toBeCloseTo(0, 4);
  });

  it("typical endowment shape (₹50k × 20yrs → ₹17L) yields ~4-5%", () => {
    // Classic mis-sold-endowment ballpark — the headline number that
    // motivates the whole product. We assert range, not exact value.
    const flows = [];
    for (let y = 0; y < 20; y++) flows.push({ year: y, amount: -50_000 });
    flows.push({ year: 20, amount: 1_700_000 });
    const r = irr(flows);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.03);
    expect(r!).toBeLessThan(0.05);
  });

  it("returns null when there are no positive cashflows", () => {
    const r = irr([
      { year: 0, amount: -100 },
      { year: 1, amount: -50 },
    ]);
    expect(r).toBeNull();
  });

  it("returns null when there are no negative cashflows", () => {
    const r = irr([
      { year: 0, amount: 100 },
      { year: 1, amount: 50 },
    ]);
    expect(r).toBeNull();
  });

  it("converges within reasonable iterations for a 30-year horizon", () => {
    const flows = [];
    for (let y = 0; y < 30; y++) flows.push({ year: y, amount: -10_000 });
    flows.push({ year: 30, amount: 800_000 });
    const r = irr(flows);
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!)).toBe(true);
  });

  it("handles intermediate inflows (money-back style)", () => {
    // Pay 100/yr for 5 years, receive 50 at y3 and 200 at y10
    const flows = [
      { year: 0, amount: -100 },
      { year: 1, amount: -100 },
      { year: 2, amount: -100 },
      { year: 3, amount: -100 + 50 }, // net
      { year: 4, amount: -100 },
      { year: 10, amount: 200 },
    ];
    const r = irr(flows);
    expect(r).not.toBeNull();
  });
});
