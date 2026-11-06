import assert from "node:assert/strict";
import { test } from "node:test";
import { observePresence, startPresence } from "./presence.ts";

function frame(value: number) {
  return new Uint8ClampedArray(32 * 32 * 4).fill(value);
}

test("scans once per stable object and rearms only after the empty frame returns", () => {
  let presence = startPresence();
  const empty = frame(40);
  const item = frame(140);
  const feed = (image: Uint8ClampedArray, count: number) => {
    let scans = 0;
    for (let i = 0; i < count; i++) {
      const next = observePresence(presence, image);
      presence = next.state;
      scans += Number(next.scan);
    }
    return scans;
  };

  assert.equal(feed(empty, 8), 0);
  assert.equal(presence.phase, "ready");
  assert.equal(feed(item, 3), 0);
  assert.equal(feed(item, 1), 1);
  assert.equal(presence.phase, "remove");
  assert.equal(feed(item, 40), 0);
  assert.equal(feed(empty, 3), 0);
  assert.equal(feed(item, 8), 0);
  assert.equal(presence.phase, "remove");
  assert.equal(feed(empty, 4), 0);
  assert.equal(feed(item, 4), 1);
});
