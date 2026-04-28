<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Volume2, SkipBack, SkipForward, Play, Pause, Clock, Music2 } from '@lucide/svelte'
  import '../app.css'
  import { songs } from '../lib/songs' // Extracted song list

  // Constants
  const FADE_DURATION = 300 // ms — smoother visual transition
  const SLIDER_MIN = 0
  const SLIDER_MAX = 2
  const SLIDER_STEP = 0.001
  const PROGRESS_EPSILON = 0.01 // for floating-point comparison

  // Type defs
  interface ChiptunePlayer {
    onInitialized: (cb: () => void) => void
    onEnded: (cb: () => void) => void
    onMetadata: (cb: (meta: { dur?: number }) => void) => void
    onProgress: (cb: (data: { pos?: number }) => void) => void
    load: (url: string) => void
    stop: () => void
    togglePause: () => void
    setVol: (v: number) => void
    setPitch: (p: number) => void
    setTempo: (t: number) => void
    setPos: (p: number) => void
    setRepeatCount: (n: number) => void
  }

  interface ProgressData {
    pos?: number
  }

  interface Metadata {
    dur?: number
  }

  let { children } = $props()

  // states
  let chiptune = $state<ChiptunePlayer | null>(null)
  let initialized = $state(false)
  let showAudioModal = $state(true)
  let isLoaded = $state(false)
  let isPaused = $state(false)
  let isDragging = $state(false)
  let showSliderPanel = $state(false)
  let playerError = $state<string | null>(null)

  let progress = $state(0)
  let duration = $state(0)
  let volume = $state(1)
  let pitch = $state(1)
  let tempo = $state(1)

  let selectedSong = $state(songs[0])

  // Helpers

  //format seconds into M:SS string
  function fmt(s: number): string {
    if (!isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  //convert slider value (0–2) to percentage string
  
  const toPercentage = (value: number): string => 
    `${Math.round((value / SLIDER_MAX) * 100)}%`

  function basename(path: string): string {
    return path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path
  }

  function displayTitle(path: string): string {
    const parts = basename(path).split(' - ')
    return parts.length > 1 ? parts.slice(1).join(' - ') : parts[0]
  }

  function displayArtist(path: string): string {
    return basename(path).split(' - ')[0]
  }

  // Derived values
  let timeElapsed = $derived(fmt(progress))
  let timeLeft = $derived(duration > 0 ? fmt(duration - progress) : '-0:00')
  let volPct = $derived(toPercentage(volume))
  let pitchPct = $derived(toPercentage(pitch))
  let tempoPct = $derived(toPercentage(tempo))

  // Core
  function resetStuff(): void {
    progress = 0
    duration = 0
    pitch = 1
    tempo = 1
    isPaused = false
    playerError = null
    
    chiptune?.setPitch(1)
    chiptune?.setTempo(1)
  }

  async function initPlayer(): Promise<void> {
    if (chiptune) return
    showAudioModal = false

    try {
      const chip = await import('https://drsnuggles.github.io/chiptune/chiptune3.min.js')
      chiptune = new chip.ChiptuneJsPlayer()

      chiptune.onInitialized(() => { 
        initialized = true
        chiptune?.setRepeatCount(0)
      })
      chiptune.onEnded(() => { 
        chiptune?.stop()
        isPaused = false 
      })
      chiptune.onMetadata((meta: Metadata) => { 
        if (isFinite(meta.dur ?? 0)) duration = meta.dur ?? 0 
      })
      
      chiptune.onProgress((data: ProgressData) => {
        if (!isDragging && isFinite(data.pos ?? 0)) {
          progress = data.pos ?? 0
          
          // Use epsilon comparison for floating-point safety
          if (duration > 0 && progress >= duration - PROGRESS_EPSILON) {
            next()
          }
        }
      })
    } catch (err) {
      console.error('Failed to initialize chiptune player:', err)
      playerError = 'Audio engine failed to load'
      showAudioModal = true
    }
  }

  function load(url: string): void {
    resetStuff()
    chiptune?.load(url)
    isLoaded = true
  }

  function togglePause(): void {
    chiptune?.togglePause()
    isPaused = !isPaused
  }

  function prev(): void {
    const i = songs.indexOf(selectedSong)
    selectedSong = songs[(i - 1 + songs.length) % songs.length]
    if (initialized) load(selectedSong)
  }

  function next(): void {
    const i = songs.indexOf(selectedSong)
    selectedSong = songs[(i + 1) % songs.length]
    if (initialized) load(selectedSong)
  }

  // Event Handlers
  function onSeek(e: Event): void { //seek name comes from the original chiptune js demo idek why its called that
    isDragging = true
    const target = e.target as HTMLInputElement
    const val = target?.valueAsNumber ?? 0
    progress = val
    chiptune?.setPos(val)
  }

  function onSeekEnd(): void {
    isDragging = false
  }

  function onVolume(e: Event): void {
    const target = e.target as HTMLInputElement
    volume = target?.valueAsNumber ?? 1
    chiptune?.setVol(volume)
  }

  function onPitch(e: Event): void {
    const target = e.target as HTMLInputElement
    pitch = target?.valueAsNumber ?? 1
    chiptune?.setPitch(pitch)
  }

  function onTempo(e: Event): void {
    const target = e.target as HTMLInputElement
    tempo = target?.valueAsNumber ?? 1
    chiptune?.setTempo(tempo)
  }

  function onSongSelect(e: Event): void {
    const target = e.target as HTMLSelectElement
    selectedSong = target?.value ?? songs[0]
    if (initialized) load(selectedSong)
  }

  function onFirstInteraction(): void {
    initPlayer()
    ;['keydown', 'click', 'touchstart'].forEach(evt => 
      window.removeEventListener(evt, onFirstInteraction)
    )
  }
</script>

{#if playerError}
  <div class="error-banner">{playerError}</div>
{/if}

{#if showAudioModal} <!-- i had to make the modal pretty because i couldnt get fucking rid of it ffs -->
  <div 
    class="audio-modal" 
    onclick={onFirstInteraction}
    out:fade={{ duration: FADE_DURATION }}
  >
    <div class="audio-modal-inner">
      <Volume2 size={36} color="rgba(255,255,255,0.45)" />
      <p>Click anywhere to enable audio</p>
    </div>
  </div>
{/if}

<main class="player-shell">
  <div class="player-stage">
    <div class="player-card" class:panel-open={showSliderPanel}>

      <div class="song-info">
        <h3 class="song-title">{isLoaded ? displayTitle(selectedSong) : 'untitled'}</h3>
        <p class="song-artist">{isLoaded ? displayArtist(selectedSong) : 'anonymous'}</p>
      </div>

      <div class="seek-wrap">
        <input
          type="range"
          min={SLIDER_MIN}
          max={duration || 1}
          step={SLIDER_STEP}
          value={progress}
          oninput={onSeek}
          onpointerup={onSeekEnd}
          ontouchend={onSeekEnd}
          disabled={!initialized || !duration}
          class="seek-slider"
        />
        <div class="seek-times">
          <span>{timeElapsed}</span>
          <span>{timeLeft}</span>
        </div>
      </div>

      <div class="controls-row">
        <div class="transport">
          <button class="icon-btn clickeroonie" onclick={prev} disabled={!initialized}>
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            class="play-btn clickeroonie"
            onclick={() => isLoaded ? togglePause() : load(selectedSong)}
            disabled={!initialized}
          >
            {#if isPaused || !isLoaded}
              <Play size={20} fill="currentColor" />
            {:else}
              <Pause size={20} fill="currentColor" />
            {/if}
          </button>
          <button class="icon-btn clickeroonie" onclick={next} disabled={!initialized}>
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
        
        <button
          class="icon-btn vol-toggle clickeroonie"
          class:active={showSliderPanel}
          onclick={() => showSliderPanel = !showSliderPanel}
        >
          <Volume2 size={18} />
        </button>
      </div>

      <div class="song-select-wrap">
        <select value={selectedSong} onchange={onSongSelect} disabled={!initialized} class="song-select">
          {#each songs as path}
            <option value={path}>{basename(path)}</option>
          {/each}
        </select>
      </div>

    </div>

    <div class="slider-panel" class:visible={showSliderPanel}>
      <div class="sliders-inner">
        <div class="vslider-col">
          <span class="vslider-pct">{volPct}</span>
          <input type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={SLIDER_STEP}
            value={volume} oninput={onVolume}
            disabled={!initialized} class="vslider" />
          <span class="vslider-icon"><Volume2 size={14} color="#6dd589" /></span>
          <span class="vslider-label">Vol</span>
        </div>

        <div class="vslider-col">
          <span class="vslider-pct">{pitchPct}</span>
          <input type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={SLIDER_STEP}
            value={pitch} oninput={onPitch}
            disabled={!initialized} class="vslider" />
          <span class="vslider-icon"><Music2 size={14} color="#6dd589" /></span>
          <span class="vslider-label">Pitch</span>
        </div>

        <div class="vslider-col">
          <span class="vslider-pct">{tempoPct}</span>
          <input type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={SLIDER_STEP}
            value={tempo} oninput={onTempo}
            disabled={!initialized} class="vslider" />
          <span class="vslider-icon"><Clock size={14} color="#6dd589" /></span>
          <span class="vslider-label">Tempo</span>
        </div>
      </div>
    </div>
  </div>
</main>

{children}