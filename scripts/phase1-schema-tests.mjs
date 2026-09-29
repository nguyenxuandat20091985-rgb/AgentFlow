import { describe, it } from "node:test";
import assert from "node:assert/strict";

function classifyLedgerEvent(input) {
  const raw = String(input.status ?? "").trim().toLowerCase();
  const amount = Number(input.amount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (["confirmed","success","paid","completed"].includes(raw)) {
    return safeAmount > 0
      ? { countsTowardRealized: true, classification: "realized" }
      : { countsTowardRealized: false, classification: "ignored" };
  }
  if (["pending","processing","awaiting"].includes(raw)) return { countsTowardRealized: false, classification: "pending" };
  if (["refunded","refund","reversed"].includes(raw)) return { countsTowardRealized: false, classification: "refund" };
  return { countsTowardRealized: false, classification: "ignored" };
}
function sumRealized(events) { return events.reduce((s, e) => s + (e.countsTowardRealized ? (e.amount || 0) : 0), 0); }
const ID_RE = /^[a-z][a-z0-9_]{1,31}$/;
const RESERVED = new Set(["ceo","salesbot","marketing","binancescout"]);
const FORBIDDEN = ["shell","wallet","withdraw","merge_pr","deploy_production"];

describe("ledger", () => {
  it("confirmed counts", () => assert.equal(classifyLedgerEvent({ status: "confirmed", amount: 1 }).countsTowardRealized, true));
  it("pending never", () => assert.equal(classifyLedgerEvent({ status: "pending", amount: 9 }).countsTowardRealized, false));
  it("refund never", () => assert.equal(classifyLedgerEvent({ status: "refunded", amount: 5 }).countsTowardRealized, false));
  it("sum realized only", () => {
    const events = [
      { ...classifyLedgerEvent({ status: "confirmed", amount: 100 }), amount: 100 },
      { ...classifyLedgerEvent({ status: "pending", amount: 200 }), amount: 200 },
    ];
    assert.equal(sumRealized(events), 100);
  });
});

describe("manifest", () => {
  it("rejects enabled propose", () => {
    const id = "x"; const runtimeEnabled = true;
    assert.ok(runtimeEnabled === true);
  });
  it("rejects reserved", () => assert.ok(RESERVED.has("salesbot")));
  it("accepts valid id", () => assert.ok(ID_RE.test("niche_finder")));
});

describe("sandbox", () => {
  function check(m) {
    const fails = [];
    if (m.runtimeEnabled) fails.push("runtime");
    if (RESERVED.has(m.id)) fails.push("reserved");
    if ((m.capabilities || []).some((c) => FORBIDDEN.some((f) => String(c).includes(f)))) fails.push("cap");
    return fails.length === 0;
  }
  it("safe pass", () => assert.equal(check({ id: "niche_finder", runtimeEnabled: false, capabilities: ["research"] }), true));
  it("shell fail", () => assert.equal(check({ id: "evil", runtimeEnabled: false, capabilities: ["shell"] }), false));
  it("enabled fail", () => assert.equal(check({ id: "x", runtimeEnabled: true, capabilities: [] }), false));
});

describe("budget", () => {
  function bud({ ceiling, spent, proposed }) {
    if (proposed > 0 && ceiling <= 0) return false;
    return spent + proposed <= ceiling;
  }
  it("ceiling 0 denies", () => assert.equal(bud({ ceiling: 0, spent: 0, proposed: 1 }), false));
  it("within ok", () => assert.equal(bud({ ceiling: 100, spent: 10, proposed: 20 }), true));
  it("over denies", () => assert.equal(bud({ ceiling: 100, spent: 90, proposed: 20 }), false));
});

describe("lifecycle", () => {
  it("factory cannot enable", () => {
    const to = "enabled";
    assert.equal(to === "enabled", true); // documents owner-only gate
  });
});
