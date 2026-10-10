import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CastPlacement, getSchematicCastAccuracy, supportsSchematicCastPlacement } from "../src/components/CastPlacement";
import { CastGame } from "../src/components/CastGame";
import { venues } from "../src/data/venues";
import { castLine, createInitialState, getCastTargetWidth, getIdealCastPower } from "../src/game/engine";
import type { ExpeditionState, Venue } from "../src/types";

function prepared(venue: Venue, assistMode = false): ExpeditionState {
  return { ...createInitialState(), stage: "habitat", venueId: venue.id, seasonId: venue.seasons[0].id,
    gearId: venue.gearSets[0].id, zoneId: venue.habitats.find(habitat => habitat.safe !== false)!.id, assistMode };
}
const noChange = () => { throw new Error("Rendering must not choose placement or cast"); };

describe("schematic casting distance pilot", () => {
  it("is restricted to selected Amazon and Florida angling habitats", () => {
    for (const venue of venues) {
      const state = prepared(venue);
      expect(supportsSchematicCastPlacement(state, venue)).toBe((venue.id === "amazon" || venue.id === "florida-bay") && venue.gearSets[0].method === "angling");
    }
    const amazon = venues.find(venue => venue.id === "amazon")!; const state = prepared(amazon);
    expect(supportsSchematicCastPlacement({ ...state, zoneId: null }, amazon)).toBe(false);
    const cameraVenue = { ...amazon, gearSets: amazon.gearSets.map(gear => ({ ...gear, method: "camera" as const })) };
    expect(supportsSchematicCastPlacement(state, cameraVenue)).toBe(false);
  });

  it("shows the selected habitat, kit, lure, approach and honest relative-distance labels", () => {
    const venue = venues.find(item => item.id === "florida-bay")!; const state = prepared(venue); const ideal = getIdealCastPower(state);
    const html = renderToStaticMarkup(<CastPlacement state={state} venue={venue} power={ideal} ideal={ideal} width={getCastTargetWidth(state)} onPowerChange={noChange}/>);
    expect(html).toContain("Casting distance • schematic"); expect(html).toContain("Near · 0"); expect(html).toContain("Far · 100");
    expect(html).toContain("Marked habitat approach"); expect(html).toContain("Gold target band");
    expect(html).toContain(venue.habitats.find(item => item.id === state.zoneId)!.name);
    expect(html).toContain(venue.gearSets[0].name); expect(html).toContain(venue.gearSets[0].lure);
    expect(html).toContain("Distance is relative along this schematic approach"); expect(html).toContain("100.0% cast accuracy");
    expect(html).toContain("Root margin"); expect(html).toContain("Clear water");
    expect(html).not.toContain('type="range"'); expect(html).not.toContain("Use guide placement");
  });

  it("marks the chosen grass and current habitat without implying measured depth", () => {
    const venue = venues.find(item => item.id === "florida-bay")!;
    for (const [zoneId, label] of [["seagrass", "Seagrass patch"], ["creek", "Current seam"]]) {
      const state = { ...prepared(venue), zoneId }; const ideal = getIdealCastPower(state);
      const html = renderToStaticMarkup(<CastPlacement state={state} venue={venue} power={ideal} ideal={ideal} width={getCastTargetWidth(state)} onPowerChange={noChange}/>);
      expect(html).toContain(label); expect(html).not.toContain("metres"); expect(html).not.toContain("meters");
    }
  });

  it("offers native labeled range control and an explicit guide action in untimed mode", () => {
    const venue = venues.find(item => item.id === "amazon")!; const state = prepared(venue, true); const ideal = getIdealCastPower(state);
    const html = renderToStaticMarkup(<CastPlacement state={state} venue={venue} power={32} ideal={ideal} width={getCastTargetWidth(state)} onPowerChange={noChange}/>);
    expect(html).toMatch(/<label for="[^"]+">Choose casting distance/);
    expect(html).toMatch(/<input[^>]+type="range"[^>]+min="8"[^>]+max="96"[^>]+step="1"/);
    expect(html).toMatch(/aria-describedby="[^"]+-feedback [^"]+-help"/);
    expect(html).toContain('value="32"'); expect(html).toContain('aria-valuetext="32 out of 100;');
    expect(html).toContain('type="button"'); expect(html).toContain("Use guide placement");
    expect(html).not.toContain('value="'+ideal+'"');
  });

  it("binds preview accuracy and gold-band boundary feedback to actual casts for every pilot habitat and kit", () => {
    for (const venue of venues.filter(item => item.id === "amazon" || item.id === "florida-bay")) {
      for (const habitat of venue.habitats.filter(item => item.safe !== false)) for (const gear of venue.gearSets.filter(item => item.method === "angling")) {
        const state = { ...prepared(venue), zoneId: habitat.id, gearId: gear.id, askedQuestions: [venue.informedQuestionByZone[habitat.id]] };
        const ideal = getIdealCastPower(state), width = getCastTargetWidth(state);
        for (const power of [8, ideal - width / 2, ideal, ideal + width, 96]) {
          const actual = castLine(state, power);
          expect(getSchematicCastAccuracy(power, ideal, width)).toBe(actual.castAccuracy);
          const html = renderToStaticMarkup(<CastPlacement state={state} venue={venue} power={power} ideal={ideal} width={width} onPowerChange={noChange}/>);
          expect(html).toContain(`data-accuracy="${actual.castAccuracy}"`);
          expect(html).toContain(actual.castAccuracy >= 70 ? "Accurate · calmer opening pressure" : actual.castAccuracy >= 40 ? "Workable · standard opening pressure" : "Wide · higher opening pressure");
        }
      }
    }
  });

  it("uses the existing ideal for initial untimed placement and keeps one cast confirmation action", () => {
    const venue = venues.find(item => item.id === "amazon")!; const state = prepared(venue, true); const ideal = getIdealCastPower(state);
    const html = renderToStaticMarkup(<CastGame state={state} venue={venue} setState={noChange} paused={false} layoutNotice=""/>);
    expect(html).toContain(`value="${ideal}"`); expect(html).toContain("100.0% cast accuracy");
    expect(html.match(/>CONFIRM CAST<\/span>/g)).toHaveLength(1);
    expect(html).toContain("Choose a distance with the slider"); expect(html).not.toContain('class="placement-meter');
  });

  it("preserves the original setup meter and action for other methods and destinations", () => {
    const venue = venues.find(item => item.id === "danube")!; const gear = venue.gearSets.find(item => item.method === "telemetry")!;
    const state = { ...prepared(venue, true), gearId: gear.id };
    const html = renderToStaticMarkup(<CastGame state={state} venue={venue} setState={noChange} paused={false} layoutNotice=""/>);
    expect(html).toContain("placement-meter"); expect(html).toContain("SET RECEIVER");
    expect(html).not.toContain("Casting distance • schematic"); expect(html).not.toContain('type="range"');
  });
});
