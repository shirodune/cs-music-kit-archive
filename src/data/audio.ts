// Where the audio files are served (spec: PROD-26, DATA-20).

export const AUDIO_ORIGIN = "https://audio.musickitarchive.com";

/** URL of a published track file. */
export const audioSrc = (audio: { path: string }) => `${AUDIO_ORIGIN}${audio.path}`;
