/* Capture mono 16 kHz PCM without putting an entire recording in page memory. */
class DictationPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.accumulator = 0;
    this.count = 0;
    this.phase = 0;
    this.samples = new Int16Array(1600);
    this.position = 0;
    this.stopped = false;
    this.port.onmessage = (event) => {
      if (event.data?.type === "flush") {
        this.stopped = true;
        this.emit();
        this.port.postMessage({ type: "flushed" });
      }
    };
  }

  emit() {
    if (!this.position) return;
    const bytes = this.samples.buffer.slice(0, this.position * 2);
    this.port.postMessage({ type: "audio", bytes }, [bytes]);
    this.position = 0;
  }

  process(inputs) {
    if (this.stopped) return true;
    const channels = inputs[0];
    if (!channels?.length) return true;
    const length = channels[0].length;
    for (let i = 0; i < length; i++) {
      let mono = 0;
      for (const channel of channels) mono += channel[i] || 0;
      this.accumulator += mono / channels.length;
      this.count++;
      this.phase += 16000 / sampleRate;
      if (this.phase + 1e-10 >= 1) {
        const value = Math.max(-1, Math.min(1, this.accumulator / this.count));
        this.samples[this.position++] = value < 0 ? value * 32768 : value * 32767;
        this.accumulator = 0;
        this.count = 0;
        this.phase -= 1;
        if (this.position === this.samples.length) this.emit();
      }
    }
    return true;
  }
}
registerProcessor("dictation-pcm", DictationPcmProcessor);
