/** Tap-review moderation. Only used behind adminProcedure with the server admin client. */
export interface ReviewTap {
  signal_id: string;
  label: string;
  signal_type: string;
  intensity: number;
}
export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  public_note: string | null;
  status: string | null;
  source: string;
  created_at: string;
  updated_at: string | null;
  place_name?: string;
  user_name?: string;
  report_count: number;
  taps: ReviewTap[];
  tap_total: number;
}
export interface ReviewReport {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name?: string;
}
const FIELDS =
  "id,place_id,user_id,public_note,status,source,created_at,updated_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createReviewModeration(
  db: any,
  log: (...args: any[]) => Promise<any>,
) {
  const checked = (result: any) => {
    if (result.error)
      throw new Error(result.error.message || "Review query failed");
    return result.data || [];
  };
  async function all(query: () => any) {
    const rows: any[] = [];
    for (let start = 0; ; start += 1000) {
      const batch = checked(await query().range(start, start + 999));
      rows.push(...batch);
      if (batch.length < 1000) return rows;
    }
  }
  async function related(
    table: string,
    fields: string,
    key: string,
    ids: string[],
  ) {
    const rows: any[] = [];
    for (let i = 0; i < ids.length; i += 150)
      rows.push(
        ...(await all(() =>
          db
            .from(table)
            .select(fields)
            .in(key, ids.slice(i, i + 150)),
        )),
      );
    return rows;
  }
  async function enrich(rows: any[]): Promise<PlaceReview[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id),
      places = [...new Set(rows.map((r) => r.place_id))],
      users = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const [placeRows, profiles, taps, reports] = await Promise.all([
      related("places", "id,name", "id", places),
      related("profiles", "user_id,display_name,username", "user_id", users),
      related(
        "place_review_signal_taps",
        "review_id,signal_id,intensity",
        "review_id",
        ids,
      ),
      related("review_reports", "review_id,status", "review_id", ids),
    ]);
    const catalog = await related(
      "review_items",
      "id,label,signal_type",
      "id",
      [...new Set(taps.map((t) => t.signal_id))],
    );
    const names = new Map(placeRows.map((p) => [p.id, p.name])),
      reviewerNames = new Map(
        profiles.map((p) => [p.user_id, p.display_name || p.username]),
      ),
      signals = new Map(catalog.map((s) => [s.id, s]));
    return rows.map((row) => {
      const selected = taps
        .filter((t) => t.review_id === row.id)
        .map((t) => ({
          signal_id: t.signal_id,
          label: signals.get(t.signal_id)?.label || "Unavailable signal",
          signal_type: signals.get(t.signal_id)?.signal_type || "unknown",
          intensity: t.intensity,
        }));
      return {
        ...row,
        place_name: names.get(row.place_id),
        user_name: reviewerNames.get(row.user_id),
        report_count: reports.filter(
          (r) => r.review_id === row.id && r.status === "pending",
        ).length,
        taps: selected,
        tap_total: selected.reduce((n, t) => n + t.intensity, 0),
      };
    });
  }
  async function getReviews(limit = 50, offset = 0, status?: string) {
    let query = db.from("place_reviews").select(FIELDS, { count: "exact" });
    if (status) query = query.eq("status", status);
    const result = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    return { reviews: await enrich(checked(result)), total: result.count || 0 };
  }
  async function getReviewById(id: string) {
    const result = await db
      .from("place_reviews")
      .select(FIELDS)
      .eq("id", id)
      .maybeSingle();
    if (result.error) checked(result);
    return result.data ? (await enrich([result.data]))[0] : null;
  }
  async function getReviewReports(id: string): Promise<ReviewReport[]> {
    const reports = await all(() =>
      db
        .from("review_reports")
        .select("id,review_id,reporter_id,reason,status,created_at")
        .eq("review_id", id)
        .order("created_at", { ascending: false }),
    );
    const profiles = await related(
      "profiles",
      "user_id,display_name,username",
      "user_id",
      [...new Set(reports.map((r) => r.reporter_id))],
    );
    return reports.map((r) => ({
      ...r,
      reporter_name: profiles.find((p) => p.user_id === r.reporter_id)
        ?.display_name,
    }));
  }
  async function reportedIds(): Promise<string[]> {
    const rows = await all(() =>
      db.from("review_reports").select("review_id").eq("status", "pending"),
    );
    return [
      ...new Set(rows.map((r) => r.review_id).filter((id) => UUID.test(id))),
    ];
  }
  async function getReportedReviews(limit = 50, offset = 0) {
    const ids = await reportedIds();
    if (!ids.length) return { reviews: [], total: 0 };
    // Chunk IDs instead of exceeding the URL limit; sort/paginate after matching canonical reviews.
    const rows = await related("place_reviews", FIELDS, "id", ids);
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      reviews: await enrich(rows.slice(offset, offset + limit)),
      total: rows.length,
    };
  }
  async function getReviewStats() {
    const results = await Promise.all([
      db.from("place_reviews").select("id", { count: "exact", head: true }),
      db
        .from("place_reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "live"),
      db
        .from("place_reviews")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
      db
        .from("place_review_signal_taps")
        .select("id", { count: "exact", head: true }),
    ]);
    results.forEach(checked);
    const ids = await reportedIds();
    const existing = await related("place_reviews", "id", "id", ids);
    return {
      totalReviews: results[0].count || 0,
      approvedReviews: results[1].count || 0,
      flaggedReviews: results[2].count || 0,
      reportedReviews: existing.length,
      signalSelections: results[3].count || 0,
    };
  }
  async function moderate(
    id: string,
    action: string,
    adminId: string,
    reason?: string,
  ): Promise<boolean> {
    if (
      !UUID.test(id) ||
      ![
        "live",
        "pending",
        "hidden",
        "rejected",
        "dismiss_reports",
      ].includes(action)
    )
      throw new Error("Invalid moderation action");
    if (action === "rejected" && (!reason?.trim() || reason.length > 4000))
      throw new Error("Enter a rejection reason (4000 characters maximum).");
    const result = await db.rpc("admin_moderate_place_review", {
      p_review_id: id,
      p_action: action,
    });
    if (result.error)
      throw new Error(result.error.message || "Review moderation failed");
    if (result.data !== id)
      throw new Error("The server did not confirm the review update");
    await log(adminId, `review_${action}`, id, "review", reason);
    return true;
  }
  return {
    getReviews,
    getReviewById,
    getReviewReports,
    getReportedReviews,
    getReviewStats,
    getFlaggedReviews: (limit = 50, offset = 0) =>
      getReviews(limit, offset, "rejected"),
    updateReviewStatus: (id: string, status: string, admin: string) =>
      moderate(id, status, admin),
    approveReview: (id: string, admin: string) => moderate(id, "live", admin),
    rejectReview: (id: string, reason: string, admin: string) =>
      moderate(id, "rejected", admin, reason),
    deleteReview: (id: string, admin: string) => moderate(id, "hidden", admin),
    dismissReviewReports: (id: string, admin: string) =>
      moderate(id, "dismiss_reports", admin),
  };
}
