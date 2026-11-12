// The records rack: every kit in order of release (spec: PROD-7 to PROD-13).
// A React island. All text arrives as props, already translated and formatted (I18N-12).

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { coverSrc } from "../../data/cover.ts";
import {
  keyTarget,
  kitToStrip,
  rackScale,
  SLEEVE_PX,
  sleeveOffset,
  stripToKit,
  yearGroups,
  yearOf,
} from "./geometry.ts";

interface Text {
  text: string;
  lang?: string | undefined;
}

export interface RackKit {
  slug: string;
  href: string;
  year: string;
  title: Text;
  credit: Text;
  /** Link for the credit when the kit has a single artist. */
  artistHref: string | null;
  date: string;
  batch: Text | null;
  catalogue: string;
  edition: string;
  description: Text | null;
  cover: { path: string; width: number; height: number };
  /** Accessible names: the selected sleeve (a link) and the others (buttons). */
  openLabel: string;
  goToLabel: string;
}

export interface RackStrings {
  region: string;
  years: string;
  card: string;
  artist: string;
  released: string;
  catalogue: string;
  edition: string;
  descriptionBy: string;
  open: string;
  /** Accessible name of each year button, by year. */
  yearLabels: Record<string, string>;
}

interface Props {
  kits: RackKit[];
  strings: RackStrings;
  /** Selected kit before the URL hash is read. */
  initial: number;
}

/** Sleeves drawn on each side of the selected one. */
const WINDOW = 4;
/** Pixels of dragging that move the rack by one kit, at scale 1. */
const DRAG_PX_PER_KIT = 420;
/** Wheel delta that moves the rack by one kit. */
const WHEEL_PER_KIT = 650;

const clampTo = (n: number, max: number) => Math.max(0, Math.min(max, n));

