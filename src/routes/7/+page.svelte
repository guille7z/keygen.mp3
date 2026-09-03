<script lang="ts">
  import { songs } from '../../lib/songs'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Volume2, SkipBack, SkipForward, Play, Pause, Cog, Shuffle, Repeat } from '@lucide/svelte'
  import '../../app.css'
  import Visualizer from '$lib/components/Visualizer.svelte'
  import { backOut } from 'svelte/easing'
  import { device } from '$lib/device.svelte'
  import '7.css/dist/7.scoped.css'

  interface ChiptunePlayer {
    onInitialized: (cb: () => void) => void
    onEnded: (cb: () => void) => void
    onMetadata: (cb: (meta: { dur?: number }) => void) => void
    onProgress: (cb: (data: { pos?: number }) => void) => void
    load: (url: string) => void
    stop: () => void
    togglePause: () => void
    setVol: (v: number) => void
    setTempo: (t: number) => void
    setPos: (p: number) => void
    setRepeatCount: (n: number) => void
    gain: GainNode
  }

  let chiptune = $state<ChiptunePlayer | null>(null)
  let initialized = $state(false)
  let showAudioModal = $state(true)
  let isLoaded = $state(false)
  let isPaused = $state(false)
  let isMinimized = $state(false)
  let isDragging = $state(false)
  let activePanel = $state<'settings' | 'audio' | null>(null)
  let playerError = $state<string | null>(null)

  let playMode = $state<'shuffle' | 'loop' | null>(null) // mutually exclusive

  // audio parameter values (0-100)
  const DEFAULT_TEMPO = 50

  let volume = $state(80)
  let tempo = $state(DEFAULT_TEMPO)

  let pos = $state(0)
  let duration = $state(0)
  let selectedSong = $state(songs[0])
  let shuffleOrder = $state<string[]>([...songs])

  let analyser = $state<AnalyserNode | null>(null)

  const slideIn = (from: number) => (node: Element) => ({
    css: (t: number) => {
      const x = (1 - t) * from
      const scale = 0.98 + t * 0.02
      return `transform: translateX(${x}px) scale(${scale}); opacity: ${t};`
    },
    easing: backOut,
    duration: 300,
  })
  const SlideInLeft = slideIn(-20)
  const SlideInRight = slideIn(20)

  function fmt(s: number): string {
    if (!isFinite(s) || s < 0) s = 0
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

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

  function displayFullSongName(path: string): string {
    return basename(path)
  }

  function buildShuffleOrder(): void {
    const rest = songs.filter(s => s !== selectedSong)
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]]
    }
    shuffleOrder = [selectedSong, ...rest]
  }

  function nextSong(): string {
    const list = playMode === 'shuffle' ? shuffleOrder : songs
    const i = list.indexOf(selectedSong)
    return list[(i + 1) % list.length]
  }

  function prevSong(): string {
    const list = playMode === 'shuffle' ? shuffleOrder : songs
    const i = list.indexOf(selectedSong)
    return list[(i - 1 + list.length) % list.length]
  }

  let timeElapsed = $derived(fmt(pos))
  let timeLeft = $derived(duration > 0 ? fmt(duration - pos) : '0:00')
  let lastProgressUpdate = 0 // not reactive - throttle timestamp

  // tempo: 0-100 -> 0.5x to 2.0x (50 = 1.0x)
  function applyVolume(v: number) { chiptune?.setVol(v / 100) }
  function applyTempo(v: number) { chiptune?.setTempo(0.5 + (v / 100) * 1.5) }

  function resetTransientParams(): void {
    tempo = DEFAULT_TEMPO
    applyTempo(DEFAULT_TEMPO)
  }

  async function initPlayer(): Promise<void> {
    if (chiptune) return
    showAudioModal = false

    try {
      const { ChiptuneJsPlayer } = await import('chiptune3')

      const context = new AudioContext()
      const node = context.createAnalyser()
      node.fftSize = 256
      node.connect(context.destination)
      analyser = node

      chiptune = new ChiptuneJsPlayer({ context })

      chiptune.onInitialized(() => {
        initialized = true
        chiptune?.setRepeatCount(0)
        chiptune!.gain.connect(analyser!)
        applyVolume(volume)
        applyTempo(tempo)
      })

      chiptune.onEnded(() => {
        if (playMode === 'loop') {
          load(selectedSong)
          return
        }
        const next = nextSong()
        selectedSong = next
        load(next)
      })

      chiptune.onMetadata((meta) => {
        if (isFinite(meta.dur ?? 0)) duration = meta.dur ?? 0
      })

      chiptune.onProgress((data) => {
        if (isDragging || !isFinite(data.pos ?? 0)) return
        const now = performance.now()
        if (now - lastProgressUpdate < 250) return
        lastProgressUpdate = now
        pos = data.pos!
      })
    } catch (err) {
      console.error('Failed to initialize chiptune player:', err)
      playerError = 'Audio engine failed to load'
      showAudioModal = false
    }
  }

  function load(url: string): void {
    if (!initialized || !chiptune) return
    chiptune.stop()
    pos = 0
    duration = 0
    isPaused = false
    resetTransientParams()
    chiptune.load(url)
    isLoaded = true
  }

  function togglePause(): void {
    chiptune?.togglePause()
    isPaused = !isPaused
  }

  function prev(): void {
    selectedSong = prevSong()
    if (initialized) load(selectedSong)
  }

  function next(): void {
    selectedSong = nextSong()
    if (initialized) load(selectedSong)
  }

  function setPlayMode(mode: 'shuffle' | 'loop'): void {
    playMode = playMode === mode ? null : mode
    if (playMode === 'shuffle') buildShuffleOrder()
  }

  function onFirstInteraction(): void {
    initPlayer()
    ;['keydown', 'click', 'touchstart'].forEach(evt =>
      window.removeEventListener(evt, onFirstInteraction)
    )
  }

  function onKeydown(e: KeyboardEvent): void {
    if (!initialized) return
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return

    if (e.code === 'Space') {
      e.preventDefault()
      isLoaded ? togglePause() : load(selectedSong)
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault()
      prev()
    } else if (e.code === 'ArrowRight') {
      e.preventDefault()
      next()
    }
  }

  onMount(() => {
    ;['click', 'touchstart', 'keydown'].forEach(e =>
      window.addEventListener(e, onFirstInteraction, { once: true })
    )
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  })
</script>

