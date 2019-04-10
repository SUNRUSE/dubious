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

let audioContext: null | AudioContext = null
let channelMerger: ChannelMergerNode

function initializeWebAudioApi(): void {
  if (audioFormat === null) {
    return
  }

  let absoluteAudioContext: AudioContext
  if (`AudioContext` in window) {
    absoluteAudioContext = new AudioContext()
  } else if (`webkitAudioContext` in window) {
    absoluteAudioContext = new (window as any).webkitAudioContext()
  } else {
    return
  }

  audioContext = absoluteAudioContext
  channelMerger = absoluteAudioContext.createChannelMerger(2)
  channelMerger.connect(absoluteAudioContext.destination)
}

type FileAudioBufferInstanceContents = {
  leftGain: number
  readonly leftGainNode: GainNode
  rightGain: number
  readonly rightGainNode: GainNode
}

class FileAudioBufferInstance extends FrameCache<FileAudioBufferInstanceContents> {
  constructor(
    private readonly fileAudioBufferInstancePool: FileAudioBufferInstancePool,
    private readonly audioBuffer: AudioBuffer,
    readonly startSeconds: number,
    private readonly skipSeconds: number
  ) {
    super()
  }

  create(): FileAudioBufferInstanceContents {
    if (audioContext === null) {
      throw new Error(`The Web Audio API context was expected to be available, but was not.`)
    }

    const source = audioContext.createBufferSource()
    source.buffer = this.audioBuffer
    const channelSplitter = audioContext.createChannelSplitter(2)
    const leftGainNode = audioContext.createGain()
    leftGainNode.gain.value = 0
    const rightGainNode = audioContext.createGain()
    rightGainNode.gain.value = 0

    source.connect(channelSplitter)
    channelSplitter.connect(leftGainNode, 0, 0)
    channelSplitter.connect(rightGainNode, 1, 0)
    leftGainNode.connect(channelMerger, 0, 0)
    rightGainNode.connect(channelMerger, 0, 1)

    source.start(
      this.startSeconds + this.skipSeconds,
      this.fileAudioBufferInstancePool.startSeconds + this.skipSeconds,
      this.fileAudioBufferInstancePool.durationSeconds - this.skipSeconds
    )
    return {
      leftGain: 0,
      leftGainNode,
      rightGain: 0,
      rightGainNode
    }
  }

  update(cached: FileAudioBufferInstanceContents): void {
    cached.leftGainNode.gain.value = cached.leftGain * this.fileAudioBufferInstancePool.leftGain
    cached.rightGainNode.gain.value = cached.rightGain * this.fileAudioBufferInstancePool.rightGain
    cached.leftGain = 0
    cached.rightGain = 0
  }

  dispose(cached: FileAudioBufferInstanceContents): void {
    cached.leftGainNode.disconnect()
    cached.rightGainNode.disconnect()

    this.fileAudioBufferInstancePool.instances.splice(this.fileAudioBufferInstancePool.instances.indexOf(this), 1)
  }
}

class FileAudioBufferInstancePool {
  readonly instances: FileAudioBufferInstance[] = []

  constructor(
    private readonly fileAudioBuffer: FileAudioBuffer,
    readonly leftGain: number,
    readonly rightGain: number,
    readonly startSeconds: number,
    readonly durationSeconds: number
  ) { }

  play(
    startSeconds: number,
    elapsedSeconds: number,
    leftGain: number,
    rightGain: number
  ): void {
    if (!audioContext) {
      return
    }

    const now = audioContext.currentTime + 0.01
    startSeconds = now + startSeconds - elapsedSeconds
    for (const instance of this.instances) {
      if (Math.abs(instance.startSeconds - startSeconds) < 0.05) {
        const instanceContent = instance.get()
        instanceContent.leftGain += leftGain
        instanceContent.rightGain += rightGain
        return
      }
    }

    const skipSeconds = Math.max(0, now - startSeconds)
    if (skipSeconds >= this.durationSeconds) {
      return
    }

    const audioBuffer = this.fileAudioBuffer.get()
    if (audioBuffer === null) {
      return
    }

    this.instances.push(new FileAudioBufferInstance(
      this,
      audioBuffer,
      startSeconds,
      skipSeconds
    ))
  }
}

class FileAudioBuffer {
  private audioContext: null | AudioContext = null
  private request: null | XMLHttpRequest = null
  private audioBuffer: null | AudioBuffer = null

  constructor(
    private readonly path: string
  ) { }

  unload(): void {
    if (this.request !== null) {
      this.request.abort()
      this.request = null
    }
    this.audioBuffer = null
  }

  get(): null | AudioBuffer {
    if (this.audioContext !== audioContext) {
      this.unload()
      this.audioContext = audioContext
    }
    if (this.request === null && this.audioContext !== null && audioFormat !== null) {
      const request = this.request = new XMLHttpRequest()
      request.open(`GET`, `${this.path}.${audioFormat}`)
      request.responseType = `arraybuffer`
      request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status >= 200 && request.status <= 299) {
          if (audioContext === null) {
            throw new Error(`The Web Audio API context was expected to be available, but was not.`)
          }

          audioContext.decodeAudioData(request.response, audioBuffer => {
            if (this.request === request) {
              this.audioBuffer = audioBuffer
              this.request = null
            }
          })
        }
      }
      request.send()
    }
    return this.audioBuffer
  }
}
