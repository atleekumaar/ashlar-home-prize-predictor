import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { model } from "@/data/model-data";
import {
  CONTROLS,
  GROUP_COPY,
  PRESETS,
  SHORT_LABEL,
  photoFor,
  readout,
  tractTitle,
  type SliderControl,
} from "@/lib/features";
import {
  LENSES,
  dollarsFromMedv,
  formatCompact,
  formatMoney,
  formatSignedDollars,
  lensById,
  roundDollars,
  type LensId,
} from "@/lib/format";
import {
  featureIndex,
  nearestTracts,
  percentileOf,
  predictMedv,
  pricePushes,
  valueAtPercentile,
  vectorFromRow,
} from "@/lib/predict";

const STORAGE_KEY = "ashlar.saved.v1";
const GROUPS = ["The home", "The block", "Getting around"];

type SavedEstimate = {
  id: string;
  name: string;
  at: number;
  x: number[];
  lens: LensId;
  medv: number;
};

function sameVector(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 1e-4);
}

function monthlyPayment(principal: number, annualPercent: number, years = 30) {
  if (principal <= 0) return 0;
  const monthly = annualPercent / 100 / 12;
  const payments = years * 12;
  if (monthly === 0) return principal / payments;
  const grown = (1 + monthly) ** payments;
  return (principal * monthly * grown) / (grown - 1);
}

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm shadow-none">
      <div className="text-muted">{label} rooms</div>
      <div className="numeric font-serif text-lg text-ink">{formatMoney(payload[0].value)}</div>
    </div>
  );
}

