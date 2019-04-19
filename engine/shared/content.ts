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

class Song {
  private readonly fileAudioBuffer: FileAudioBuffer
  private readonly fileAudioBufferLoopInstancePool: FileAudioBufferLoopInstancePool

  constructor(
    id: number,
    leftGain: number,
    rightGain: number
  ) {
    this.fileAudioBuffer = new FileAudioBuffer(`song-${id}`)
    this.fileAudioBufferLoopInstancePool = new FileAudioBufferLoopInstancePool(
      this.fileAudioBuffer,
      leftGain,
      rightGain
    )
  }

  play(
    startSeconds: number,
    elapsedSeconds: number,
    gain: number
  ): void {
    this.fileAudioBuffer.get()
    this.fileAudioBufferLoopInstancePool.play(startSeconds, elapsedSeconds, gain, gain)
  }
}
