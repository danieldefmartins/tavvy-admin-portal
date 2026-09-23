const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
const schema = JSON.parse(
  fs.readFileSync("../tavvy-web/docs/schema-audit/public-schema.json"),
);
const id = "00000000-0000-0000-0000-000000000001",
  place = "00000000-0000-0000-0000-000000000002",
  user = "00000000-0000-0000-0000-000000000003",
  sig = "00000000-0000-0000-0000-000000000004";
function setup() {
  let fail = null;
  const calls = [];
  const tables = {
    place_reviews: [
      {
        id,
        place_id: place,
        user_id: user,
        public_note: "Clean",
        status: "live",
        source: "app",
        created_at: "2026-01-01",
      },
    ],
    places: [{ id: place, name: "Airport bathroom" }],
    profiles: [
      { user_id: user, display_name: "Tavvy member", username: "member" },
    ],
    place_review_signal_taps: [{ review_id: id, signal_id: sig, intensity: 3 }],
    review_items: [{ id: sig, label: "Clean", signal_type: "best_for" }],
    review_reports: [
      {
        id,
        review_id: id,
        reporter_id: user,
        reason: "Spam",
        status: "pending",
      },
    ],
  };
  class Q {
    constructor(t) {
      this.t = t;
      this.filters = [];
      this.start = 0;
      this.end = Infinity;
    }
    select(fields, opts = {}) {
      this.opts = opts;
      this.fields = fields;
      for (const col of fields.split(","))
        assert.ok(
          schema.columns.some((c) => c.table === this.t && c.column === col),
          `${this.t}.${col} must exist`,
        );
      return this;
    }
    eq(k, v) {
      this.filters.push((r) => r[k] === v);
      return this;
    }
    in(k, v) {
      this.filters.push((r) => v.includes(r[k]));
      return this;
    }
    order() {
      return this;
    }
    range(a, b) {
      this.start = a;
      this.end = b;
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    then(resolve) {
      calls.push(this.t);
      if (fail === this.t)
        return Promise.resolve({ error: { message: "offline" } }).then(resolve);
      let rows = (tables[this.t] || []).filter((r) =>
        this.filters.every((f) => f(r)),
      );
      return Promise.resolve({
        data: this.single
          ? rows[0] || null
          : rows.slice(this.start, this.end + 1),
        count: rows.length,
        error: null,
      }).then(resolve);
    }
  }
  const db = {
    from: (t) => new Q(t),
    rpc: async (name, args) => {
      calls.push({ name, args });
      return fail === "rpc"
        ? { error: { message: "not saved" } }
        : { data: id, error: null };
    },
  };
  const ex = {};
  new Function(
    "exports",
    ts.transpileModule(fs.readFileSync("server/reviewModeration.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(ex);
  return {
    api: ex.createReviewModeration(db, async () => {}),
    calls,
    tables,
    setFailure: (t) => (fail = t),
  };
}
(async () => {
  const h = setup();
  const data = await h.api.getReviews();
  assert.equal(data.reviews[0].place_name, "Airport bathroom");
  assert.equal(data.reviews[0].taps[0].label, "Clean");
  assert.equal(data.reviews[0].tap_total, 3);
  assert.equal(data.reviews[0].report_count, 1);
  assert.equal(
    (await h.api.getReviewReports(id))[0].reporter_name,
    "Tavvy member",
  );
  assert.equal((await h.api.getReviewStats()).signalSelections, 1);
  assert.equal((await h.api.getReportedReviews()).total, 1);
  assert.equal(await h.api.approveReview(id, "admin"), true);
  assert.equal(h.calls.find((x) => x.name)?.args.p_action, "live");
  await h.api.deleteReview(id,"admin");
  assert.equal(h.calls.filter(x=>x.name).at(-1).args.p_action,"hidden","legacy delete endpoint archives without deleting history");
  await assert.rejects(h.api.updateReviewStatus(id,"delete","admin"),/Invalid/);
  h.setFailure("rpc");
  await assert.rejects(h.api.rejectReview(id, "Spam", "admin"), /not saved/);
  h.setFailure("places");
  await assert.rejects(h.api.getReviews(), /offline/);
  await assert.rejects(
    h.api.updateReviewStatus(id, "approved", "admin"),
    /Invalid/,
  );
  console.log(
    "Admin review reader tests: exact schema projections, explicit joins, real tap strength, report identity, live approval and failure propagation passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
