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
    this.fileAudioBuffer.getOrCreate()
    this.fileAudioBufferLoopInstancePool.play(startSeconds, elapsedSeconds, gain, gain)
  }
}
