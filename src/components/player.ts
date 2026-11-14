// The record page's audio player (spec: PROD-24, PROD-25a). One <audio> for the page, so only one track plays.
// Markup comes from the record page: each playable row is [data-track] with a [data-play] toggle button, a
// [data-time] duration and a hidden [data-progress] slider; the MVP button is [data-play-mvp]; the status line
// is [data-status]. Playback starts only from a click (PROD-24). Leaving the page stops it (D-020).

import { formatDuration } from "../i18n/format.ts";

const status = document.querySelector<HTMLElement>("[data-status]");
const mvpButton = document.querySelector<HTMLButtonElement>("[data-play-mvp]");
const audio = new Audio();
audio.preload = "none";

let current: HTMLElement | null = null;
let seeking = false;

const parts = (row: HTMLElement) => ({
  button: row.querySelector<HTMLButtonElement>("[data-play]"),
  time: row.querySelector<HTMLElement>("[data-time]"),
  progress: row.querySelector<HTMLElement>("[data-progress]"),
  slider: row.querySelector<HTMLInputElement>("[data-progress] input"),
});

const fill = (template: string | undefined, track: string) => (template ?? "").replace("{track}", track);

function setStatus(text: string, error = false): void {
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("text-signal", error);
}

/** Elapsed and total time while a row is current, its duration otherwise. */
function showTime(row: HTMLElement): void {
  const { time, slider } = parts(row);
  const total = Number.isFinite(audio.duration) ? audio.duration : Number(row.dataset.duration);
  const text = `${formatDuration(audio.currentTime)} / ${formatDuration(total)}`;
  if (time) time.textContent = text;
  if (slider && !seeking) {
    slider.max = String(total);
    slider.value = String(audio.currentTime);
    slider.setAttribute("aria-valuetext", text);
  }
}

/** Reflects whether the current row is playing, from the audio element's own events. */
function render(): void {
  const playing = current !== null && !audio.paused;
  if (current) parts(current).button?.setAttribute("aria-pressed", String(playing));
  current?.toggleAttribute("data-playing", playing);
  // The hero's drawn disc slides out and turns while a track plays (global.css, .record).
  document.querySelector("[data-player]")?.toggleAttribute("data-playing", playing);
  mvpButton?.setAttribute("aria-pressed", String(playing && current?.dataset.mvp !== undefined));
  if (current) setStatus(fill(playing ? status?.dataset.now : status?.dataset.paused, current.dataset.name ?? ""));
}

/** Puts a row back to its resting state: no progress, its own duration. */
function release(row: HTMLElement): void {
  const { button, time, progress } = parts(row);
  button?.setAttribute("aria-pressed", "false");
  row.removeAttribute("data-playing");
  if (time) time.textContent = formatDuration(Number(row.dataset.duration));
  if (progress) progress.hidden = true;
}

function toggle(row: HTMLElement): void {
  if (row === current) {
    if (audio.paused) void start();
    else audio.pause();
    return;
  }
  if (current) release(current);
  current = row;
  audio.src = row.dataset.src ?? "";
  const { progress } = parts(row);
  if (progress) progress.hidden = false;
  showTime(row);
  setMediaSession(row);
  void start();
}

async function start(): Promise<void> {
  try {
    await audio.play();
  } catch (error) {
    // A newer click replaced this one; anything else means the file could not play.
    if (!(error instanceof DOMException && error.name === "AbortError")) fail();
  }
}

function fail(): void {
  if (current) release(current);
  current = null;
  document.querySelector("[data-player]")?.removeAttribute("data-playing");
  mvpButton?.setAttribute("aria-pressed", "false");
  setStatus(status?.dataset.error ?? "", true);
}

/** Lock screen and media keys show the track and can pause or seek it. */
function setMediaSession(row: HTMLElement): void {
  if (!("mediaSession" in navigator)) return;
  const page = document.querySelector<HTMLElement>("[data-player]")?.dataset;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: row.dataset.name ?? "",
    artist: page?.artist ?? "",
    album: page?.album ?? "",
    artwork: page?.cover ? [{ src: new URL(page.cover, location.href).href }] : [],
  });
}

if ("mediaSession" in navigator) {
  // After a track ends nothing is current, though the audio element keeps its file; a play key then does nothing.
  navigator.mediaSession.setActionHandler("play", () => {
    if (current) void start();
  });
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime !== undefined) audio.currentTime = details.seekTime;
  });
}

audio.addEventListener("play", render);
audio.addEventListener("pause", render);
audio.addEventListener("timeupdate", () => current && showTime(current));
audio.addEventListener("loadedmetadata", () => current && showTime(current));
audio.addEventListener("ended", () => {
  if (current) release(current);
  current = null;
  mvpButton?.setAttribute("aria-pressed", "false");
  setStatus("");
});
audio.addEventListener("error", () => {
  if (audio.getAttribute("src")) fail();
});

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest("[data-play], [data-play-mvp]");
  if (!button) return;
  const row = button.hasAttribute("data-play-mvp")
    ? document.querySelector<HTMLElement>("[data-track][data-mvp]")
    : button.closest<HTMLElement>("[data-track]");
  if (row) toggle(row);
});

// Seeking: the slider follows playback, except while the visitor drags it.
document.addEventListener("input", (event) => {
  const slider = event.target instanceof HTMLInputElement ? event.target : null;
  if (!slider?.closest("[data-progress]") || !current?.contains(slider)) return;
  seeking = true;
  audio.currentTime = Number(slider.value);
  showTime(current);
});
document.addEventListener("change", () => {
  seeking = false;
});
