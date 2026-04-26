<script lang="ts">
  import { onMount } from 'svelte'
  import "../app.css";

  let { children } = $props();

  // Player state
  let ChiptuneJsPlayer = $state(null)
  let chiptune = $state(null)
  let initialized = $state(false)
  let showAudioModal = $state(true)
  let finallyPlayingSong = $state(false)
  let errorMsg = $state(null)

  // Song state
  let metadata = $state({})
  let progress = $state(0)
  let duration = $state(2)
  let subsongs = $state([])
  let selectedSubsong = $state(0)

  // Audio params
  let repeatCount = $state(-1)
  let volume = $state(1)
  let pitch = $state(1)
  let tempo = $state(1)

  // Debug
  let doILookLikeIWantMetadata = $state(false)

  // Song list
  const songs = [
    "src/lib/assets/trackerfiles/estrayk - her 10.mod",
    "src/lib/assets/trackerfiles/JosSs - Extra Life.mod",
    "src/lib/assets/trackerfiles/loonie and ramjam - gary & denise.mod",
    "src/lib/assets/trackerfiles/tempest - acidjazzed evening.mod",
    "src/lib/assets/trackerfiles/4mat - black lipstick.xm",
    "src/lib/assets/trackerfiles/4mat - blank page.xm",
    "src/lib/assets/trackerfiles/4mat - broken heart.XM",
    "src/lib/assets/trackerfiles/4mat - eternity.xm",
    "src/lib/assets/trackerfiles/4mat - rose.xm",
    "src/lib/assets/trackerfiles/4mat - Vertical.xm",
    "src/lib/assets/trackerfiles/AceMan - realize the truth.xm",
    "src/lib/assets/trackerfiles/algar - imorn e en annan dag.xm",
    "src/lib/assets/trackerfiles/anachro - a sad touch.xm",
    "src/lib/assets/trackerfiles/anachro - bunnyboobz.xm",
    "src/lib/assets/trackerfiles/Anders Dator Felix Dator - 2 x the SQUAREbeam.xm",
    "src/lib/assets/trackerfiles/Anders Dator Felix Dator - no name level %231.xm",
    "src/lib/assets/trackerfiles/arachno - granny's mambo.xm",
    "src/lib/assets/trackerfiles/arachno - just another....xm",
    "src/lib/assets/trackerfiles/arachno - Sasja's teddy.xm",
    "src/lib/assets/trackerfiles/arachno - tip of my tongue.xm",
    "src/lib/assets/trackerfiles/arachno & jockson - solnedgang.xm",
    "src/lib/assets/trackerfiles/Attraction - Maran Project.xm",
    "src/lib/assets/trackerfiles/bboll - mr spock's cryo bed.xm",
    "src/lib/assets/trackerfiles/cerror - close encounter.xm",
    "src/lib/assets/trackerfiles/cerror - Jet stream.xm",
    "src/lib/assets/trackerfiles/cerror - sea side blues.xm",
    "src/lib/assets/trackerfiles/chavez - ninja bolognese.xm",
    "src/lib/assets/trackerfiles/dualtrax - orion spaceforce23.xm",
    "src/lib/assets/trackerfiles/Dubmood - 3D Galax.xm",
    "src/lib/assets/trackerfiles/Dubmood - Botkyrka Sidekickers.xm",
    "src/lib/assets/trackerfiles/Dubmood - Introchip %2314 BETAFLUX.XM",
    "src/lib/assets/trackerfiles/Dubmood - Paradox %233.xm",
    "src/lib/assets/trackerfiles/falcon - spineless_.xm",
    "src/lib/assets/trackerfiles/Fearofdark - Get A Brain Morans.xm",
    "src/lib/assets/trackerfiles/Funky Fish - R2-D2.xm",
    "src/lib/assets/trackerfiles/Funky Fish and raina - artificial sweetener.xm",
    "src/lib/assets/trackerfiles/Ghidorah - Good night Mr. Pung.xm",
    "src/lib/assets/trackerfiles/gusse & keyg & loonie - synergetic.xm",
    "src/lib/assets/trackerfiles/HyoChan - sleepy sunflower.xm",
    "src/lib/assets/trackerfiles/Jakim - Valium candies.xm",
    "src/lib/assets/trackerfiles/JosSs - Eklipse.xm",
    "src/lib/assets/trackerfiles/JosSs - Pixeltropia.xm",
    "src/lib/assets/trackerfiles/JosSs - Sweetest Sin.XM",
    "src/lib/assets/trackerfiles/JosSs - Xs EdzesSs.xm",
    "src/lib/assets/trackerfiles/joule - independent.xm",
    "src/lib/assets/trackerfiles/joule & ko0x - caroline in neon.xm",
    "src/lib/assets/trackerfiles/joule & malmen - one way heart.xm",
    "src/lib/assets/trackerfiles/Kapten Floede - Magic Cookie Maker.xm",
    "src/lib/assets/trackerfiles/ko0x - caramel condition.xm",
    "src/lib/assets/trackerfiles/ko0x - zenon.xm",
    "src/lib/assets/trackerfiles/lesnik - bother me.xm",
    "src/lib/assets/trackerfiles/lesnik - rob mat reyn pink.xm",
    "src/lib/assets/trackerfiles/look & zalza - little computer boy.xm",
    "src/lib/assets/trackerfiles/loonie - the man in the moon.xm",
    "src/lib/assets/trackerfiles/magma, wabe, dark raccoons - Blinded Monarch.xm",
    "src/lib/assets/trackerfiles/malmen & joule - tomorrow without you.xm",
    "src/lib/assets/trackerfiles/matrix cubed - home.xm",
    "src/lib/assets/trackerfiles/moh - kontaktproblem.xm",
    "src/lib/assets/trackerfiles/motherchip - portello.xm",
    "src/lib/assets/trackerfiles/mrdeath - Hyperdrive Motion.xm",
    "src/lib/assets/trackerfiles/MrGamer - For My Friends.xm",
    "src/lib/assets/trackerfiles/MrGamer - Hostlov.xm",
    "src/lib/assets/trackerfiles/MrGamer - Oskars Skarmslackare.xm",
    "src/lib/assets/trackerfiles/MrGamer - Yes, I see.xm",
    "src/lib/assets/trackerfiles/Mystic Cloud - Obsession.xm",
    "src/lib/assets/trackerfiles/Nagz - x  0  (.)  .  c.xm",
    "src/lib/assets/trackerfiles/ogg - lost.xm",
    "src/lib/assets/trackerfiles/pk - Chip orgie.xm",
    "src/lib/assets/trackerfiles/radix - the mission.xm",
    "src/lib/assets/trackerfiles/radix & loonie - kookoo.xm",
    "src/lib/assets/trackerfiles/radix & xyce - Rainbow Dash.xm",
    "src/lib/assets/trackerfiles/raina - slumberjack.xm",
    "src/lib/assets/trackerfiles/raina - smile.xm",
    "src/lib/assets/trackerfiles/raina - sumsong.xm",
    "src/lib/assets/trackerfiles/rez+kenet - unreeeal superhero 3.xm",
    "src/lib/assets/trackerfiles/Saxxon Pike - Broken.xm",
    "src/lib/assets/trackerfiles/seablue - jason the spacecadet.xm",
    "src/lib/assets/trackerfiles/skuter - .mr. saw.xm",
    "src/lib/assets/trackerfiles/SofT MANiAC - i NEEd Y0uR L0vE!.xm",
    "src/lib/assets/trackerfiles/tequila - stefan missar bussan.xm",
    "src/lib/assets/trackerfiles/tone - siberiada.XM",
    "src/lib/assets/trackerfiles/UNKNOWN - alone in the scene.xm",
    "src/lib/assets/trackerfiles/UNKNOWN - reloaded intro music.XM",
    "src/lib/assets/trackerfiles/Unstruct - Above and beyond.xm",
    "src/lib/assets/trackerfiles/xerxes - untitled.xm",
    "src/lib/assets/trackerfiles/xyce - la cherie.xm",
    "src/lib/assets/trackerfiles/zalza - tekilla groove.xm",
    "src/lib/assets/trackerfiles/Zalza - Tuborg Heaven.xm",
    "src/lib/assets/trackerfiles/amgorb - randomizer 666.it",
    "src/lib/assets/trackerfiles/Ceekayed - Layers.it",
    "src/lib/assets/trackerfiles/Ceekayed - Wobbly Things.it",
    "src/lib/assets/trackerfiles/laamaa - nelly in 8bit land.it",
    "src/lib/assets/trackerfiles/Nightbeat - Winterstar.it",
    "src/lib/assets/trackerfiles/Ojciec - Usteczka .it",
    "src/lib/assets/trackerfiles/radix - something eating my mind.it",
    "src/lib/assets/trackerfiles/radix & loonie - kookoo (GHOSTDESIGN_MIX).it",
    "src/lib/assets/trackerfiles/silo7 - verZion.it",
    "src/lib/assets/trackerfiles/tj technoiZ - too old.it",
    "src/lib/assets/trackerfiles/vibe - I should quit chipping.it",
    "src/lib/assets/trackerfiles/vince kaichan - ama no gawa.it",
  ]

  // Extract display name from path (e.g. "4mat - rose.xm" → "4mat - rose")
  function songLabel(path: string) {
    return path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path
  }

  let selectedSong = $state(songs[0])

  // Derived
  let isPlaying = $derived(() => initialized && !errorMsg)
  let currentTitle = $derived(() => (metadata as any)?.title ?? '')

  async function loadDependencies() {
    const mod = await import('https://drsnuggles.github.io/chiptune/chiptune3.js')
    ChiptuneJsPlayer = mod.ChiptuneJsPlayer
  }

  function initPlayer() {
    if (chiptune) return
    showAudioModal = false

    loadDependencies().then(() => {
      chiptune = new ChiptuneJsPlayer()

      chiptune.onInitialized(() => { initialized = true })
      chiptune.onEnded(() => { chiptune.stop() })
      chiptune.onError((err) => { errorMsg = err?.message || String(err) })
      chiptune.onProgress((pos) => { progress = pos })
      chiptune.onMetadata((meta) => {
        duration = meta.dur || 2
        metadata = meta
        subsongs = Array.isArray(meta.subsongs)
          ? meta.subsongs
          : Object.values(meta.subsongs ?? {})
      })
    })
  }

  function onUserInteract() {
    if (!showAudioModal) return
    initPlayer()
    ;['keydown', 'click', 'touchstart'].forEach(evt =>
      window.removeEventListener(evt, onUserInteract)
    )
  }

  // Playback
  function load(url: string) { chiptune?.load(url); finallyPlayingSong = true }
  function stop() { chiptune?.stop() }
  function togglePause() { chiptune?.togglePause() }

  // Audio params
  function updateRepeat(e) { repeatCount = +e.target.value; chiptune?.setRepeatCount(repeatCount) }
  function updateSubsong(e) { selectedSubsong = +e.target.value; chiptune?.selectSubsong(selectedSubsong) }
  function updatePos(e) { progress = +e.target.value; chiptune?.setPos(progress) }
  function updateVol(e) { volume = +e.target.value; chiptune?.setVol(volume) }
  function updatePitch(e) { pitch = +e.target.value; chiptune?.setPitch(pitch) }
  function updateTempo(e) { tempo = +e.target.value; chiptune?.setTempo(tempo) }

  function onSongSelect(e) {
    selectedSong = e.target.value
    if (initialized) load(selectedSong)
  }

  onMount(() => {
    ;['keydown', 'click', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, onUserInteract)
    )
    return () => {
      ;['keydown', 'click', 'touchstart'].forEach(evt =>
        window.removeEventListener(evt, onUserInteract)
      )
      chiptune?.stop()
      chiptune = null
    }
  })
