import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useScroll,
  useSpring,
} from "framer-motion";
import { api, ApiError } from "./api";
import { PURPOSES } from "./types";
import type {
  CitySummary,
  EmployeeDetail,
  EmployeeSummary,
  GraphStats,
  Recommendation,
} from "./types";
import { RecommendationCard } from "./components/RecommendationCard";
import { EmptyState, ErrorState } from "./components/states";
import { SkeletonCards } from "./components/Skeleton";
import { AnimatedCounter } from "./components/AnimatedCounter";
import { MagneticButton } from "./components/MagneticButton";
import { HowItWorks } from "./components/HowItWorks";
import { SectionNav } from "./components/SectionNav";
import { useToast } from "./components/Toast";
import { Illustration } from "./components/UndrawIllustration";
import { cardIn, fadeUp, staggerContainer, viewportOnce } from "./motion";

const SECTIONS = [
  { id: "hero", label: "Home" },
  { id: "workspace", label: "Recommend" },
];

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function App() {
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);

  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [cities, setCities] = useState<CitySummary[]>([]);
  const [refError, setRefError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [profile, setProfile] = useState<EmployeeDetail | null>(null);
  const [city, setCity] = useState("");
  const [purpose, setPurpose] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const notify = useToast();

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
    restDelta: 0.001,
  });

  useEffect(() => {
    api.health().then((h) => setDbOk(h.database === "connected")).catch(() => setDbOk(false));
    api.stats().then(setStats).catch(() => {});
    Promise.all([api.employees(), api.cities()])
      .then(([emps, cs]) => {
        setEmployees(emps);
        setCities(cs);
        if (emps.length) setEmployeeId(emps[0].employeeId);
        if (cs.length) setCity(cs[0].name);
      })
      .catch((e) => setRefError(e instanceof ApiError ? e.message : "Failed to load data"));
  }, []);

  useEffect(() => {
    if (employeeId == null) return;
    setProfile(null);
    api.employee(employeeId).then(setProfile).catch(() => setProfile(null));
    setRecs(null);
    setSearched(false);
  }, [employeeId]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.employeeId === employeeId) ?? null,
    [employees, employeeId]
  );

  const getRecommendations = async () => {
    if (employeeId == null || !city) return;
    setLoading(true);
    setRecError(null);
    setSearched(true);
    try {
      const data = await api.recommendations(employeeId, {
        city,
        purpose: purpose || undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      });
      setRecs(data);
      if (data.length > 0) {
        notify("success", `Found ${data.length} hotel${data.length === 1 ? "" : "s"} in ${city}.`);
      } else {
        notify("info", `No colleague stays matched in ${city}. Try relaxing the filters.`);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load recommendations";
      setRecError(msg);
      setRecs(null);
      notify("error", "Couldn't load recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statItems = stats
    ? [
        { num: stats.companies, lbl: "Companies" },
        { num: stats.employees, lbl: "Employees" },
        { num: stats.hotels, lbl: "Hotels" },
        { num: stats.cities, lbl: "Cities" },
        { num: stats.stays, lbl: "Stays" },
      ]
    : [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-layer" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="grain" aria-hidden="true" />
      <motion.div className="scroll-progress" style={{ scaleX: progress }} />

      <SectionNav sections={SECTIONS} />

      <main className="canvas">
        {/* ---------------- Home: hero + overview merged ---------------- */}
        <section id="hero" className="section hero-section">
          <div className="section-inner">
            <div className="hero-top">
              <div className="brand">
                <div className="brand-logo" aria-hidden="true">
                  SG
                </div>
                <div>
                  <h1>StayGraph</h1>
                  <p>Colleague-based corporate hotel recommendations</p>
                </div>
              </div>
              <div className="db-badge" title="Graph database connection status">
                <span className={"dot " + (dbOk == null ? "" : dbOk ? "ok" : "bad")} />
                {dbOk == null
                  ? "Checking CognoDB…"
                  : dbOk
                    ? "CognoDB connected"
                    : "CognoDB unreachable"}
              </div>
            </div>

            <motion.div
              className="hero-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <div className="hero-copy">
                <motion.span className="hero-eyebrow" variants={fadeUp}>
                  Powered by a graph, not a spreadsheet
                </motion.span>
                <motion.h2 className="hero-title" variants={fadeUp}>
                  Book where your colleagues actually stayed.
                </motion.h2>
                <motion.p className="hero-sub" variants={fadeUp}>
                  StayGraph traverses your company's real travel history to recommend
                  hotels — and shows the exact graph path behind every suggestion.
                </motion.p>
                <motion.div className="hero-cta" variants={fadeUp}>
                  <MagneticButton onClick={() => scrollToId("workspace")} className="btn btn-inline">
                    Recommend a stay
                  </MagneticButton>
                  <button className="btn-secondary" onClick={() => scrollToId("workspace")}>
                    See it in action
                  </button>
                </motion.div>
              </div>
              <motion.div className="hero-visual" variants={fadeUp} aria-hidden="true">
                <Illustration name="travel" alt="Corporate travel illustration" />
              </motion.div>
            </motion.div>

            {/* Overview / stats — merged into the home section */}
            {stats && (
              <motion.div
                className="overview-band"
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
              >
                <motion.div className="overview-copy" variants={fadeUp}>
                  <span className="section-kicker">At a glance</span>
                  <h3 className="overview-heading">The graph behind every recommendation</h3>
                  <p className="section-lead">
                    Every suggestion is grounded in this live network of companies, colleagues
                    and stays.
                  </p>
                </motion.div>
                <div className="stats-row">
                  {statItems.map((s) => (
                    <motion.div className="stat glass" key={s.lbl} variants={cardIn}>
                      <div className="num">
                        <AnimatedCounter value={s.num} />
                      </div>
                      <div className="lbl">{s.lbl}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ---------------- Primary workspace ---------------- */}
        <section id="workspace" className="section workspace-section">
          <div className="section-inner">
            <motion.div
              className="section-head"
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <span className="section-kicker">Workspace</span>
              <h2 className="section-heading">Plan a stay</h2>
              <p className="section-lead">
                Pick a traveler and destination — get hotels their colleagues rated well,
                each with a graph explanation.
              </p>
            </motion.div>

            {dbOk === false && (
              <ErrorState
                message="The graph database is unreachable. Check the backend .env connection details and that your CognoDB instance is running."
                onRetry={() => window.location.reload()}
              />
            )}

            <div className="grid layout">
              {/* Control panel */}
              <motion.aside
                className="panel glass"
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
              >
                <h2 className="section-title">Plan a stay</h2>

                {refError ? (
                  <ErrorState message={refError} onRetry={() => window.location.reload()} />
                ) : (
                  <>
                    <label className="field">
                      <span>Traveling employee</span>
                      <select
                        value={employeeId ?? ""}
                        onChange={(e) => setEmployeeId(Number(e.target.value))}
                      >
                        {employees.map((e) => (
                          <option key={e.employeeId} value={e.employeeId}>
                            {e.name} · {e.company}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Destination city</span>
                      <select value={city} onChange={(e) => setCity(e.target.value)}>
                        {cities.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name} {c.tier ? `(Tier ${c.tier})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Trip purpose (optional)</span>
                      <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                        <option value="">Any purpose</option>
                        {PURPOSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Max price / night (₹, optional)</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 2500"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </label>

                    <MagneticButton
                      onClick={getRecommendations}
                      disabled={loading || employeeId == null || !city}
                    >
                      {loading ? "Finding hotels…" : "Recommend hotels"}
                    </MagneticButton>
                  </>
                )}

                <AnimatePresence mode="wait">
                  {profile && (
                    <motion.div
                      key={profile.employeeId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}
                      style={{ marginTop: 24 }}
                    >
                      <h2 className="section-title">Recent stays</h2>
                      <p className="profile-name">{profile.name}</p>
                      <p className="profile-sub">
                        {profile.role} · {profile.company}
                        {profile.homeCity ? ` · based in ${profile.homeCity}` : ""}
                      </p>
                      {profile.recentStays.length ? (
                        <div className="rated-list">
                          {profile.recentStays.slice(0, 5).map((s, i) => (
                            <motion.div
                              className="rated-item"
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.04 * i, duration: 0.3 }}
                            >
                              <div>
                                <div>{s.hotel}</div>
                                <div className="sub">
                                  {s.city}
                                  {s.purpose ? ` · ${s.purpose}` : ""}
                                </div>
                              </div>
                              <div className="rating-tag">★ {s.rating}</div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <p className="profile-sub">No stays recorded yet.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.aside>

              {/* Results */}
              <main className="results">
                <div className="results-head">
                  <h2>
                    {selectedEmployee
                      ? `Hotels for ${selectedEmployee.name}`
                      : "Recommendations"}
                    {city ? ` in ${city}` : ""}
                  </h2>
                  <span className="hint">Ranked by how many colleagues stayed and rated well</span>
                </div>

                {!loading && !recError && recs && recs.length > 0 && (
                  <motion.div
                    className="insight"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="insight-text">
                      <b>Top pick: {recs[0].name}</b>{" "}
                      <span className="muted">
                        — {recs[0].colleagueCount} colleague
                        {recs[0].colleagueCount === 1 ? "" : "s"} rated it{" "}
                        {recs[0].colleagueAvgRating}★. {recs.length} option
                        {recs.length === 1 ? "" : "s"} found in {city}.
                      </span>
                    </div>
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  {loading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <SkeletonCards count={6} />
                    </motion.div>
                  )}

                  {!loading && recError && (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <ErrorState message={recError} onRetry={getRecommendations} />
                    </motion.div>
                  )}

                  {!loading && !recError && !searched && <HowItWorks key="how" />}

                  {!loading && !recError && searched && recs && recs.length === 0 && (
                    <EmptyState
                      key="empty"
                      title="No colleague stays match"
                      message="No colleagues from this company have well-rated stays in this city with the chosen filters. Try removing the purpose or raising the price cap."
                    />
                  )}

                  {!loading && !recError && recs && recs.length > 0 && employeeId != null && (
                    <motion.div
                      key="results"
                      className="cards"
                      variants={staggerContainer}
                      initial="hidden"
                      animate="show"
                    >
                      {recs.map((rec) => (
                        <RecommendationCard key={rec.hotelId} rec={rec} employeeId={employeeId} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>
          </div>
        </section>

        <footer className="section footer-section">
          <div className="section-inner footer-note">
            <span className="foot-item">Built for Hummingbird Digital</span>
            <span className="foot-sep">·</span>
            <span className="foot-item">Powered by CognoDB (openCypher over Bolt)</span>
            <span className="foot-sep">·</span>
            <span>Data is synthetic for demo purposes.</span>
            <button className="to-top" onClick={() => scrollToId("hero")}>
              Back to top ↑
            </button>
          </div>
        </footer>
      </main>
    </MotionConfig>
  );
}
