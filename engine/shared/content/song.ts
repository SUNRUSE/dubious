class Song {
  private readonly fileAudioBuffer: FileAudioBuffer
  private readonly fileAudioBufferLoopInstancePool: FileAudioBufferLoopInstancePool

  constructor(
    filename: string,
    leftGain: number,
    rightGain: number
  ) {
    this.fileAudioBuffer = new FileAudioBuffer(filename)
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