</script>

{#if showAudioModal}
  <div class="audio-modal" on:click={onUserInteract}>
    <p>Click anywhere to enable audio</p>
  </div>
{/if}

<main class="chiptune-ui">
  <section>
    <fieldset>
    <legend>Playback Controls</legend>

    <div class="player-row">
        <div class="song-info">
        {#if finallyPlayingSong}
            <h3>{currentTitle() || songLabel(selectedSong)}</h3>
        {:else}
            <h3>No song loaded</h3>
        {/if}
        <p class="song-author">???</p>
        </div>

        <div class="player-controls">
        <label class="song-label">
            Song:
            <select value={selectedSong} on:change={onSongSelect} disabled={!initialized}>
            {#each songs as path}
                <option value={path}>{songLabel(path)}</option>
            {/each}
            </select>
        </label>

        <div class="buttons-row">
            <button on:click={() => load(selectedSong)} disabled={!initialized}>▶</button>
            <button on:click={stop} disabled={!isPlaying()}>⏹</button>
            <button on:click={togglePause} disabled={!isPlaying()}>⏯</button>
            <label class="repeat-label">
            Repeat:
            <input type="number" min="-1" max="99" step="1"
                bind:value={repeatCount}
                on:change={updateRepeat}
                disabled={!initialized}
            />
            <small>(-1 = endless)</small>
            </label>
        </div>
        </div>
    </div>
    </fieldset>
  </section>

  <section>
    <fieldset>
      <legend>Audio Parameters</legend>
      <label class="slider-row">
        <span>Seek</span>
        <input type="range" min="0" max={duration} step="0.0001"
          bind:value={progress} on:input={updatePos} disabled={!initialized}
        />
        <span class="time">{progress.toFixed(2)}s / {duration.toFixed(2)}s</span>
      </label>
      <label class="slider-row">
        <span>Volume</span>
        <input type="range" min="0" max="2" step="0.0001"
          bind:value={volume} on:input={updateVol} disabled={!initialized}
        />
        <span>{Math.round((volume)/2*100)}%</span>
      </label>
      <label class="slider-row">
        <span>Pitch</span>
        <input type="range" min="0" max="2" step="0.0001"
          bind:value={pitch} on:input={updatePitch} disabled={!initialized}
        />
        <span>{Math.round((pitch)/2*100)}%</span>
      </label>
      <label class="slider-row">
        <span>Tempo</span>
        <input type="range" min="0" max="2" step="0.0001"
          bind:value={tempo} on:input={updateTempo} disabled={!initialized}
        />
        <span>{Math.round((tempo)/2*100)}%</span>
      </label>
    </fieldset>
  </section>

  {#if doILookLikeIWantMetadata}
  <section>
    <fieldset>
      <legend>Metadata</legend>
      <pre class="pre-code">{JSON.stringify(metadata, null, 2)}</pre>
    </fieldset>
  </section>
  {/if}
</main>