import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { initial } from "../../src/features/clicker-burger/engine/game";

const s = initial(Date.now());
s.level = 4;
s.money = "95000";
s.earned = "185000";
s.stock = 420;
s.ingredients = 680;
s.price = 3.5;
s.sold = 8500;
s.manual = 120;
s.counts = {
  cook: 18,
  grill: 12,
  marketing: 8,
  restaurant: 4,
  trader: 2,
  farm: 3,
  factory: 2,
  warehouse: 2,
  megafactory: 0,
  orbital: 0,
  quantum: 0,
};
s.research = ["recipe", "franchise", "branding", "coldchain", "ipo"];
s.markets = ["suburb", "center", "lyon", "bordeaux"];
s.rivals = [];
s.projects = [];
s.marketFund = "12000";
s.marketIndex = 98.4;
s.elapsed = 7200;
s.nextEventAt = 7380;
s.event = -1;
s.eventSeen = 4;
s.missionClaims = [
  "first-ten",
  "first-sales",
  "first-cook",
  "signature",
  "revenue",
  "franchise",
  "logistics",
  "markets",
];
s.log = [
  "Introduction en bourse : le ticker BGR est en ligne.",
  "Centre logistique ouvert. Les camions ont faim aussi.",
  "Franchise nationale : même sauce, nouvelles villes.",
];
s.lastSaved = Date.now();

const dir = join(process.cwd(), "docs/clicker-burger");
mkdirSync(dir, { recursive: true });
const path = join(dir, "save-bourse-test.json");
writeFileSync(path, JSON.stringify(s, null, 2));
console.log(path);