export default function Rack({ kits, strings, initial }: Props) {
  const last = kits.length - 1;
  const groups = useMemo(() => yearGroups(kits.map((k) => k.year)), [kits]);
  const indexOf = useMemo(() => new Map(kits.map((k, i) => [k.slug, i])), [kits]);

  // `target` is where the rack is heading; `position` follows it with easing (PROD-13: at once with reduced motion).
  const [target, setTarget] = useState(initial);
  const [position, setPosition] = useState(initial);
  const stage = useRef<HTMLElement>(null);
  const targetRef = useRef(initial);
  const positionRef = useRef(initial);
  const press = useRef<{ x: number; target: number; dragged: boolean } | null>(null);
  const suppressClick = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrubbing = useRef(false);

  const go = useCallback(
    (next: number) => {
      const value = clampTo(next, last);
      targetRef.current = value;
      setTarget(value);
    },
    [last],
  );
  const snapSoon = useCallback(
    (ms: number) => {
      clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => go(Math.round(targetRef.current)), ms);
    },
    [go],
  );

  // Easing loop.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      positionRef.current = target;
      setPosition(target);
      return;
    }
    let frame = 0;
    const tick = () => {
      const p = positionRef.current;
      const d = targetRef.current - p;
      const next = Math.abs(d) < 0.001 ? targetRef.current : p + d * (Math.abs(d) > 6 ? 0.16 : 0.12);
      positionRef.current = next;
      setPosition(next);
      if (next !== targetRef.current) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  // PROD-12: the selected kit lives in the URL hash.
  useEffect(() => {
    const fromHash = () => {
      const i = indexOf.get(decodeURIComponent(location.hash.slice(1)));
      if (i === undefined) return;
      targetRef.current = i;
      positionRef.current = i;
      setTarget(i);
      setPosition(i);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [indexOf]);

  const selected = clampTo(Math.round(position), last);
  const settled = Number.isInteger(target) && press.current === null;
  useEffect(() => {
    if (!settled) return;
    const slug = kits[target]?.slug;
    // The default selection needs no hash; a moved rack always gets one.
    if (!slug || (location.hash === "" && target === initial)) return;
    if (location.hash !== `#${slug}`) history.replaceState(history.state, "", `#${slug}`);
  }, [settled, target, kits, initial]);

  // Mouse wheel (PROD-11). Needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 40;
      const next = clampTo(targetRef.current + d / WHEEL_PER_KIT, last);
      if (next === targetRef.current) return;
      e.preventDefault();
      go(next);
      snapSoon(160);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [go, snapSoon, last]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      // The kit the rack is heading to, not the one it is passing on the way.
      const kit = kits[Math.round(targetRef.current)];
      if (kit && e.target === e.currentTarget) location.href = kit.href;
      return;
    }
    const next = keyTarget(groups, e.key, Math.round(targetRef.current), kits.length);
    if (next === null) return;
    e.preventDefault();
    go(next);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    press.current = { x: e.clientX, target: targetRef.current, dragged: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    if (!p.dragged && Math.abs(dx) > 6) {
      p.dragged = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (p.dragged) go(p.target - dx / (DRAG_PX_PER_KIT * rackScale(e.currentTarget.clientWidth)));
  };
  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (p?.dragged) {
      suppressClick.current = true;
      go(Math.round(targetRef.current));
    }
  };

  const scrubTo = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    go(stripToKit(groups, clampTo((e.clientX - r.left) / r.width, 0.9999)));
  };

  const kit = kits[selected] as RackKit;
  const currentYear = yearOf(groups, selected);
  const sleeves = [];
  for (let i = Math.max(0, Math.floor(position) - WINDOW); i <= Math.min(last, Math.ceil(position) + WINDOW); i++) {
    sleeves.push(i);
  }

  return (
    <div className="@container/rack relative">
      <section
        aria-label={strings.card}
        aria-live="polite"
        className="relative z-20 m-4 lg:absolute lg:top-10 lg:left-10 lg:m-0 lg:w-64"
      >
        <div className="relative overflow-hidden bg-signal px-[18px] pt-[18px] pb-4 text-ink">
          <p
            aria-hidden="true"
            data-year={kit.year}
            className="pointer-events-none absolute -top-1 -right-1.5 m-0 rotate-[-8deg] font-stencil text-[76px] leading-none text-ink/20 before:content-[attr(data-year)]"
          />
          <h2
            lang={kit.title.lang}
            className="relative mt-6 mb-3.5 font-condensed text-[clamp(2rem,3vw,2.75rem)] leading-[0.92] font-extrabold uppercase"
          >
            <a href={kit.href} className="hover:text-ink hover:underline focus-visible:outline-ink">
              {kit.title.text}
            </a>
          </h2>
          <dl className="m-0 border-y-2 border-ink font-mono text-xs">
            <Row label={strings.artist} first>
              {kit.artistHref ? (
                <a
                  href={kit.artistHref}
                  lang={kit.credit.lang}
                  className="underline decoration-2 underline-offset-[3px] hover:text-ink focus-visible:outline-ink"
                >
                  {kit.credit.text}
                </a>
              ) : (
                <span lang={kit.credit.lang}>{kit.credit.text}</span>
              )}
            </Row>
            <Row label={strings.released}>
              {kit.date}
              {kit.batch && (
                <span lang={kit.batch.lang} className="mt-0.5 block opacity-75">
                  {kit.batch.text}
                </span>
              )}
            </Row>
            <Row label={strings.catalogue}>{kit.catalogue}</Row>
            <Row label={strings.edition}>{kit.edition}</Row>
          </dl>
        </div>
      </section>

      <section
        ref={stage}
        aria-roledescription="carousel"
        aria-label={strings.region}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the rack is a keyboard-operable carousel (PROD-11)
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // Sizes come from CSS, so the page is laid out right before the island hydrates (PROD-36).
        // --w is the sleeve width, SLEEVE_PX * rackScale(): 420 px from 900 px, else 55.263cqw (420/760) within 210 to 336 px.
        className="relative isolate h-[250px] cursor-grab touch-pan-y overflow-hidden select-none [--b:40px] [--c:0px] [--w:clamp(210px,55.263cqw,336px)] focus-visible:outline-offset-[-2px] active:cursor-grabbing @min-[900px]/rack:h-[560px] @min-[900px]/rack:[--b:80px] @min-[900px]/rack:[--c:120px] @min-[900px]/rack:[--w:420px]"
      >
        {sleeves.map((i) => {
          const k = kits[i] as RackKit;
          const d = i - position;
          const front = i === selected;
          const sleeveScale = 1 - Math.min(Math.abs(d), 1) * 0.4;
          const style = {
            width: "var(--w)",
            left: "calc(50% + var(--c) - var(--w) / 2)",
            bottom: "var(--b)",
            zIndex: 100 - Math.round(Math.abs(d) * 12),
            transform: `translate3d(calc(var(--w) * ${(sleeveOffset(d) / SLEEVE_PX).toFixed(4)}),0,0)`,
          };
          const image = (
            <img
              src={coverSrc(k.cover)}
              width={k.cover.width}
              height={k.cover.height}
              alt=""
              draggable={false}
              // The selected sleeve is the largest image on the page; it goes first (PROD-36).
              fetchPriority={front ? "high" : undefined}
              loading={front ? undefined : "lazy"}
              className="pointer-events-none block w-full drop-shadow-[0_30px_30px_rgba(0,0,0,0.6)]"
            />
          );
          const sleeveClass = "block w-full origin-bottom";
          const sleeveStyle = { transform: `scale(${sleeveScale.toFixed(3)})` };
          return (
            <div key={k.slug} className="absolute" style={style}>
              {front ? (
                <a
                  href={k.href}
                  aria-label={k.openLabel}
                  draggable={false}
                  className={sleeveClass}
                  style={sleeveStyle}
                  onClick={(e) => {
                    if (suppressClick.current) {
                      e.preventDefault();
                      suppressClick.current = false;
                    }
                  }}
                >
                  {image}
                </a>
              ) : (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={k.goToLabel}
                  className={`${sleeveClass} cursor-pointer border-0 bg-transparent p-0`}
                  style={sleeveStyle}
                  onClick={() => {
                    if (suppressClick.current) suppressClick.current = false;
                    else go(i);
                  }}
                >
                  {image}
                </button>
              )}
              <p
                aria-hidden="true"
                lang={k.title.lang}
                className={`absolute top-full left-1/2 m-0 mt-2 w-[min(320px,90vw)] -translate-x-1/2 truncate text-center font-mono text-[11px] tracking-widest uppercase ${front ? "text-signal" : "text-muted @max-[900px]/rack:hidden"}`}
                style={{ opacity: Math.max(0, 1 - Math.abs(d) * 0.6) }}
              >
                {front ? "▲ " : ""}
                {k.title.text} · {k.year}
              </p>
            </div>
          );
        })}
      </section>

      <nav aria-label={strings.years} className="relative mx-4 overflow-x-clip sm:mx-10">
        <div
          className="relative flex h-16 cursor-pointer touch-none border-b border-paper/30 select-none"
          onPointerDown={(e) => {
            if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
            scrubbing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubTo(e);
          }}
          onPointerMove={(e) => scrubbing.current && scrubTo(e)}
          onPointerUp={() => {
            scrubbing.current = false;
          }}
          onPointerCancel={() => {
            scrubbing.current = false;
          }}
        >
          {groups.map((g, i) => {
            const on = i === currentYear;
            return (
              <div
                key={g.year}
                className={`relative min-w-0 border-l ${on ? "border-signal" : "border-paper/30"}`}
                style={{ flex: `${g.to - g.from} 1 0px` }}
              >
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  aria-label={strings.yearLabels[g.year]}
                  onClick={() => go(g.first)}
                  className={`block min-h-11 cursor-pointer border-0 bg-transparent pl-[7px] font-condensed text-[15px] tracking-wider whitespace-nowrap hover:text-paper ${on ? "font-extrabold text-signal" : "font-semibold text-muted max-sm:opacity-0 max-sm:focus-visible:opacity-100"}`}
                >
                  {g.year}
                </button>
              </div>
            );
          })}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-px -ml-px h-[26px] w-[3px] bg-signal"
            style={{ left: `${(kitToStrip(groups, position, kits.length) * 100).toFixed(3)}%` }}
          />
        </div>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 px-4 pt-7 sm:px-10 lg:pl-[max(2.5rem,calc(50%-316px))]">
        <section className="max-w-[720px] flex-[1_1_420px]">
          {kit.description && (
            <>
              <p
                lang={kit.description.lang}
                className="m-0 min-h-[7.5em] font-condensed text-xl leading-tight font-medium sm:text-2xl"
              >
                {kit.description.text}
              </p>
              <p className="mt-2.5 font-mono text-[11px] tracking-[0.14em] text-muted">{strings.descriptionBy}</p>
            </>
          )}
        </section>
        <a
          href={kit.href}
          className="inline-flex min-h-11 items-center gap-2.5 border-2 border-paper px-[18px] font-condensed text-base font-extrabold tracking-wider uppercase hover:bg-paper hover:text-ink"
        >
          {strings.open} <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}

function Row({ label, first = false, children }: { label: string; first?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-[7px] ${first ? "" : "border-t border-ink/35"}`}>
      <dt className="flex-none">{label}</dt>
      <dd className="m-0 text-right">{children}</dd>
    </div>
  );
}
