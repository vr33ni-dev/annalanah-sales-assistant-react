import { describe, it, expect } from "vitest";
import { SALES_STAGE, STAGE_LABELS } from "../stages";
import type { SalesStage } from "../stages";

describe("SALES_STAGE constants", () => {
  it("has INITIAL_CONTACT value", () => {
    expect(SALES_STAGE.INITIAL_CONTACT).toBe("initial_contact");
  });

  it("has FOLLOW_UP value", () => {
    expect(SALES_STAGE.FOLLOW_UP).toBe("follow_up");
  });

  it("has CLOSED value", () => {
    expect(SALES_STAGE.CLOSED).toBe("closed");
  });

  it("has LOST value", () => {
    expect(SALES_STAGE.LOST).toBe("lost");
  });

  it("contains exactly four stages", () => {
    expect(Object.keys(SALES_STAGE)).toHaveLength(4);
  });
});

describe("STAGE_LABELS", () => {
  it("maps initial_contact to a German label", () => {
    expect(STAGE_LABELS["initial_contact"]).toBe("Erstgespräch");
  });

  it("maps follow_up to a German label", () => {
    expect(STAGE_LABELS["follow_up"]).toBe("Zweitgespräch");
  });

  it("maps closed to a German label", () => {
    expect(STAGE_LABELS["closed"]).toBe("Abgeschlossen");
  });

  it("maps lost to a German label", () => {
    expect(STAGE_LABELS["lost"]).toBe("Verloren");
  });

  it("has a label for every SALES_STAGE value", () => {
    const stages = Object.values(SALES_STAGE) as SalesStage[];
    stages.forEach((stage) => {
      expect(STAGE_LABELS[stage]).toBeTruthy();
    });
  });

  it("labels are non-empty strings", () => {
    Object.values(STAGE_LABELS).forEach((label) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
