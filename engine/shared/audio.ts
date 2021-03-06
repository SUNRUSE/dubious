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

  previousTime = null
}

function connectToChannelMerger(
  audioBuffer: AudioBuffer,
  audioBufferSourceNode: AudioBufferSourceNode
): FileAudioBufferInstanceContents {
  if (audioContext === null) {
    throw new Error(`The Web Audio API context was expected to be available, but was not.`)
  }

  const leftGainNode = audioContext.createGain()
  leftGainNode.gain.value = 0
  const rightGainNode = audioContext.createGain()
  rightGainNode.gain.value = 0

  if (audioBuffer.numberOfChannels === 2) {
    const channelSplitter = audioContext.createChannelSplitter(2)
    audioBufferSourceNode.connect(channelSplitter)
    channelSplitter.connect(leftGainNode, 0, 0)
    channelSplitter.connect(rightGainNode, 1, 0)
  } else {
    audioBufferSourceNode.connect(leftGainNode)
    audioBufferSourceNode.connect(rightGainNode)
  }

  leftGainNode.connect(channelMerger, 0, 0)
  rightGainNode.connect(channelMerger, 0, 1)

  return {
    leftGain: 0,
    leftGainNode,
    rightGain: 0,
    rightGainNode
  }
}

type FileAudioBufferInstanceContents = {
  leftGain: number
  readonly leftGainNode: GainNode
  rightGain: number
  readonly rightGainNode: GainNode
}

class FileAudioBufferPlayInstance extends FrameCache<FileAudioBufferInstanceContents> {
  constructor(
    private readonly fileAudioBufferPlayInstancePool: FileAudioBufferPlayInstancePool,
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

    const audioBufferSourceNode = audioContext.createBufferSource()
    audioBufferSourceNode.buffer = this.audioBuffer

    const output = connectToChannelMerger(this.audioBuffer, audioBufferSourceNode)

    audioBufferSourceNode.start(
      this.startSeconds + this.skipSeconds,
      this.fileAudioBufferPlayInstancePool.startSeconds + this.skipSeconds,
      this.fileAudioBufferPlayInstancePool.durationSeconds - this.skipSeconds
    )

    return output
  }

  update(cached: FileAudioBufferInstanceContents): void {
    cached.leftGainNode.gain.value = cached.leftGain * this.fileAudioBufferPlayInstancePool.leftGain
    cached.rightGainNode.gain.value = cached.rightGain * this.fileAudioBufferPlayInstancePool.rightGain
    cached.leftGain = 0
    cached.rightGain = 0
  }

  dispose(cached: FileAudioBufferInstanceContents): void {
    cached.leftGainNode.disconnect()
    cached.rightGainNode.disconnect()

    this.fileAudioBufferPlayInstancePool.instances.splice(this.fileAudioBufferPlayInstancePool.instances.indexOf(this), 1)
  }
}

class FileAudioBufferPlayInstancePool {
  readonly instances: FileAudioBufferPlayInstance[] = []

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
    const audioBuffer = this.fileAudioBuffer.getOrCreate().audioBuffer
    if (audioBuffer === null) {
      return
    }

    if (audioContext === null) {
      throw new Error(`The Web Audio API context was expected to be available, but was not.`)
    }

    if (leftGain === 0 && rightGain === 0) {
      return
    }

    if (startSeconds > elapsedSeconds) {
      return
    }

    if (elapsedSeconds > startSeconds + this.durationSeconds) {
      return
    }

    const now = audioContext.currentTime
    startSeconds = now + startSeconds - elapsedSeconds
    for (const instance of this.instances) {
      if (Math.abs(instance.startSeconds - startSeconds) < 0.05) {
        const instanceContent = instance.getOrCreate()
        instanceContent.leftGain += leftGain
        instanceContent.rightGain += rightGain
        return
      }
    }

    const skipSeconds = Math.max(0, now - startSeconds)

    const instance = new FileAudioBufferPlayInstance(
      this,
      audioBuffer,
      startSeconds,
      skipSeconds
    )
    this.instances.push(instance)
    const instanceContent = instance.getOrCreate()
    instanceContent.leftGain += leftGain
    instanceContent.rightGain += rightGain
  }
}

class FileAudioBufferLoopInstance extends FrameCache<FileAudioBufferInstanceContents> {
  constructor(
    private readonly fileAudioBufferLoopInstancePool: FileAudioBufferLoopInstancePool,
    private readonly audioBuffer: AudioBuffer,
    readonly startSeconds: number,
    readonly loopProgressSeconds: number
  ) {
    super()
  }

  create(): FileAudioBufferInstanceContents {
    if (audioContext === null) {
      throw new Error(`The Web Audio API context was expected to be available, but was not.`)
    }

    const audioBufferSourceNode = audioContext.createBufferSource()
    audioBufferSourceNode.loop = true
    audioBufferSourceNode.buffer = this.audioBuffer

    const output = connectToChannelMerger(this.audioBuffer, audioBufferSourceNode)

    audioBufferSourceNode.start(this.startSeconds, this.loopProgressSeconds)

    return output
  }

