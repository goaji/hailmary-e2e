import { test, expect } from "../../fixtures/pageTest";
import { assertNoAccessibilityViolations } from "../../helpers";
import { WikiDiagram } from "../../pageObjects/WikiDiagram";
import { DIAGRAM_KEYS, type DiagramKey } from "../../pageObjects/WikiPage";

// Diagrams whose legend buttons toggle one highlight at a time, with the hint shown when none is on.
const TOGGLE_DIAGRAMS: { key: DiagramKey; pills: string[]; blurb?: (pill: string) => string }[] = [
  { key: "fieldDiagram", pills: ["hotspotYardLines", "hotspotHashMarks", "hotspotEndZones", "hotspotRedZone"] },
  {
    key: "statLinesDiagram",
    pills: ["passingPill", "rushingPill", "receivingPill"],
    blurb: (pill) => pill.replace("Pill", "Blurb"),
  },
  {
    key: "boxScoreDiagram",
    pills: ["scoreBugPill", "timeoutsPill", "gameClockPill", "downDistancePill", "fieldPositionPill", "playClockPill", "firstDownLinePill"],
    blurb: (pill) => pill.replace("Pill", "Blurb"),
  },
];

for (const { key, pills, blurb } of TOGGLE_DIAGRAMS) {
  test(`${key}: each legend button toggles its highlight from the keyboard`, async ({ page }) => {
    const diagram = new WikiDiagram(page, key);
    await diagram.goto();
    await expect(diagram.buttons).toHaveCount(pills.length);
    await expect(diagram.pressedButtons).toHaveCount(0);

    for (const pill of pills) {
      await test.step(pill, async () => {
        const button = diagram.button(diagram.messages[pill]);
        await button.press("Enter");
        await expect(button).toHaveAttribute("aria-pressed", "true");
        await expect(diagram.pressedButtons).toHaveCount(1);
        if (blurb) {
          await expect(diagram.text(diagram.messages[blurb(pill)])).toBeVisible();
        }

        await button.press("Space");
        await expect(diagram.pressedButtons).toHaveCount(0);
        if ("hint" in diagram.messages) {
          await expect(diagram.text(diagram.messages.hint)).toBeVisible();
        }
      });
    }
  });
}

test("routeTreeDiagram: each route number selects its route and announces it", async ({ page }) => {
  const diagram = new WikiDiagram(page, "routeTreeDiagram");
  await diagram.goto();
  await expect(diagram.buttons).toHaveCount(10);
  await expect(diagram.status).toHaveText(diagram.messages.hint);

  for (let route = 0; route <= 9; route++) {
    await test.step(`route ${route}`, async () => {
      const button = diagram.button(String(route));
      await button.press("Enter");
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(diagram.pressedButtons).toHaveCount(1);
      await expect(diagram.status).toContainText(diagram.messages[`route${route}Label`]);
      await expect(diagram.status).toContainText(diagram.messages[`route${route}Blurb`]);
    });
  }
});

for (const key of ["offensivePositionsDiagram", "defensivePositionsDiagram"] as const) {
  test(`${key}: each position selects all its players and announces the role`, async ({ page }) => {
    const diagram = new WikiDiagram(page, key);
    await diagram.goto();
    await expect(diagram.status).toHaveText(diagram.messages.hint);

    // Position ids come from the copy: qbLabel -> qb, shown on the dots as QB.
    const positions = Object.keys(diagram.messages)
      .filter((messageKey) => messageKey.endsWith("Label") && messageKey !== "widgetLabel")
      .map((messageKey) => messageKey.replace(/Label$/, ""));
    expect(positions.length).toBeGreaterThan(0);

    for (const position of positions) {
      await test.step(position, async () => {
        const dots = diagram.button(position.toUpperCase());
        await dots.first().press("Enter");
        const dotCount = await dots.count();
        expect(dotCount).toBeGreaterThan(0);
        await expect(diagram.pressedButtons).toHaveCount(dotCount);
        for (let index = 0; index < dotCount; index++) {
          await expect(dots.nth(index)).toHaveAttribute("aria-pressed", "true");
        }
        await expect(diagram.status).toContainText(diagram.messages[`${position}Label`]);
        await expect(diagram.status).toContainText(diagram.messages[`${position}Blurb`]);
      });
    }
  });
}

