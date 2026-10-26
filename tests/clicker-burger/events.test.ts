import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  eventOffer,
  act,
  tick,
  D,
} from "../../src/features/clicker-burger/engine/game";
test("events offer material rewards at 100k and snapshot the displayed price", () => {
  const s = initial();
  s.money = "100000";
  s.event = 0;
  let n = tick(s, 1);
  const offer = eventOffer(n)!;
  assert.equal(offer.cost, "1000");
  assert.equal(offer.reward, "5000");
  n.money = "200000";
  assert.equal(eventOffer(n)!.cost, offer.cost);
  n = act(n, { type: "event", accept: true });
  assert.equal(n.money, "204000");
  assert.equal(n.event, -1);
  assert.equal(n.eventTerms, null);
  assert(n.nextEventAt >= n.elapsed + 180);
});
test("passing cannot replay a backlog of offline events on consecutive seconds", () => {
  let s = initial();
  s.elapsed = 36000;
  s.event = 0;
  s = act(s, { type: "event", accept: false });
  s = tick(s, 179);
  assert.equal(s.event, -1);
  s = tick(s, 1);
  assert(s.event >= 0);
});
test("event prices and rewards stay finite at large balances", () => {
  const s = initial();
  s.money = "1e200";
  s.event = 0;
  const offer = eventOffer(s)!;
  assert(D(offer.cost).isFinite());
  assert(D(offer.reward).gt(offer.cost));
});
