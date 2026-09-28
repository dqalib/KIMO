import { describe, expect, it } from "vitest";
import { sayFractions } from "../components/FractionText";
import { frLabel } from "./report";

describe("fractions on screen and in the parent report", () => {
  it("reads fractions as words, not dates", () => {
    expect(sayFractions("3/4 of 8 = ?")).toBe("3 quarters of 8 = ?");
    expect(sayFractions("Which is bigger: 1/3 or 1/4?")).toBe("Which is bigger: 1 third or 1 quarter?");
    expect(sayFractions("1/2 = ?/4")).toBe("1 half = ? over 4");
    expect(sayFractions("7/100 as a decimal")).toBe("7 hundredths as a decimal");
  });
  it("labels tricky fraction questions readably", () => {
    expect(frLabel("of:3:4:8")).toBe("3/4 of 8");
    expect(frLabel("eq:1:2:x:4")).toBe("1/2 = ?/4");
    expect(frLabel("add:2:3:7")).toBe("2/7 + 3/7");
    expect(frLabel("howmany:10")).toBe("how many 1/10s make a whole");
  });
});