  update(cached: FileAudioBufferInstanceContents): void {
    cached.leftGainNode.gain.value = cached.leftGain * this.fileAudioBufferLoopInstancePool.leftGain
    cached.rightGainNode.gain.value = cached.rightGain * this.fileAudioBufferLoopInstancePool.rightGain
    cached.leftGain = 0
    cached.rightGain = 0
  }

  dispose(cached: FileAudioBufferInstanceContents): void {
    cached.leftGainNode.disconnect()
    cached.rightGainNode.disconnect()

    this.fileAudioBufferLoopInstancePool.instances.splice(this.fileAudioBufferLoopInstancePool.instances.indexOf(this), 1)
  }
}

class FileAudioBufferLoopInstancePool {
  readonly instances: FileAudioBufferLoopInstance[] = []

  constructor(
    private readonly fileAudioBuffer: FileAudioBuffer,
    readonly leftGain: number,
    readonly rightGain: number
  ) { }

  play(
    startSeconds: number,
    elapsedSeconds: number,
    leftGain: number,
    rightGain: number
  ): void {
    const audioBuffer = this.fileAudioBuffer.getOrCreate().audioBuffer
    if (audioBuffer === null) {
      return
    }

    if (audioContext === null) {
      throw new Error(`The Web Audio API context was expected to be available, but was not.`)
    }

    if (leftGain === 0 && rightGain === 0) {
      return
    }

    if (startSeconds > elapsedSeconds) {
      return
    }

    const now = audioContext.currentTime

    const ourPlayingForSeconds = elapsedSeconds - startSeconds
    const ourLoopProgressSeconds = ourPlayingForSeconds - Math.floor(ourPlayingForSeconds / audioBuffer.duration) * audioBuffer.duration

    for (const instance of this.instances) {
      const theirPlayingForSeconds = instance.loopProgressSeconds + now - instance.startSeconds
      const theirLoopProgressSeconds = theirPlayingForSeconds - Math.floor(theirPlayingForSeconds / audioBuffer.duration) * audioBuffer.duration
      const loopProgressSecondsDifference = Math.abs(theirLoopProgressSeconds - ourLoopProgressSeconds)
      const inverseLoopProgressSecondsDifference = Math.abs(loopProgressSecondsDifference - audioBuffer.duration)
      if (loopProgressSecondsDifference < 0.05 || inverseLoopProgressSecondsDifference < 0.05) {
        const instanceContent = instance.getOrCreate()
        instanceContent.leftGain += leftGain
        instanceContent.rightGain += rightGain
        return
      }
    }

    const instance = new FileAudioBufferLoopInstance(
      this,
      audioBuffer,
      now,
      ourLoopProgressSeconds
    )
    this.instances.push(instance)
    const instanceContent = instance.getOrCreate()
    instanceContent.leftGain += leftGain
    instanceContent.rightGain += rightGain
  }
}

type CachedFileAudioBuffer = {
  request: null | XMLHttpRequest
  response: null | ArrayBuffer
  decoding: boolean
  audioBuffer: null | AudioBuffer
}

class FileAudioBuffer extends FrameCache<CachedFileAudioBuffer> {
  constructor(
    private readonly path: string
  ) {
    super()
  }

  private createRequest(cached: CachedFileAudioBuffer): void {
    if (audioFormat === null) {
      return
    }

    const request = cached.request = new XMLHttpRequest()
    request.open(`GET`, `${this.path}.${audioFormat}`)
    request.responseType = `arraybuffer`
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status >= 200 && request.status <= 299) {
        cached.request = null

        if (audioContext === null) {
          cached.response = request.response
        } else {
          cached.decoding = true
          audioContext.decodeAudioData(request.response, audioBuffer => {
            cached.decoding = false
            cached.audioBuffer = audioBuffer
          })
        }
      }
    }
    request.send()
  }

  create(): CachedFileAudioBuffer {
    const output: CachedFileAudioBuffer = {
      request: null,
      response: null,
      decoding: false,
      audioBuffer: null
    }
    this.createRequest(output)
    return output
  }

  update(cached: CachedFileAudioBuffer): void {
    if (cached.audioBuffer === null && !cached.decoding) {
      if (cached.response === null && cached.request === null) {
        this.createRequest(cached)
      } else if (cached.response !== null && audioContext !== null) {
        cached.decoding = true
        audioContext.decodeAudioData(cached.response, audioBuffer => {
          cached.decoding = false
          cached.audioBuffer = audioBuffer
        })
        cached.response = null
      }
    }
  }

  dispose(cached: CachedFileAudioBuffer): void {
    if (cached.request !== null) {
      cached.request.abort()
    }
  }
}
