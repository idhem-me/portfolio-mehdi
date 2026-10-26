import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  act,
  tick,
  rates,
  cost,
  affordable,
  era,
  prestige,
  prestigeGain,
  D,
  fmt,
} from "../../src/features/clicker-burger/engine/game";
import {
  parseSave,
  resume,
} from "../../src/features/clicker-burger/systems/save";
test("manual cooking consumes ingredients without directly selling", () => {
  const s = act(initial(), { type: "cook" });
  assert.equal(s.stock, 1);
  assert.equal(s.money, "20");
  assert.equal(s.ingredients, 19);
  const n = tick(s, 1);
  assert.equal(n.stock, 0);
  assert.equal(n.money, "24");
});
test("production, money and demand limit stock and sales", () => {
  const s = initial();
  s.ingredients = 0;
  s.money = "0";
  s.counts.cook = 10;
  assert.equal(tick(s, 10).sold, 0);
  s.money = "1";
  s.price = 20;
  const n = tick(s, 1);
  assert(n.sold <= rates(s).demand);
  assert(D(n.money).gte(0));
});
test("higher price lowers demand", () => {
  const s = initial(),
    low = rates(s).demand;
  s.price = 8;
  assert(rates(s).demand < low);
});
test("purchases are atomic and grouped cost matches individual costs", () => {
  let s = initial();
  assert.equal(act(s, { type: "buy", id: "cook", quantity: 1 }), s);
  s.money = "1000";
  const multi = cost(s, "cook", 10);
  let total = D(0);
  for (let i = 0; i < 10; i++) {
    total = total.plus(cost(s, "cook"));
    s.counts.cook++;
  }
  assert(total.minus(multi).abs().lte(10));
  s = initial();
  s.money = "1000";
  const q = affordable(s, "cook", "max");
  assert(cost(s, "cook", q).lte(1000));
  assert(cost(s, "cook", q + 1).gt(1000));
  const n = act(s, { type: "buy", id: "cook", quantity: "max" });
  assert.equal(n.counts.cook, q);
  assert(D(n.money).gte(0));
});
test("research prerequisites and stages gate expansion", () => {
  let s = initial();
  s.money = "1e20";
  assert.equal(act(s, { type: "research", id: "space" }), s);
  s = act(s, { type: "research", id: "recipe" });
  s.earned = "1000";
  assert.equal(era(s), 1);
  s = act(s, { type: "research", id: "franchise" });
  assert.equal(era(s), 2);
  s = act(s, { type: "research", id: "coldchain" });
  s = act(s, { type: "research", id: "global" });
  s = act(s, { type: "research", id: "space" });
  assert.equal(era(s), 3);
  s.markets = ["europe", "asia", "africa", "america"];
  s.counts.megafactory = 3;
  assert.equal(era(s), 4);
});
test("construction and upgrade update production without duplicate plots", () => {
  const s = initial();
  s.earned = "1000";
  s.money = "5000";
  const n = act(s, { type: "build", id: "restaurant", x: 1, y: 2 });
  assert.equal(n.plots.length, 2);
  assert.equal(n.counts.restaurant, 1);
  assert.equal(act(n, { type: "build", id: "restaurant", x: 1, y: 2 }), n);
  const upgraded = act(n, { type: "upgrade", index: 0 });
  assert.equal(upgraded.plots[0].level, 2);
  assert(rates(upgraded).production > rates(n).production);
});
test("industry needs harvest and distribution", () => {
  const s = initial();
  s.counts.factory = 1;
  assert.equal(rates(s).production, 0);
  s.counts.farm = 1;
  assert.equal(rates(s).production, 0);
  s.counts.warehouse = 1;
  assert.equal(rates(s).production, 35);
});
test("prestige keeps permanent bonus and resets assets", () => {
  const s = initial();
  s.earned = "9000000";
  s.capital = 2;
  s.counts.cook = 5;
  assert.equal(prestigeGain(s), 3);
  const n = prestige(s);
  assert.equal(n.capital, 5);
  assert.equal(n.money, "20");
  assert.equal(n.counts.cook, 0);
});
test("save roundtrip rejects corrupt and unknown data", () => {
  const s = initial();
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
  for (const patch of [
    { money: "NaN" },
    { stock: -1 },
    { price: 0 },
    { research: ["fake"] },
    { version: 2 },
    { plots: [{ x: 50, y: 2, type: "stand", level: 1 }] },
    { counts: { cook: -1 } },
    { boost: 999 },
  ])
    assert.throws(() => parseSave(JSON.stringify({ ...s, ...patch })));
});
test("offline caps at eight hours and is deterministic", () => {
  const s = initial(1000);
  s.counts.cook = 1;
  const a = resume(s, 1000 + 1000 * 36000);
  const b = tick(s, 28800);
  assert.equal(a.seconds, 28800);
  assert.equal(a.state.money, b.money);
  assert.equal(resume(s, 0).seconds, 0);
  assert.deepEqual(tick(tick(s, 5), 5), tick(s, 10));
});
test("large-number money and cost remain finite", () => {
  const s = initial();
  s.money = "1e200";
  s.counts.quantum = 200;
  const c = cost(s, "quantum", 100);
  assert(c.isFinite());
  assert(c.gt("1e50"));
  assert.equal(fmt("1e100"), "1.00e+100");
});
test("first automation is reachable in under two active minutes", () => {
  let s = initial();
  for (let second = 0; second < 120; second++) {
    s = act(s, { type: "cook" });
    s = tick(s, 1);
    if (D(s.money).gte(cost(s, "cook"))) {
      s = act(s, { type: "buy", id: "cook", quantity: 1 });
      break;
    }
  }
  assert.equal(s.counts.cook, 1);
  assert(s.elapsed < 120);
});
test("events apply a temporary demand modifier", () => {
  let s = initial();
  s.money = "1000";
  s.event = 0;
  const before = rates(s).demand;
  s = act(s, { type: "event", accept: true });
  assert(rates(s).demand > before);
  s = tick(s, 91);
  assert.equal(rates(s).demand, before);
});

test("base purchase prices are exact decimal values", () => {
  assert.equal(cost(initial(), "cook").toString(), "45");
  assert.equal(cost(initial(), "grill").toString(), "140");
});
test("ownership cap cannot create a save that fails validation", () => {
  const s = initial();
  s.money = "1e300";
  s.counts.cook = 10000;
  assert.equal(affordable(s, "cook", "max"), 0);
  assert.equal(act(s, { type: "buy", id: "cook", quantity: 1 }), s);
});
test("two early-game strategies remain solvent and reach automation", () => {
  for (const strategy of [
    ["cook", "marketing", "grill"],
    ["cook", "grill", "marketing"],
  ]) {
    let s = initial();
    for (let t = 0; t < 1800; t++) {
      s = act(s, { type: "cook" });
      s = tick(s, 1);
      const id = strategy[Math.floor(t / 60) % strategy.length];
      if (D(s.money).gte(cost(s, id)))
        s = act(s, { type: "buy", id, quantity: 1 });
      assert(D(s.money).gte(0));
    }
    assert(s.counts.cook > 0);
    assert(D(s.earned).gt(1000));
    assert.equal(parseSave(JSON.stringify(s)).earned, s.earned);
  }
});