test("downSystemDiagram: plays move the downs, and a turnover freezes it until reset", async ({ page }) => {
  const diagram = new WikiDiagram(page, "downSystemDiagram");
  const m = diagram.messages;
  const chip = (down: 1 | 2 | 3 | 4, yards: number) =>
    diagram.text(m.downAndDistance.replace("{down}", m[`down${down}`]).replace("{yards}", String(yards)));
  await diagram.goto();

  await test.step("starts at 1st & 10 with nothing announced", async () => {
    await expect(chip(1, 10)).toBeVisible();
    await expect(diagram.status).toHaveText("");
  });

  await test.step("a short gain uses a down", async () => {
    await diagram.button(m.actionGainShort).press("Enter");
    await expect(chip(2, 7)).toBeVisible();
    await expect(diagram.status).toHaveText("");
  });

  await test.step("reaching the line gives a first down", async () => {
    await diagram.button(m.actionGainFirstDown).press("Enter");
    await expect(chip(1, 10)).toBeVisible();
    await expect(diagram.status).toHaveText(m.outcomeFirstDown);
  });

  await test.step("four plays without gain turn it over", async () => {
    await diagram.button(m.actionNoGain).press("Enter");
    await expect(chip(2, 10)).toBeVisible();
    await diagram.button(m.actionSack).press("Enter");
    await expect(chip(3, 15)).toBeVisible();
    await diagram.button(m.actionNoGain).press("Enter");
    await expect(chip(4, 15)).toBeVisible();
    await diagram.button(m.actionNoGain).press("Enter");
    await expect(diagram.status).toHaveText(m.outcomeTurnover);
    await expect(diagram.button(m.actionNoGain)).toHaveCount(0);
  });

  await test.step("reset starts a new series", async () => {
    await diagram.button(m.resetButton).press("Enter");
    await expect(chip(1, 10)).toBeVisible();
    await expect(diagram.status).toHaveText("");
    await expect(diagram.button(m.resetButton)).toHaveCount(0);
  });

  await test.step("driving the length of the field scores and freezes", async () => {
    for (let play = 0; play < 20 && (await diagram.button(m.actionGainFirstDown).count()) > 0; play++) {
      await diagram.button(m.actionGainFirstDown).press("Enter");
    }
    await expect(diagram.status).toHaveText(m.outcomeTouchdown);
    await expect(diagram.button(m.resetButton)).toBeVisible();
  });
});

test("situationalFootballDiagram: choosing a scenario tab swaps the panel", async ({ page }) => {
  const diagram = new WikiDiagram(page, "situationalFootballDiagram");
  const m = diagram.messages;
  const scenarios = ["twoMinute", "fourthDown", "redZone", "clockMgmt", "kneelDown"];
  await diagram.goto();
  await expect(diagram.tabs).toHaveCount(scenarios.length);

  for (const [index, scenario] of scenarios.entries()) {
    await test.step(scenario, async () => {
      const tab = diagram.tab(m[`${scenario}Pill`]);
      // The first scenario starts selected; the rest are chosen from the keyboard.
      if (index > 0) {
        await tab.press("Enter");
      }
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(diagram.region.getByRole("tab", { selected: true })).toHaveCount(1);
      await expect(diagram.tabpanel).toHaveAccessibleName(m[`${scenario}Pill`]);
      await expect(diagram.tabpanel).toContainText(m[`${scenario}Summary`]);
    });
  }
});

test.describe("diagram pages accessibility", () => {
  for (const key of DIAGRAM_KEYS) {
    test(`${key} page is axe clean with the diagram in use`, async ({ page }) => {
      // Freezes the box score's ticking play clock.
      await page.emulateMedia({ reducedMotion: "reduce" });
      const diagram = new WikiDiagram(page, key);
      await diagram.goto();

      const control = key === "situationalFootballDiagram" ? diagram.tabs.last() : diagram.buttons.first();
      await control.press("Enter");

      await assertNoAccessibilityViolations(page);
    });
  }
});
