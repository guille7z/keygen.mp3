<script lang="ts">
  import { songs } from '../lib/songs'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { Volume2, SkipBack, SkipForward, Play, Pause } from '@lucide/svelte'
  import { Separator } from "$lib/components/ui/separator/index.js"
  //import { Slider } from "$lib/components/ui/slider/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { ModeWatcher } from "mode-watcher"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import '../app.css'

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

  let chiptune = $state<ChiptunePlayer | null>(null)
  let initialized = $state(false)
  let showAudioModal = $state(true)
  let isLoaded = $state(false)
  let isPaused = $state(false)
  let isDragging = $state(false)
  let playerError = $state<string | null>(null)

  let pos = $state(0)
  let duration = $state(0)

  let selectedSong = $state(songs[0])

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

  let timeElapsed = $derived(fmt(pos))
  let timeLeft = $derived(duration > 0 ? fmt(duration - pos) : '0:00')
  
  // Throttle progress — onProgress fires at ~60fps, 250ms is plenty for a progress bar - claude
  let lastProgressUpdate = 0

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
        isLoaded = false
        pos = 0
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
    chiptune.load(url)
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

  function onSeek(v: number[]): void {
    isDragging = true
    pos = v[0]
  }

  function onSeekEnd(v: number[]): void {
    isDragging = false
    pos = v[0]
    chiptune?.setPos(v[0])
  }

  function onFirstInteraction(): void {
    initPlayer()
    ;['keydown', 'click', 'touchstart'].forEach(evt =>
      window.removeEventListener(evt, onFirstInteraction)
    )
  }

  onMount(() => {
    ;['click', 'touchstart', 'keydown'].forEach(e =>
      window.addEventListener(e, onFirstInteraction, { once: true })
    )
  })
</script>

{#if showAudioModal}
  <div
    class="audio-modal"
    onclick={onFirstInteraction}
    out:fade={{ duration: 300 }}
  >
    <div class="audio-modal-inner">
      <Volume2 size={36} color="rgba(255,255,255,0.45)" />
      <p><i>click</i> anywhere to enable audio</p>
    </div>
  </div>
{/if}

{#if playerError}
    <div class="audio-modal">
      <div class="audio-modal-inner">
        <p>fuck: {playerError}</p>
      </div>
  </div>
{/if}

<main class="min-h-screen flex items-center justify-center bg-background p-8 font-sans">
  <div class="w-[300px] bg-card text-card-foreground rounded-2xl p-[18px_18px_14px] shadow-lg">
    <div class="text-center mb-3.5">
      <h3 class="text-[0.95rem] font-semibold truncate">
        {isLoaded ? displayTitle(selectedSong) : 'untitled'}
      </h3>
      <p class="text-[0.75rem] text-muted-foreground mt-0.5 truncate">
        {isLoaded ? displayArtist(selectedSong) : 'anonymous'}
      </p>
    </div>

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
      class="w-full seek-slider"
    />

    <div class="flex justify-between mt-1.5 text-[0.7rem] tabular-nums font-mono text-muted-foreground">
      <span>{timeElapsed}</span>
      <span>-{timeLeft}</span>
    </div>

    <div class="flex items-center justify-center gap-2 mt-2">
      <Button
        variant="ghost"
        size="icon"
        class="rounded-full"
        onclick={prev}
        disabled={!initialized}
      >
        <SkipBack size={18} fill="currentColor" />
      </Button>

      <Button
        onclick={() => isLoaded ? togglePause() : load(selectedSong)}
        size="icon"
        class="rounded-full w-[46px] h-[46px]"
        disabled={!initialized}
      >
        {#if isPaused || !isLoaded}
          <Play size={20} fill="currentColor" />
        {:else}
          <Pause size={20} fill="currentColor" />
        {/if}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        class="rounded-full"
        onclick={next}
        disabled={!initialized}
      >
        <SkipForward size={18} fill="currentColor" />
      </Button>
    </div>

    <div class="my-4">
      <Separator />
    </div>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            class="w-full justify-between text-left font-normal"
            disabled={!initialized}
          >
            <span class="truncate">{basename(selectedSong)}</span>
            <span class="text-muted-foreground text-xs">▼</span>
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
            onclick={() => {
              selectedSong = path
              load(path)
            }}
          >
            {basename(path)}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>

  </div>
</main>