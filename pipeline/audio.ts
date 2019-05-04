import * as fs from "fs"
import * as util from "util"
const emflacDecode: {
  decodeSync(bytes: Uint8Array): Uint8Array
} = require(`emflac/decode`)
const nodeWav: {
  decode(buffer: Buffer): {
    readonly sampleRate: number
    readonly channelData: Float32Array[]
  }
  encode(channelData: ReadonlyArray<Float32Array>, options: {
    readonly sampleRate: number
    readonly float: boolean
    readonly bitDepth: number
  }): Buffer
} = require(`node-wav`)
const lamejs: {
  readonly Mp3Encoder: {
    new(numberOfChannels: number, sampleRate: number, bitRate: number): {
      encodeBuffer(...channelData: Int16Array[]): Int8Array
      flush(): Int8Array
    }
  }
} = require(`lamejs`)
const libVorbisJs: {
  _encoder_create_vbr(numberOfChannels: number, sampleRate: number, bitRate: number): number
  _encoder_get_data_len(instance: number): number
  _encoder_get_data(instance: number): number
  _encoder_clear_data(instance: number): void
  _encoder_write_headers(instance: number): void
  _encoder_prepare_analysis_buffers(instance: number, numberOfSamples: number): void
  _encoder_get_analysis_buffer(instance: number, channelIndex: number): number
  _encoder_encode(instance: number): void
  _encoder_finish(instance: number): void
  _encoder_destroy(instance: number): void
  readonly HEAPU8: {
    subarray(start: number, end: number): number[]
  }
  readonly HEAPF32: {
    set(data: Float32Array, start: number): void
  }
} = require(`libvorbis.js`)
import settings from "./settings"
import * as types from "./types"
import * as utilities from "./utilities"
import * as cacheBusting from "./cache-busting"

const fsReadFile = util.promisify(fs.readFile)

export async function read(
  fromContent: types.ContentReference<string, "wav" | "flac">
): Promise<null | {
  readonly gain: number
  readonly samples: [number[]] | [number[], number[]]
}> {
  const rawFile = await fsReadFile(fromContent.source)
  const asWav = fromContent.extension === `flac`
    ? Buffer.from(emflacDecode.decodeSync(rawFile))
    : rawFile
  const decoded = nodeWav.decode(asWav)
  if (decoded.sampleRate !== 44100) {
    utilities.reportNonFatalError(`File "${fromContent.source}" has a sample rate of ${decoded.sampleRate}Hz rather than the required 44100Hz.`)
    return null
  }

  const channels = decoded.channelData.map(channel => Array.from(channel))

  if (channels.length < 1) {
    utilities.reportNonFatalError(`File "${fromContent.source}" contains no channels.`)
    return null
  }
  if (channels.length > 2) {
    utilities.reportNonFatalError(`File "${fromContent.source}" contains too many channels (more than 2).`)
    return null
  }

  const gain = channels.reduce((previous, channel) => Math.max(previous, channel.reduce((previous, sample) => Math.max(previous, Math.abs(sample)), 0)), 0)
  if (gain) {
    if (gain < 1) {
      channels.forEach(channel => channel.forEach((sample, i) => channel[i] = sample / gain))
    }
  } else {
    utilities.reportNonFatalError(`File "${fromContent.source}" is silent.`)
    return null
  }

  const silenceThreshold = 0.02

  const leadingSilenceSamples = channels.reduce((previous, channel) => Math.min(previous, Math.max(0, channel.findIndex(sample => Math.abs(sample) > silenceThreshold))), Infinity)
  if (leadingSilenceSamples) {
    if (!Number.isFinite(leadingSilenceSamples)) {
      utilities.reportNonFatalError(`File "${fromContent.source}" is silent.`)
      return null
    } else {
      channels.forEach(channel => channel.splice(0, leadingSilenceSamples))
    }
  }

  const trailingSilenceSamples = channels[0].length - channels.reduce((previous, channel) => Math.max(previous, utilities.findLastIndex(channel, sample => Math.abs(sample) > silenceThreshold)), 0)
  if (trailingSilenceSamples) {
    channels.forEach(channel => channel.length -= trailingSilenceSamples)
  }

  if (channels.length === 2) {
    const greatestChannelDifference = channels[0].reduce((previous, sample, index) => Math.max(previous, Math.abs(channels[1][index] - sample)), 0)
    if (greatestChannelDifference < silenceThreshold) {
      channels.length--
    }
  }

  switch (channels.length) {
    case 1:
      return {
        gain,
        samples: [channels[0]]
      }
    case 2:
      return {
        gain,
        samples: [channels[0], channels[1]]
      }
    default:
      throw new Error(`Impossible, but required by Typescript.`)
  }
}

export async function write(
  state: types.State,
  fromChannels: number[][]
): Promise<{
  readonly filename: string
  readonly extensions: ReadonlyArray<string>
}> {
  const fromFloat32 = fromChannels.map(channel => new Float32Array(channel))
  const filename = cacheBusting.generateFilename(Buffer.concat(fromFloat32.map(channel => new Uint8Array(channel.buffer))))
  const extensions: string[] = []
  {
    let buffer: Buffer
    let possibleEncoder: null | number = null
    try {
      possibleEncoder = libVorbisJs._encoder_create_vbr(fromFloat32.length, 44100, 0.5)
      const encoder = possibleEncoder
      const chunks: Buffer[] = []
      function flushVorbis(): void {
        const dataLength = libVorbisJs._encoder_get_data_len(encoder)
        if (!dataLength) return
        const dataPointer = libVorbisJs._encoder_get_data(encoder)
        const chunk = libVorbisJs.HEAPU8.subarray(dataPointer, dataPointer + dataLength)
        const data = new Uint8Array(chunk)
        libVorbisJs._encoder_clear_data(encoder)
        chunks.push(Buffer.from(data))
      }
      libVorbisJs._encoder_write_headers(encoder)
      flushVorbis()
      let readSamples = 0
      while (readSamples < fromFloat32[0].length) {
        const sliceStart = readSamples
        readSamples += 4096 * 10
        readSamples = Math.min(readSamples, fromFloat32[0].length)
        libVorbisJs._encoder_prepare_analysis_buffers(encoder, readSamples - sliceStart)
        fromFloat32.forEach((channel, index) => libVorbisJs.HEAPF32.set(channel.subarray(sliceStart, readSamples), libVorbisJs._encoder_get_analysis_buffer(encoder, index) >> 2))
        libVorbisJs._encoder_encode(encoder)
        flushVorbis()
      }
      libVorbisJs._encoder_finish(encoder)
      flushVorbis()
      buffer = Buffer.concat(chunks)
    }
    finally {
      if (possibleEncoder !== null) {
        libVorbisJs._encoder_destroy(possibleEncoder)
      }
    }

    await write(`ogg`, buffer)
  }

  if (!settings.development) {
    await write(`wav`, nodeWav.encode(fromFloat32, {
      sampleRate: 44100,
      float: false,
      bitDepth: 8
    }))

    {
      const encoder = new lamejs.Mp3Encoder(fromFloat32.length, 44100, 192)
      const converted = fromFloat32.map(channel => new Int16Array(channel.map(sample => sample * 32767)))
      await write(`mp3`, Buffer.concat([Buffer.from(encoder.encodeBuffer.apply(encoder, converted)), Buffer.from(encoder.flush())]))
    }
  }

  return { filename, extensions }

  async function write(
    extension: string,
    contents: Buffer
  ): Promise<void> {
    extensions.push(extension)
    await cacheBusting.request(state, `${filename}.${extension}`, contents)
  }
}
