import { useState, type FormEvent, type ReactNode } from "react";
import type { Tables } from "../lib/database.types";
import { DAY_NAMES } from "../lib/days";
import {
  clampPoundsInput,
  parsePoundsToPence,
  penceToPoundsInput,
} from "../lib/money";
import { useIsOnline } from "../lib/offline";
import {
  findNightRule,
  findWeekendRule,
  type RatePlan,
} from "../lib/rateShapes";
import {
  ErrorText,
  Field,
  NeedsConnection,
  PrimaryButton,
  inputCls,
  selectCls,
} from "./ui";

export interface AgencyFormValues {
  name: string;
  base_rate_pence: number;
  pay_cycle: string;
  pay_week_start_day: number;
  pay_delay_days: number;
  notes: string | null;
}

interface Props {
  initial?: Tables<"agencies">;
  /** The agency's current rules, so the two tick boxes show its real rates. */
  rules?: readonly Tables<"rate_rules">[];
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: AgencyFormValues, rates: RatePlan) => void;
}

/** A rate you can switch on, with its fields revealed underneath. */
function RateToggle({
  on,
  onChange,
  title,
  subtitle,
  children,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        on ? "border-accent/60 bg-accent/5" : "border-edge bg-surface"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 size-4 shrink-0 accent-(--color-accent)"
        />
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted">{subtitle}</span>
        </span>
      </label>
      {on && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}

export function AgencyFormFields({
  initial,
  rules = [],
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const online = useIsOnline();
  const existingNight = findNightRule(rules);
  const existingWeekend = findWeekendRule(rules);
  const [name, setName] = useState(initial?.name ?? "");
  const [baseRate, setBaseRate] = useState(
    initial ? penceToPoundsInput(initial.base_rate_pence) : ""
  );
  const [payCycle, setPayCycle] = useState(initial?.pay_cycle ?? "weekly");
  const [weekStartDay, setWeekStartDay] = useState(
    String(initial?.pay_week_start_day ?? 1)
  );
  const [payDelay, setPayDelay] = useState(
    String(initial?.pay_delay_days ?? 4)
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [validation, setValidation] = useState<string | null>(null);

  // The two rates almost everyone has sit right here beside the normal one,
  // both when adding an agency and when changing it later. Unticking removes
  // the rate; there is nowhere else to go for it.
  const [night, setNight] = useState(existingNight !== undefined);
  const [nightFrom, setNightFrom] = useState(
    existingNight?.band_start?.slice(0, 5) ?? "22:00"
  );
  const [nightTo, setNightTo] = useState(
    existingNight?.band_end?.slice(0, 5) ?? "06:00"
  );
  const [nightRate, setNightRate] = useState(
    existingNight?.rate_pence != null
      ? penceToPoundsInput(existingNight.rate_pence)
      : ""
  );

  const [weekend, setWeekend] = useState(existingWeekend !== undefined);
  const [weekendRate, setWeekendRate] = useState(
    existingWeekend?.rate_pence != null
      ? penceToPoundsInput(existingWeekend.rate_pence)
      : ""
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    setValidation(null);

    const ratePence = parsePoundsToPence(baseRate);
    if (ratePence === null) {
      setValidation("Your normal hourly rate should look like 12.50.");
      return;
    }
    const delay = Number(payDelay || "0");
    if (!Number.isInteger(delay) || delay < 0) {
      setValidation("Days until payday must be a whole number.");
      return;
    }

    const plan: RatePlan = { night: null, weekend: null };

    if (night) {
      const pence = parsePoundsToPence(nightRate);
      if (pence === null) {
        setValidation("The night rate should look like 14.50.");
        return;
      }
      plan.night = { from: nightFrom, to: nightTo, ratePence: pence };
    }

    if (weekend) {
      const pence = parsePoundsToPence(weekendRate);
      if (pence === null) {
        setValidation("The weekend rate should look like 15.00.");
        return;
      }
      plan.weekend = { ratePence: pence };
    }

    onSubmit(
      {
        name: name.trim(),
        base_rate_pence: ratePence,
        pay_cycle: payCycle,
        pay_week_start_day: Number(weekStartDay),
        pay_delay_days: delay,
        notes: notes.trim() === "" ? null : notes.trim(),
      },
      plan
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Who do you work for?">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="e.g. Meridian Staffing"
          required
        />
      </Field>

      <div>
        <Field label="Your normal hourly rate">
          <input
            value={baseRate}
            onChange={(e) => setBaseRate(clampPoundsInput(e.target.value))}
            className={inputCls}
            inputMode="decimal"
            placeholder="12.50"
            required
          />
        </Field>
        <p className="mt-1 text-xs text-muted">
          What one ordinary daytime hour pays, in pounds. Nights and weekends go
          below, so don&rsquo;t average them into this.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Do some hours pay more?</h2>
          <p className="text-xs text-muted">
            Tick any that apply. Untick one to remove it.
          </p>
        </div>

        <RateToggle
          on={night}
          onChange={setNight}
          title="Night rate"
          subtitle="A higher rate between two times"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input
                type="time"
                value={nightFrom}
                onChange={(e) => setNightFrom(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Until">
              <input
                type="time"
                value={nightTo}
                onChange={(e) => setNightTo(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Night hourly rate">
            <input
              value={nightRate}
              onChange={(e) => setNightRate(clampPoundsInput(e.target.value))}
              className={inputCls}
              inputMode="decimal"
              placeholder="14.50"
            />
          </Field>
        </RateToggle>

        <RateToggle
          on={weekend}
          onChange={setWeekend}
          title="Weekend rate"
          subtitle="A different rate on Saturdays and Sundays"
        >
          <Field label="Weekend hourly rate">
            <input
              value={weekendRate}
              onChange={(e) => setWeekendRate(clampPoundsInput(e.target.value))}
              className={inputCls}
              inputMode="decimal"
              placeholder="15.00"
            />
          </Field>
          {night && (
            <p className="text-xs text-muted">
              Hours that are both — a Saturday night — pay this weekend rate.
            </p>
          )}
        </RateToggle>
      </section>

      <details className="rounded-xl border border-edge bg-surface p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          When you get paid
          <span className="ml-2 font-normal text-muted">
            — only affects the Payday screen
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid every">
              <select
                value={payCycle}
                onChange={(e) => setPayCycle(e.target.value)}
                className={selectCls}
              >
                <option value="weekly">week</option>
                <option value="fortnightly">fortnight</option>
                <option value="monthly">month</option>
              </select>
            </Field>
            <Field label="Pay week starts">
              <select
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(e.target.value)}
                className={selectCls}
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div>
            <Field label="Days from the week ending to payday">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={payDelay}
                onChange={(e) => setPayDelay(e.target.value)}
                className={inputCls}
              />
            </Field>
            <p className="mt-1 text-xs text-muted">
              Week ends Sunday and you&rsquo;re paid the following Friday?
              That&rsquo;s 5.
            </p>
          </div>
          <Field label="Notes">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
              placeholder="optional"
            />
          </Field>
        </div>
      </details>

      {validation && <p className="text-sm text-negative">{validation}</p>}
      <ErrorText error={error} />
      {!online && <NeedsConnection />}

      <PrimaryButton disabled={pending || !online}>
        {pending ? "Saving…" : submitLabel}
      </PrimaryButton>
    </form>
  );
}