function RoomCurve({ x, factor }: { x: number[]; factor: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const roomIndex = featureIndex("RM");
  const data = useMemo(() => {
    const points = [];
    for (let rooms = 4; rooms <= 8.5 + 1e-6; rooms += 0.25) {
      const next = x.slice();
      next[roomIndex] = Number(rooms.toFixed(2));
      points.push({
        rooms: rooms.toFixed(1),
        value: roundDollars(dollarsFromMedv(predictMedv(next), factor), factor),
      });
    }
    return points;
  }, [x, factor, roomIndex]);

  if (!mounted) return <div className="h-56" />;

  return (
    <div className="h-56 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="rooms"
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompact(value)}
            width={52}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-pine)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--color-pine)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AshlarApp() {
  const [x, setX] = useState(() => vectorFromRow(78));
  const [lens, setLens] = useState<LensId>("coastal");
  const [down, setDown] = useState(0.2);
  const [rateText, setRateText] = useState("6.5");
  const [saved, setSaved] = useState<SavedEstimate[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedEstimate[];
      if (Array.isArray(parsed)) setSaved(parsed.slice(0, 12));
    } catch {
      /* ignore broken local storage */
    }
  }, []);

  function persist(next: SavedEstimate[]) {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }

  const active = PRESETS.find((preset) => sameVector(x, vectorFromRow(preset.rowId)));
  const medv = useMemo(() => predictMedv(x), [x]);
  const lensMeta = lensById(lens);
  const price = roundDollars(dollarsFromMedv(medv, lensMeta.factor), lensMeta.factor);
  const miss = roundDollars(dollarsFromMedv(model.metrics.testMae, lensMeta.factor), lensMeta.factor);
  const pushes = useMemo(() => pricePushes(x), [x]);
  const neighbors = useMemo(() => nearestTracts(x, 3), [x]);
  const photo = photoFor(x);
  const capped = medv >= 48;
  const rate = Number(rateText);
  const rateOk = Number.isFinite(rate) && rate >= 0 && rate < 30;
  const loan = price * (1 - down);
  const payment = rateOk ? monthlyPayment(loan, rate) : 0;
  const taxAnnual = price * (x[featureIndex("TAX")] / 10000);
  const taxMonthly = taxAnnual / 12;
  const marker = Math.min(98, Math.max(2, ((medv - 5) / 45) * 100));
  const maxPush = Math.max(...pushes.map((push) => Math.abs(push.deltaMedv)), 0.01);
  const correlations = Object.entries(model.correlation).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  );
  const histMax = Math.max(...model.histogram.map((bin) => bin.count));

  function update(index: number, value: number) {
    setX((current) => {
      const next = current.slice();
      next[index] = value;
      return next;
    });
  }

  function saveEstimate() {
    const alreadySaved = saved.some(
      (entry) => entry.lens === lens && sameVector(entry.x, x),
    );
    if (alreadySaved) return;

    const entry: SavedEstimate = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: active?.name ?? "Custom home",
      at: Date.now(),
      x: x.slice(),
      lens,
      medv,
    };
    persist([entry, ...saved].slice(0, 12));
  }

  async function copySummary() {
    const lines = [
      `Ashlar · ${active?.name ?? "Custom home"}`,
      `${lensMeta.label}: ${formatMoney(price)}`,
      `Study figure: ${formatMoney(roundDollars(dollarsFromMedv(medv, 1), 1))}`,
      `Typical miss: ${formatMoney(miss)}`,
      ...pushes.slice(0, 3).map((push) => {
        const signed = formatSignedDollars(dollarsFromMedv(push.deltaMedv, lensMeta.factor), lensMeta.factor);
        return `${SHORT_LABEL[push.feature]}: ${signed}`;
      }),
      "Not an appraisal. Boston housing study, XGBoost.",
    ];
    const text = lines.join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div id="top" className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
          <a href="#top" className="font-serif text-2xl tracking-tight text-ink">
            Ashlar
          </a>
          <nav className="flex items-center gap-4 text-sm md:gap-6">
            <a href="#estimate" className="text-ink">
              Estimate
            </a>
            <a href="#study" className="text-muted">
              Study
            </a>
            <a href="#saved" className="text-muted">
              Saved
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl overflow-x-clip px-5 pb-24 md:px-8">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-16">
          <div>
            <p className="text-xs font-medium tracking-widest text-pine uppercase">House value studio</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-tight tracking-tight text-ink md:text-6xl">
              A house price you can take apart.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Twelve facts about a home and its block, scored by the XGBoost model from the Boston
              housing notebook. Move a dial. The price, the reasons, and three similar tracts move
              with it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#estimate"
                className="inline-flex h-11 items-center rounded-full bg-pine px-5 text-paper"
              >
                Build an estimate
              </a>
              <a
                href="#study"
                className="inline-flex h-11 items-center rounded-full border border-line bg-card px-5 text-ink"
              >
                How the model works
              </a>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-line pt-6">
              <div>
                <dt className="text-xs text-muted">Tracts</dt>
                <dd className="numeric mt-1 font-serif text-2xl">{model.metrics.nRows}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Test R²</dt>
                <dd className="numeric mt-1 font-serif text-2xl">{model.metrics.testR2.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">1978 miss</dt>
                <dd className="numeric mt-1 font-serif text-2xl">
                  {formatMoney(model.metrics.testMae * 1000)}
                </dd>
              </div>
            </dl>
          </div>
          <figure>
            <img
              src="/images/street.jpg"
              alt="A quiet morning street of pale brick townhouses with a rust-colored tree"
              width={1792}
              height={1008}
              className="aspect-video w-full rounded-2xl object-cover"
            />
            <figcaption className="mt-3 text-sm text-muted">
              The dials describe a tract, not a listing photo. The picture follows the kind of place
              you build.
            </figcaption>
          </figure>
        </section>

        <section id="estimate" className="scroll-mt-24 border-t border-line py-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-3xl tracking-tight md:text-4xl">Estimate</h2>
              <p className="mt-2 max-w-xl text-muted">
                {active?.blurb ?? "Custom — these dials no longer match a sample tract."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {PRESETS.map((preset) => {
              const selected = active?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setX(vectorFromRow(preset.rowId))}
                  className={
                    selected
                      ? "h-11 shrink-0 rounded-full bg-pine px-4 text-sm text-paper"
                      : "h-11 shrink-0 rounded-full border border-line bg-card px-4 text-sm text-ink"
                  }
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <form
              className="order-2 space-y-10 lg:order-1"
              onSubmit={(event) => event.preventDefault()}
            >
              {GROUPS.map((group) => (
                <fieldset key={group} className="space-y-6">
                  <legend className="w-full border-b border-line pb-3">
                    <span className="font-serif text-2xl text-ink">{group}</span>
                    <span className="mt-1 block text-sm text-muted">{GROUP_COPY[group]}</span>
                  </legend>
                  {CONTROLS.filter((control) => control.group === group).map((control) => {
                    const index = featureIndex(control.feature);
                    if (control.kind === "toggle") {
                      const on = x[index] >= 0.5;
                      return (
                        <div key={control.feature} className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-base text-ink">{control.label}</div>
                            <div className="text-sm text-muted">{control.hint}</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            onClick={() => update(index, on ? 0 : 1)}
                            className={
                              on
                                ? "h-11 min-w-20 rounded-full bg-pine px-4 text-sm text-paper"
                                : "h-11 min-w-20 rounded-full border border-line bg-card px-4 text-sm text-ink"
                            }
                          >
                            {on ? "Yes" : "No"}
                          </button>
                        </div>
                      );
                    }
                    return (
                      <SliderRow
                        key={control.feature}
                        control={control}
                        value={x[index]}
                        onChange={(value) => update(index, value)}
                      />
                    );
                  })}
                </fieldset>
              ))}
              <details className="border-t border-line pt-4 text-sm text-muted">
                <summary className="h-11 cursor-pointer text-ink">Study field names</summary>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {model.features.map((feature, index) => (
                    <li key={feature} className="numeric flex justify-between gap-3 border-b border-line py-2">
                      <span>
                        {SHORT_LABEL[feature]} · {feature}
                      </span>
                      <span>{x[index].toFixed(feature === "RM" || feature === "NOX" ? 3 : 2)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </form>

            <aside className="order-1 lg:sticky lg:top-24 lg:order-2">
              <div className="overflow-hidden rounded-2xl border border-line bg-card">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  width={1728}
                  height={1152}
                  className="aspect-video w-full object-cover"
                />
                <div className="space-y-5 p-5 md:p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-muted">{photo.caption}</p>
                    <p className="text-sm text-muted">{active?.name ?? "Custom home"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">
                      {lens === "study" ? "Study value · 1978" : "Illustrated value"}
                    </p>
                    <p aria-live="polite" className="numeric mt-1 font-serif text-5xl tracking-tight text-ink">
                      {formatMoney(price)}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{lensMeta.note}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LENSES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLens(item.id)}
                        className={
                          lens === item.id
                            ? "h-11 rounded-full bg-pine px-4 text-sm text-paper"
                            : "h-11 rounded-full border border-line px-4 text-sm text-ink"
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {lens !== "study" ? (
                    <p className="numeric text-sm text-muted">
                      Study figure {formatMoney(roundDollars(dollarsFromMedv(medv, 1), 1))} · lens ×
                      {lensMeta.factor}
                    </p>
                  ) : null}
                  <div>
                    <div className="relative h-8">
                      <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-line" />
                      <div
                        className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-pine bg-card"
                        style={{ left: `${marker}%` }}
                      />
                    </div>
                    <div className="numeric flex justify-between text-xs text-muted">
                      <span>{formatMoney(roundDollars(dollarsFromMedv(5, lensMeta.factor), lensMeta.factor))}</span>
                      <span>Among the 506 tracts</span>
                      <span>{formatMoney(roundDollars(dollarsFromMedv(50, lensMeta.factor), lensMeta.factor))}</span>
                    </div>
                  </div>
                  {capped ? (
                    <p className="rounded-xl bg-mist px-3 py-3 text-sm leading-relaxed text-ink">
                      The study never records a value above 50. This estimate is against that ceiling,
                      so read it as “at least this.”
                    </p>
                  ) : null}
                  <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <div>
                      <dt className="text-xs text-muted">Per room</dt>
                      <dd className="numeric mt-1 text-sm">
                        {formatMoney(roundDollars(price / Math.max(x[featureIndex("RM")], 1), lensMeta.factor))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Tax rate</dt>
                      <dd className="numeric mt-1 text-sm">{(x[featureIndex("TAX")] / 100).toFixed(2)}%</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Typical miss</dt>
                      <dd className="numeric mt-1 text-sm">±{formatMoney(miss)}</dd>
                    </div>
                  </dl>
                  <div className="space-y-3 border-t border-line pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-serif text-xl">What moves it</h3>
                      <span className="text-xs text-muted">Versus a typical tract</span>
                    </div>
                    <ul className="space-y-3">
                      {pushes.slice(0, 4).map((push) => (
                        <li key={push.feature}>
                          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                            <span>{SHORT_LABEL[push.feature]}</span>
                            <span className="numeric text-muted">
                              {formatSignedDollars(
                                dollarsFromMedv(push.deltaMedv, lensMeta.factor),
                                lensMeta.factor,
                              )}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-paper-deep">
                            <div
                              className={
                                push.deltaMedv >= 0
                                  ? "h-1.5 rounded-full bg-pine"
                                  : "h-1.5 rounded-full bg-ink"
                              }
                              style={{
                                width: `${Math.max(8, (Math.abs(push.deltaMedv) / maxPush) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3 border-t border-line pt-4">
                    <h3 className="font-serif text-xl">Monthly sketch</h3>
                    <div className="flex flex-wrap gap-2">
                      {[0.1, 0.2, 0.3].map((share) => (
                        <button
                          key={share}
                          type="button"
                          onClick={() => setDown(share)}
                          className={
                            down === share
                              ? "h-11 rounded-full bg-pine px-4 text-sm text-paper"
                              : "h-11 rounded-full border border-line px-4 text-sm text-ink"
                          }
                        >
                          {Math.round(share * 100)}% down
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted">Rate, 30-year fixed</span>
                      <input
                        value={rateText}
                        onChange={(event) => setRateText(event.target.value)}
                        inputMode="decimal"
                        className={`numeric h-11 w-24 rounded-full border bg-paper px-3 text-right text-ink ${
                          !rateOk ? "border-amber-700/60" : "border-line"
                        }`}
                        aria-label="Mortgage interest rate"
                        aria-invalid={!rateOk}
                      />
                    </label>
                    {!rateOk ? (
                      <p className="text-xs text-amber-800" role="alert">
                        Please enter a valid rate between 0% and 30%.
                      </p>
                    ) : null}
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Loan payment</dt>
                        <dd className="numeric">{rateOk ? formatMoney(payment) : "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Study tax, per month</dt>
                        <dd className="numeric">{formatMoney(taxMonthly)}</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-t border-line pt-2 text-base">
                        <dt>Together</dt>
                        <dd className="numeric font-medium">
                          {rateOk ? formatMoney(payment + taxMonthly) : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                    <button
                      type="button"
                      onClick={saveEstimate}
                      className="h-11 rounded-full bg-pine px-4 text-sm text-paper"
                    >
                      Save on this device
                    </button>
                    <button
                      type="button"
                      onClick={copySummary}
                      className="h-11 rounded-full border border-line px-4 text-sm text-ink"
                    >
                      {copied ? "Copied" : "Copy summary"}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-14">
            <h3 className="font-serif text-3xl tracking-tight">Tracts like this one</h3>
            <p className="mt-2 max-w-xl text-muted">
              Nearest rows in the study, after each fact is scaled. Recorded prices, not the model’s
              guess.
            </p>
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {neighbors.map((neighbor) => (
                <li key={neighbor.id} className="flex flex-col rounded-2xl border border-line bg-card p-5">
                  <p className="text-sm text-muted">{tractTitle(neighbor.x)}</p>
                  <p className="mt-2 font-serif text-2xl tracking-tight">
                    {formatMoney(roundDollars(dollarsFromMedv(neighbor.price, lensMeta.factor), lensMeta.factor))}
                  </p>
                  <p className="numeric mt-2 text-sm text-muted">
                    Study row {neighbor.id} · {readout("RM", neighbor.x[featureIndex("RM")])}
                  </p>
                  <p className="mt-1 text-sm text-muted">{readout("LSTAT", neighbor.x[featureIndex("LSTAT")])}</p>
                  <button
                    type="button"
                    onClick={() => setX(neighbor.x.slice())}
                    className="mt-5 h-11 self-start rounded-full border border-line px-4 text-sm text-ink"
                  >
                    Use these facts
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-14 rounded-2xl border border-line bg-card p-5 md:p-6">
            <h3 className="font-serif text-3xl tracking-tight">Rooms, holding the block still</h3>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Only the room count changes. Crime, tax, schools, and the river stay where you set them.
              Now at {x[featureIndex("RM")].toFixed(1)} rooms.
            </p>
            <div className="mt-4">
              <RoomCurve x={x} factor={lensMeta.factor} />
            </div>
          </div>
        </section>

        <section id="study" className="scroll-mt-24 border-t border-line py-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-3xl tracking-tight md:text-4xl">The model</h2>
              <p className="mt-4 leading-relaxed text-muted">
                Ashlar ships the house-price notebook’s recipe: an XGBoost regressor, an 80/20 split,
                and <span className="numeric">random_state 2</span>. Today’s library defaults memorize
                this small file, so the trees here are 100 deep-3 trees at a learning rate of 0.1 — the
                setting that lands on the notebook’s published test error.
              </p>
              <p className="mt-3 leading-relaxed text-muted">
                The 1970s file also had a racial composition column named B. It is not an input. Nothing
                on this page asks for it, and the trees were fit without it.
              </p>
              <a
                href="https://github.com/atleekumaar/ashlar-home-prize-predictor"
                className="mt-4 inline-flex text-pine underline decoration-line underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                Project on GitHub
              </a>
            </div>
            <img
              src="/images/interior.jpg"
              alt="A sunlit living room with oak floors, a linen sofa, and tall sash windows"
              width={1600}
              height={1200}
              className="aspect-video w-full rounded-2xl object-cover"
            />
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Train R²", model.metrics.trainR2.toFixed(3)],
              ["Test R²", model.metrics.testR2.toFixed(3)],
              ["Train MAE", model.metrics.trainMae.toFixed(2)],
              ["Test MAE", model.metrics.testMae.toFixed(2)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-card p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="numeric mt-2 font-serif text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-muted">
            MAE is in the study’s unit: thousands of 1978 dollars. A test miss of {model.metrics.testMae.toFixed(2)} is
            about {formatMoney(model.metrics.testMae * 1000)} then.
          </p>

          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-serif text-2xl">How each fact moved with price</h3>
              <p className="mt-2 text-sm text-muted">Correlation in the 506 tracts. Right is higher price.</p>
              <ul className="mt-5 space-y-3">
                {correlations.map(([feature, value]) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0">{SHORT_LABEL[feature]}</span>
                    <span className="relative h-2 flex-1 rounded-full bg-paper-deep">
                      <span className="absolute top-0 left-1/2 h-2 w-px bg-line" />
                      <span
                        className="absolute top-0 h-2 rounded-full bg-pine"
                        style={{
                          left: value >= 0 ? "50%" : `${50 + value * 50}%`,
                          width: `${Math.abs(value) * 50}%`,
                        }}
                      />
                    </span>
                    <span className="numeric w-12 text-right text-muted">{value.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-serif text-2xl">Recorded values</h3>
              <p className="mt-2 text-sm text-muted">
                Count of tracts by median value, in thousands of 1978 dollars. The pile at 50 is the cap.
              </p>
              <div className="mt-6 flex h-40 items-end gap-2">
                {model.histogram.map((bin) => (
                  <div key={bin.from} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div
                      className="rounded-t-md bg-pine"
                      style={{ height: `${Math.max(6, (bin.count / histMax) * 100)}%` }}
                    />
                    <div className="numeric text-center text-xs text-muted">{bin.from}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="saved" className="scroll-mt-24 border-t border-line py-14">
          <h2 className="font-serif text-3xl tracking-tight md:text-4xl">Saved</h2>
          <p className="mt-2 max-w-xl text-muted">Kept in this browser only. Nothing is sent away.</p>
          {saved.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-line px-5 py-8 text-muted">
              No estimates yet. Build one and save it — it will sit here.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
              {saved.map((item) => {
                const itemLens = lensById(item.lens);
                const itemPrice = roundDollars(dollarsFromMedv(item.medv, itemLens.factor), itemLens.factor);
                return (
                  <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-ink">{item.name}</p>
                      <p className="numeric text-sm text-muted">
                        {formatMoney(itemPrice)} · {itemLens.label}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setX(item.x.slice());
                          setLens(item.lens);
                        }}
                        className="h-11 rounded-full bg-pine px-4 text-sm text-paper"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => persist(saved.filter((entry) => entry.id !== item.id))}
                        className="h-11 rounded-full border border-line px-4 text-sm text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted md:px-8">
          <p>Ashlar is a study tool, not a listing price and not a loan offer.</p>
          <p>Model after the house-price-estimator notebook. Photos are studio images, not the tracts.</p>
        </div>
      </footer>
    </div>
  );
}

function SliderRow({
  control,
  value,
  onChange,
}: {
  control: SliderControl;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = `dial-${control.feature}`;
  if (control.kind === "rooms") {
    return (
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-base text-ink">
            {control.label}
          </label>
          <span className="numeric text-sm text-muted">{readout(control.feature, value)}</span>
        </div>
        <input
          id={id}
          className="dial"
          type="range"
          min={3.5}
          max={8.8}
          step={0.05}
          value={Math.min(8.8, Math.max(3.5, value))}
          aria-label={control.label}
          aria-valuemin={3.5}
          aria-valuemax={8.8}
          aria-valuenow={Number(value.toFixed(2))}
          aria-valuetext={readout(control.feature, value)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{control.low}</span>
          <span>{control.high}</span>
        </div>
      </div>
    );
  }

  const knot = percentileOf(control.feature, value);
  const position = control.invert ? 100 - knot : knot;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base text-ink">
          {control.label}
        </label>
        <span className="numeric text-sm text-muted">{readout(control.feature, value)}</span>
      </div>
      <input
        id={id}
        className="dial"
        type="range"
        min={0}
        max={100}
        step={1}
        value={position}
        aria-label={control.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
        aria-valuetext={readout(control.feature, value)}
        onChange={(event) => {
          const next = Number(event.target.value);
          const raw = control.invert ? 100 - next : next;
          onChange(valueAtPercentile(control.feature, raw));
        }}
      />
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>{control.low}</span>
        <span>{control.high}</span>
      </div>
    </div>
  );
}