<div class="win7">
<!-- Audio-enable dialog -->
{#if showAudioModal}
  <div class="scrim" onclick={onFirstInteraction} out:fade={{ duration: 250 }}>
    <div
      class="window active is-bright"
      style="max-width: 300px"
      role="dialog"
      aria-labelledby="audio-dialog-title"
    >
      <div class="title-bar">
        <div class="title-bar-text" id="audio-dialog-title">Audio</div>
      </div>
      <div class="window-body has-space" style="text-align: center">
        <div role="progressbar" class="marquee" style="margin-bottom: 10px"></div>
        <p>Click anywhere to enable audio playback.</p>
      </div>
    </div>
  </div>
{/if}

<!-- Error dialog -->
{#if playerError}
  <div class="scrim">
    <div
      class="window active is-bright"
      style="max-width: 280px"
      role="dialog"
      aria-labelledby="error-dialog-title"
    >
      <div class="title-bar">
        <div class="title-bar-text" id="error-dialog-title">Player Error</div>
        <div class="title-bar-controls">
          <button aria-label="Close" onclick={() => (playerError = null)}></button>
        </div>
      </div>
      <div class="window-body has-space">
        <p>{playerError}</p>
      </div>
    </div>
  </div>
{/if}

<main class="stage">
  <!-- Settings window -->
  <div
    class="flex overflow-hidden flex-shrink-0 transition-[width] duration-300 ease-out order-first"
    style:width={activePanel === 'settings' ? '178px' : '0px'}
  >
    {#if activePanel === 'settings'}
      <div class="window w-[164px] flex-shrink-0" in:SlideInRight out:SlideInRight>
        <div class="title-bar">
          <div class="title-bar-text">Settings</div>
        </div>
        <div class="window-body has-space">
          <fieldset style="margin-top: 10px">
            <legend>Playback</legend>
            <div>
              <input
                id="shuffle-check" type="checkbox"
                checked={playMode === 'shuffle'}
                onchange={() => setPlayMode('shuffle')}
                disabled={!initialized}
              />
              <label for="shuffle-check">Shuffle</label>
            </div>
            <div>
              <input
                id="loop-check" type="checkbox"
                checked={playMode === 'loop'}
                onchange={() => setPlayMode('loop')}
                disabled={!initialized}
              />
              <label for="loop-check">Repeat</label>
            </div>
          </fieldset>
        </div>
      </div>
      <div class="w-4 flex-shrink-0"></div>
    {/if}
  </div>

  <!-- MAIN PLAYER WINDOW -->
  <div class="window active glass w-[300px] flex-shrink-0" style:--w7-w-bg={'var(--player-accent, #2f6fed)'}>
    <div class="title-bar" style="background-attachment: local;">
      <div class="title-bar-text">{isLoaded ? displayFullSongName(selectedSong) : 'Chiptune Player'}</div>
    </div>

    {#if !isMinimized}
      <div class="window-body has-space" transition:fade={{ duration: 150 }}>

        <!-- Visualizer -->
        <Visualizer {analyser} isPlaying={isLoaded && !isPaused} />

        <!-- Seek bar -->
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={pos}
          oninput={(e) => {
            isDragging = true
            pos = (e.target as HTMLInputElement).valueAsNumber
          }}
          onpointerup={(e) => {
            isDragging = false
            const v = (e.target as HTMLInputElement).valueAsNumber
            pos = v
            chiptune?.setPos(v)
          }}
          disabled={!initialized || !duration}
          class="w-full"
          style="margin-top: 8px"
        />

        <!-- Transport -->
        <div class="relative flex items-center justify-center gap-1 mt-3">
            {#if device.isComputer}
              <button
                class="transport-btn absolute left-0 {activePanel === 'settings' ? 'default' : ''}"
                onclick={() => (activePanel = activePanel === 'settings' ? null : 'settings')}
                aria-label="Settings"
              >
                <Cog size={15} />
              </button>
            {/if}
          <button class="transport-btn" onclick={prev} disabled={!initialized} aria-label="Previous">
            <SkipBack size={16} fill="currentColor" />
          </button>

          <button
            class="transport-btn default"
            onclick={() => (isLoaded ? togglePause() : load(selectedSong))}
            disabled={!initialized}
            aria-label={isPaused || !isLoaded ? 'Play' : 'Pause'}
          >
            {#if isPaused || !isLoaded}
              <Play size={18} fill="currentColor" />
            {:else}
              <Pause size={18} fill="currentColor" />
            {/if}
          </button>

          <button class="transport-btn" onclick={next} disabled={!initialized} aria-label="Next">
            <SkipForward size={16} fill="currentColor" />
          </button>

          {#if device.isComputer}
          <button
            class="transport-btn absolute right-0 {activePanel === 'audio' ? 'default' : ''}"
            onclick={() => (activePanel = activePanel === 'audio' ? null : 'audio')}
            aria-label="Volume"
          >
            <Volume2 size={15} />
          </button>
          {/if}
        </div>

        <!-- Shuffle / Loop -->
        <div class="flex items-center justify-center gap-2 mt-2">
          <button
            class="transport-btn small {playMode === 'shuffle' ? 'default' : ''}"
            onclick={() => setPlayMode('shuffle')}
            disabled={!initialized}
            aria-label="Shuffle"
            aria-pressed={playMode === 'shuffle'}
          >
            <Shuffle size={12} />
          </button>
          <button
            class="transport-btn small {playMode === 'loop' ? 'default' : ''}"
            onclick={() => setPlayMode('loop')}
            disabled={!initialized}
            aria-label="Repeat"
            aria-pressed={playMode === 'loop'}
          >
            <Repeat size={12} />
          </button>
        </div>

        <hr class="my-3" />

        <select
          bind:value={selectedSong}
          onchange={() => load(selectedSong)}
          disabled={!initialized}
          class="w-full"
        >
          {#each songs as path}
            <option value={path}>{basename(path)}</option>
          {/each}
        </select>
      </div>

      <div class="status-bar">
        <p class="status-bar-field">{timeElapsed}</p>
        <p class="status-bar-field">{playMode ? (playMode === 'shuffle' ? 'Shuffle' : 'Repeat') : 'In order'}</p>
        <p class="status-bar-field">-{timeLeft}</p>
      </div>
    {/if}
  </div>

  <!-- Audio window -->
  <div
    class="flex overflow-hidden flex-shrink-0 transition-[width] duration-300 ease-out"
    style:width={activePanel === 'audio' ? '112px' : '0px'}
  >
    {#if activePanel === 'audio'}
      <div class="w-4 flex-shrink-0"></div>
      <div class="window w-[96px] flex-shrink-0" in:SlideInLeft out:SlideInLeft>
        <div class="title-bar">
          <div class="title-bar-text">Audio</div>
        </div>
        <div class="window-body has-space">
          <div class="flex flex-col items-center gap-2">
            <span class="tabular-nums text-[0.7rem]">{volume}</span>
            <div class="is-vertical h-[130px]">
              <input
                type="range"
                min={0} max={100} step={1}
                value={volume}
                oninput={(e) => {
                  volume = (e.target as HTMLInputElement).valueAsNumber
                  applyVolume(volume)
                }}
                class="has-box-indicator w-[130px]"
              />
            </div>
            <Volume2 size={16} />
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>
</div>

<style>
    .win7 {
      color: #000;
    }

    .stage {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: radial-gradient(ellipse at top, #2a72c9 0%, #0b3d78 45%, #071f3e 100%);
      font-family: 'Segoe UI', Tahoma, sans-serif;
    }

    .scrim {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(6px);
      display: grid;
      place-items: center;
      z-index: 1000;
      cursor: pointer;
    }

    .visualizer {
      width: 100%;
      height: 64px;
      --vis-fill: var(--player-accent, #2f6fed);
      margin-bottom: 4px;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* Engraved-style horizontal rule to match the 7.css groove aesthetic */
    hr {
      border: none;
      border-top: 1px solid rgba(0, 0, 0, 0.35);
      border-bottom: 1px solid rgba(255, 255, 255, 0.5);
      margin: 12px 0;
    }

    /* Compact icon-only transport buttons, built on top of 7.css's button base */
    .transport-btn {
      width: 34px;
      height: 34px;
      min-width: 0;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .transport-btn:before,
    .transport-btn:after {
      border-radius: 50%;
    }

    .transport-btn.default {
      width: 42px;
      height: 42px;
    }

    .transport-btn.small {
      width: 24px;
      height: 24px;
    }

    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }
</style>
