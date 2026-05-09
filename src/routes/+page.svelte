<script lang="ts">
  import { songs } from '../lib/songs'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Volume2, SkipBack, SkipForward, Play, Pause, ChevronDown, Cog, Shuffle, Repeat } from '@lucide/svelte'
  import { Separator } from "$lib/components/ui/separator/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import { Slider } from "$lib/components/ui/slider/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import '../app.css'
  import Visualizer from '$lib/components/Visualizer.svelte'
  import { backInOut, backOut } from "svelte/easing";
  
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
    gain: GainNode
  }

  let chiptune = $state<ChiptunePlayer | null>(null)
  let initialized = $state(false)
  let showAudioModal = $state(true)
  let isLoaded = $state(false)
  let isPaused = $state(false)
  let isDragging = $state(false)
  let activePanel = $state<'settings' | 'audio' | null>(null)
  let playerError = $state<string | null>(null)

  let playMode = $state<'shuffle' | 'loop' | null>(null) // mutually exclusive

  // audio parameter values (0-100)
  const DEFAULT_PITCH = 50 // die
  const DEFAULT_TEMPO = 50

  let volume = $state(80)
  let pitch = $state(DEFAULT_PITCH) // die
  let tempo = $state(DEFAULT_TEMPO)

  let pos = $state(0)
  let duration = $state(0)
  let selectedSong = $state(songs[0])
  let shuffleOrder = $state<string[]>([...songs])

  let analyser = $state<AnalyserNode | null>(null)

  const SlideInLeft = () => ({
    css: (t: number) => {
      const x = (1 - t) * -20;
      const scale = 0.98 + t * 0.02;
      return `transform: translateX(${x}px) scale(${scale}); opacity: ${t};`;
    },
    easing: backOut,
    duration: 300,
  });

  const SlideInRight = () => ({
    css: (t: number) => {
      const x = (1 - t) * 20;
      const scale = 0.98 + t * 0.02;
      return `transform: translateX(${x}px) scale(${scale}); opacity: ${t};`;
    },
    easing: backOut,
    duration: 300,
  });

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

  function buildShuffleOrder(): void { // claude assisted with the whole shuffling thing so yeah. i dont disagree with building a new order (you will eat ze bugs) for the song list so i keep it
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

  // pitch: 0–100 → -12 to +12 semitones (50 = no shift)
  // tempo: 0–100 → 0.5× to 2.0× (50 = 1.0×)
  function applyVolume(v: number) { chiptune?.setVol(v / 100) }
  function applyPitch(v: number) { chiptune?.setPitch(Math.round((v - 50) / 50 * 12)) }
  function applyTempo(v: number) { chiptune?.setTempo(0.5 + (v / 100) * 1.5) }

  function resetTransientParams(): void {
    pitch = DEFAULT_PITCH
    tempo = DEFAULT_TEMPO
    applyPitch(DEFAULT_PITCH)
    applyTempo(DEFAULT_TEMPO)
  }

  async function initPlayer(): Promise<void> {
    if (chiptune) return
    showAudioModal = false

    try {
      const chip = await import('https://drsnuggles.github.io/chiptune/chiptune3.min.js')

      const context = new AudioContext()
      const node = context.createAnalyser()
      node.fftSize = 256
      node.connect(context.destination)
      analyser = node

      chiptune = new chip.ChiptuneJsPlayer({ context })

      chiptune.onInitialized(() => {
        initialized = true
        chiptune?.setRepeatCount(0)
        chiptune!.gain.connect(analyser!)
        applyVolume(volume)
        applyPitch(pitch)
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

<!-- Audio modal -->
{#if showAudioModal}
  <div class="audio-modal" onclick={onFirstInteraction} out:fade={{ duration: 300 }}>
    <div class="audio-modal-inner">
      <Volume2 size={36} color="rgba(255,255,255,0.45)" />
      <p>click <i>anywhere</i> to enable audio</p>
    </div>
  </div>
{/if}

<!-- Error modal -->
{#if playerError}
  <div class="audio-modal">
    <div class="audio-modal-inner">
      <p>{playerError}</p>
    </div>
  </div>
{/if}

<main class="min-h-screen flex items-center justify-center bg-background p-8 font-sans">

  <!-- Settings Panel (LEFT) -->
  {#if activePanel === 'settings'}
    <div
      class="w-[300px] h-[325px] bg-card text-card-foreground rounded-2xl p-[18px_18px_14px] shadow-lg flex-shrink-0"
      in:SlideInRight
      out:SlideInRight
    >
      <h1>"<b>Settings</b>" (not really)</h1>
      <br />
      <p>i didnt really think this one out i just wanted something here lol</p>

      <Separator class="my-4" />

      <a href="https://raw.githubusercontent.com/guille7z/keygen.mp3/refs/heads/master/LICENSE">mit licensed</a>
    </div>
    <div class="w-4 flex-shrink-0"></div>
  {/if}

  <!-- MAIN PLAYER CARD -->
  <div class="w-[300px] bg-card text-card-foreground rounded-2xl p-[18px_18px_14px] shadow-lg flex-shrink-0">
    <!-- Song info -->
    <div class="text-center mb-3.5">
      <h3 class="text-[0.95rem] font-semibold truncate">
        {isLoaded ? displayTitle(selectedSong) : '???'}
      </h3>
      <p class="text-[0.75rem] text-muted-foreground mt-0.5 truncate">
        {isLoaded ? displayArtist(selectedSong) : '???'}
      </p>
    </div>

    <!-- Visualizer -->
    <Visualizer {analyser} isPlaying={isLoaded && !isPaused} />

    <!-- Progress bar -->
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
      ontouchend={(e) => {
        isDragging = false
        const v = (e.target as HTMLInputElement).valueAsNumber
        pos = v
        chiptune?.setPos(v)
      }}
      disabled={!initialized || !duration}
      class="w-full progress-bar"
    />

    <div class="flex justify-between mt-1.5 text-[0.7rem] tabular-nums font-mono text-muted-foreground">
      <span>{timeElapsed}</span>
      <span>-{timeLeft}</span>
    </div>

    <!-- Transport -->
    <div class="relative flex items-center justify-center gap-2 mt-2">
      <Button
        variant="ghost" size="icon" class="rounded-full absolute left-0"
        onclick={() => activePanel = activePanel === 'settings' ? null : 'settings'}
      >
        <Cog size={18} />
      </Button>

      <Button variant="ghost" size="icon" class="rounded-full" onclick={prev} disabled={!initialized}>
        <SkipBack size={18} fill="currentColor" />
      </Button>

      <Button onclick={() => isLoaded ? togglePause() : load(selectedSong)} size="icon" class="rounded-full w-[46px] h-[46px]" disabled={!initialized}>
        {#if isPaused || !isLoaded}
          <Play size={20} fill="currentColor" />
        {:else}
          <Pause size={20} fill="currentColor" />
        {/if}
      </Button>

      <Button variant="ghost" size="icon" class="rounded-full" onclick={next} disabled={!initialized}>
        <SkipForward size={18} fill="currentColor" />
      </Button>

      <Button
        variant="ghost" size="icon" class="rounded-full absolute right-0"
        onclick={() => activePanel = activePanel === 'audio' ? null : 'audio'}
      >
        <Volume2 size={18} />
      </Button>
    </div>

    <!-- Shuffle / Loop -->
    <div class="flex items-center justify-center gap-3 mt-3">
      <Button
        variant="ghost" size="icon"
        class="rounded-full w-7 h-7 {playMode === 'shuffle' ? 'text-primary' : 'text-muted-foreground'}"
        onclick={() => setPlayMode('shuffle')}
        disabled={!initialized}
      >
        <Shuffle size={14} />
      </Button>
      <Button
        variant="ghost" size="icon"
        class="rounded-full w-7 h-7 {playMode === 'loop' ? 'text-primary' : 'text-muted-foreground'}"
        onclick={() => setPlayMode('loop')}
        disabled={!initialized}
      >
        <Repeat size={14} />
      </Button>
    </div>

    <Separator class="my-4" />

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            class="w-full justify-between text-left font-normal cursor-pointer"
            disabled={!initialized}
          >
            <span class="truncate">{basename(selectedSong)}</span>
            <ChevronDown />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        class="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-auto"
        align="start"
      >
        {#each songs as path}
          <DropdownMenu.Item
            class="truncate cursor-pointer"
            onclick={() => { selectedSong = path; load(path) }}
          >
            {basename(path)}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <!-- Audio Parameters Panel (RIGHT) -->
  {#if activePanel === 'audio'}
    <div class="w-4 flex-shrink-0"></div>
    <div
      class="w-[150px] h-[250px] bg-card text-card-foreground rounded-2xl p-[18px_12px_14px] shadow-lg flex-shrink-0"
      in:SlideInLeft
      out:SlideInLeft
    >
      <div class="flex items-stretch justify-around h-full">
        {#each [ // TODO: replace this part's labels with lucide icons somehow (btw thx claude :3)
          { label: '🔈',   val: volume, set: (v: number) => { volume = v; applyVolume(v) } },
          //{ label: '🐁', val: pitch,  set: (v: number) => { pitch  = v; applyPitch(v)  } }, // doesnt work properly, tbd
          { label: '⏱️', val: tempo,  set: (v: number) => { tempo  = v; applyTempo(v)  } },
        ] as param}
          <div class="flex flex-col items-center justify-between py-1">
            <Slider
              type="single"
              value={param.val}
              min={0} max={100} step={1}
              orientation="vertical"
              onValueChange={param.set}
            />
            <span class="text-[0.6rem] text-muted-foreground mt-2">{param.label}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

</main>