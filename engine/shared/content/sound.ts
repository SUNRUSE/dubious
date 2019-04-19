const atlasSound = new FileAudioBuffer(`atlas`)

class Sound {
  private readonly fileAudioBufferPlayInstancePool: FileAudioBufferPlayInstancePool

  constructor(
    startSamples: number,
    durationSamples: number,
    leftGain: number,
    rightGain: number
  ) {
    this.fileAudioBufferPlayInstancePool = new FileAudioBufferPlayInstancePool(
      atlasSound,
      leftGain,
      rightGain,
      startSamples / 44100,
      durationSamples / 44100
    )
  }

  play(
    startSeconds: number,
    elapsedSeconds: number,
    leftGain: number,
    rightGain: number
  ): void {
    this.fileAudioBufferPlayInstancePool.play(
      startSeconds,
      elapsedSeconds,
      leftGain,
      rightGain
    )
  }
}
