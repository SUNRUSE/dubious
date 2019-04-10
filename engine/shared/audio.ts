type AudioFormat = `ogg` | `mp3` | `wav`
let audioFormat: null | AudioFormat = null

if (`Audio` in window) {
  const extensionProbe = new Audio()

  type AudioFormatCompatabilityLevel =
    | `probably`
    | `maybe`

  function tryAudioFormat(
    format: AudioFormat,
    mimeType: string,
    compatabilityLevel: AudioFormatCompatabilityLevel
  ): void {
    if (audioFormat !== null) {
      return
    }

    if (extensionProbe.canPlayType(mimeType) !== compatabilityLevel) {
      return
    }

    audioFormat = format
  }

  const compatabilityLevels: ReadonlyArray<AudioFormatCompatabilityLevel> = [`probably`, `maybe`]
  for (const compatabilityLevel of compatabilityLevels) {
    tryAudioFormat(`ogg`, `audio/ogg; codecs="vorbis"`, compatabilityLevel)
    if (!development) {
      tryAudioFormat(`mp3`, `audio/mp3`, compatabilityLevel)
      tryAudioFormat(`wav`, `audio/wav; codecs="1"`, compatabilityLevel)
    }
  }
}
