/** Stateful conversion: native hardware may choose a different rate/channel count. */
export class Pcm16Converter {
  private phase = 0;
  private sum = 0;
  private count = 0;

  convert(data: ArrayBuffer, sampleRate: number, channels: number): ArrayBuffer {
    if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || ![1, 2].includes(channels) || data.byteLength % (2 * channels)) {
      throw new Error("The microphone returned an unsupported audio format.");
    }
    if (sampleRate === 16000 && channels === 1) return data;
    const input = new DataView(data);
    const frames = data.byteLength / (channels * 2);
    const result = new ArrayBuffer((Math.ceil(frames * 16000 / sampleRate) + 2) * 2);
    const output = new DataView(result);
    let size = 0;
    for (let frame = 0; frame < frames; frame++) {
      let mono = 0;
      for (let channel = 0; channel < channels; channel++) mono += input.getInt16((frame * channels + channel) * 2, true);
      this.sum += mono / channels;
      this.count++;
      this.phase += 16000 / sampleRate;
      if (this.phase + 1e-10 >= 1) {
        const sample = Math.round(this.sum / this.count);
        while (this.phase + 1e-10 >= 1) {
          output.setInt16(size, sample, true);
          size += 2;
          this.phase -= 1;
        }
        this.sum = this.count = 0;
      }
    }
    return result.slice(0, size);
  }
}
