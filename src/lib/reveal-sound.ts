type Cue = 'suspense' | 'reveal'
type Note = readonly [frequency: number, offset: number, duration: number, volume: number]

// Original bell arpeggios; no external audio, samples, or copyrighted recording.
const notes: Record<Cue, readonly Note[]> = {
  suspense: [[523.25, 0, 1, .2], [659.25, .35, 1, .22], [783.99, .7, 1.1, .25], [987.77, 1.1, 1.1, .26], [1174.66, 1.45, 1, .28], [1567.98, 1.85, .9, .22], [2093, 2.15, .65, .14]],
  reveal: [[523.25, 0, 1.5, .28], [659.25, 0, 1.5, .22], [783.99, .04, 1.5, .23], [1046.5, .12, 1.4, .3], [1318.51, .28, 1.3, .25], [1567.98, .44, 1.2, .22], [2093, .6, 1.1, .19], [2349.32, .75, 1, .12], [2093, .88, 1, .14]],
}

/** Created lazily by a user gesture. Sound is optional and cannot block revelation. */
export class RevealSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Set<OscillatorNode>()
  private disposed = false
  private sequence = 0

  prime() {
    if (this.disposed || typeof window.AudioContext !== 'function') return
    try {
      if (!this.context) {
        this.context = new window.AudioContext({ latencyHint: 'interactive' })
        this.master = this.context.createGain()
        this.master.gain.value = .035
        this.master.connect(this.context.destination)
      }
      void this.context.resume().catch(() => {})
    } catch { /* Browsers may refuse audio. The visual flow must still work. */ }
  }

  play(cue: Cue) {
    const context = this.context
    const master = this.master
    if (!context || !master || this.disposed || document.hidden) return
    this.stop()
    const sequence = this.sequence
    void context.resume().then(() => {
      if (sequence !== this.sequence || this.disposed || document.hidden) return
      const start = context.currentTime + .045
      master.gain.cancelScheduledValues(context.currentTime)
      master.gain.setValueAtTime(0, context.currentTime)
      master.gain.linearRampToValueAtTime(.035, start)
      for (const [frequency, offset, duration, volume] of notes[cue]) {
        this.bell(context, master, frequency, start + offset, duration, volume)
        this.bell(context, master, frequency * 2.004, start + offset, duration * .7, volume * .16)
      }
    }).catch(() => {})
  }

  private bell(context: AudioContext, master: GainNode, frequency: number, start: number, duration: number, volume: number) {
    const voice = context.createOscillator()
    const envelope = context.createGain()
    voice.type = 'sine'
    voice.frequency.value = frequency
    envelope.gain.setValueAtTime(.0001, start)
    envelope.gain.exponentialRampToValueAtTime(volume, start + .025)
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration)
    voice.connect(envelope)
    envelope.connect(master)
    this.voices.add(voice)
    voice.onended = () => { voice.disconnect(); envelope.disconnect(); this.voices.delete(voice) }
    voice.start(start)
    voice.stop(start + duration + .03)
  }

  stop() {
    this.sequence++
    const context = this.context
    if (!context || context.state === 'closed') return
    this.master?.gain.cancelScheduledValues(context.currentTime)
    this.master?.gain.setTargetAtTime(0, context.currentTime, .01)
    for (const voice of this.voices) {
      try { voice.stop(context.currentTime + .025) } catch { /* Already ended. */ }
    }
  }

  dispose() {
    this.stop()
    this.disposed = true
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {})
    this.context = null
    this.master = null
  }
}
