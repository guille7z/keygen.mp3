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
  let allowBroken = $state(false)

  // Song list
  const songs = [
    '/trackerfiles/estrayk - her 10.mod',
    '/trackerfiles/JosSs - Extra Life.mod',
    '/trackerfiles/loonie and ramjam - gary & denise.mod',
    '/trackerfiles/tempest - acidjazzed evening.mod',
    '/trackerfiles/4mat - black lipstick.xm',
    '/trackerfiles/4mat - blank page.xm',
    '/trackerfiles/4mat - broken heart.XM',
    '/trackerfiles/4mat - eternity.xm',
    '/trackerfiles/4mat - rose.xm',
    '/trackerfiles/4mat - Vertical.xm',
    '/trackerfiles/AceMan - realize the truth.xm',
    '/trackerfiles/algar - imorn e en annan dag.xm',
    '/trackerfiles/anachro - a sad touch.xm',
    '/trackerfiles/anachro - bunnyboobz.xm',
    '/trackerfiles/Anders Dator Felix Dator - 2 x the SQUAREbeam.xm',
    '/trackerfiles/Anders Dator Felix Dator - no name level %231.xm',
    "/trackerfiles/arachno - granny's mambo.xm",
    '/trackerfiles/arachno - just another....xm',
    "/trackerfiles/arachno - Sasja's teddy.xm",
    '/trackerfiles/arachno - tip of my tongue.xm',
    '/trackerfiles/arachno & jockson - solnedgang.xm',
    '/trackerfiles/Attraction - Maran Project.xm',
    "/trackerfiles/bboll - mr spock's cryo bed.xm",
    '/trackerfiles/cerror - close encounter.xm',
    '/trackerfiles/cerror - Jet stream.xm',
    '/trackerfiles/cerror - sea side blues.xm',
    '/trackerfiles/chavez - ninja bolognese.xm',
    '/trackerfiles/dualtrax - orion spaceforce23.xm',
    '/trackerfiles/Dubmood - 3D Galax.xm',
    '/trackerfiles/Dubmood - Botkyrka Sidekickers.xm',
    '/trackerfiles/Dubmood - Introchip no. 14 BETAFLUX.XM',
    '/trackerfiles/Dubmood - Paradox no. 3.xm',
    '/trackerfiles/falcon - spineless_.xm',
    '/trackerfiles/Fearofdark - Get A Brain Morans.xm',
    '/trackerfiles/Funky Fish - R2-D2.xm',
    '/trackerfiles/Funky Fish and raina - artificial sweetener.xm',
    '/trackerfiles/Ghidorah - Good night Mr. Pung.xm',
    '/trackerfiles/gusse & keyg & loonie - synergetic.xm',
    '/trackerfiles/HyoChan - sleepy sunflower.xm',
    '/trackerfiles/Jakim - Valium candies.xm',
    '/trackerfiles/JosSs - Eklipse.xm',
    '/trackerfiles/JosSs - Pixeltropia.xm',
    '/trackerfiles/JosSs - Sweetest Sin.XM',
    '/trackerfiles/JosSs - Xs EdzesSs.xm',
    '/trackerfiles/joule - independent.xm',
    '/trackerfiles/joule & ko0x - caroline in neon.xm',
    '/trackerfiles/joule & malmen - one way heart.xm',
    '/trackerfiles/Kapten Floede - Magic Cookie Maker.xm',
    '/trackerfiles/ko0x - caramel condition.xm',
    '/trackerfiles/ko0x - zenon.xm',
    '/trackerfiles/lesnik - bother me.xm',
    '/trackerfiles/lesnik - rob mat reyn pink.xm',
    '/trackerfiles/look & zalza - little computer boy.xm',
    '/trackerfiles/loonie - the man in the moon.xm',
    '/trackerfiles/magma, wabe, dark raccoons - Blinded Monarch.xm',
    '/trackerfiles/malmen & joule - tomorrow without you.xm',
    '/trackerfiles/matrix cubed - home.xm',
    '/trackerfiles/moh - kontaktproblem.xm',
    '/trackerfiles/motherchip - portello.xm',
    '/trackerfiles/mrdeath - Hyperdrive Motion.xm',
    '/trackerfiles/MrGamer - For My Friends.xm',
    '/trackerfiles/MrGamer - Hostlov.xm',
    '/trackerfiles/MrGamer - Oskars Skarmslackare.xm',
    '/trackerfiles/MrGamer - Yes, I see.xm',
    '/trackerfiles/Mystic Cloud - Obsession.xm',
    '/trackerfiles/Nagz - x  0  (.)  .  c.xm',
    '/trackerfiles/ogg - lost.xm',
    '/trackerfiles/pk - Chip orgie.xm',
    '/trackerfiles/radix - the mission.xm',
    '/trackerfiles/radix & loonie - kookoo.xm',
    '/trackerfiles/radix & xyce - Rainbow Dash.xm',
    '/trackerfiles/raina - slumberjack.xm',
    '/trackerfiles/raina - smile.xm',
    '/trackerfiles/raina - sumsong.xm',
    '/trackerfiles/rez+kenet - unreeeal superhero 3.xm',
    '/trackerfiles/Saxxon Pike - Broken.xm',
    '/trackerfiles/seablue - jason the spacecadet.xm',
    '/trackerfiles/skuter - .mr. saw.xm',
    '/trackerfiles/SofT MANiAC - i NEEd Y0uR L0vE!.xm',
    '/trackerfiles/tequila - stefan missar bussan.xm',
    '/trackerfiles/tone - siberiada.XM',
    '/trackerfiles/UNKNOWN - alone in the scene.xm',
    '/trackerfiles/UNKNOWN - reloaded intro music.XM',
    '/trackerfiles/Unstruct - Above and beyond.xm',
    '/trackerfiles/xerxes - untitled.xm',
    '/trackerfiles/xyce - la cherie.xm',
    '/trackerfiles/zalza - tekilla groove.xm',
    '/trackerfiles/Zalza - Tuborg Heaven.xm',
    '/trackerfiles/amgorb - randomizer 666.it',
    '/trackerfiles/Ceekayed - Layers.it',
    '/trackerfiles/Ceekayed - Wobbly Things.it',
    '/trackerfiles/laamaa - nelly in 8bit land.it',
    '/trackerfiles/Nightbeat - Winterstar.it',
    '/trackerfiles/Ojciec - Usteczka .it',
    '/trackerfiles/radix - something eating my mind.it',
    '/trackerfiles/radix & loonie - kookoo (GHOSTDESIGN_MIX).it',
    '/trackerfiles/silo7 - verZion.it',
    '/trackerfiles/tj technoiZ - too old.it',
    '/trackerfiles/vibe - I should quit chipping.it',
    '/trackerfiles/vince kaichan - ama no gawa.it',
  ]

  // Extract song display name from path (e.g. "4mat - rose.xm" → "4mat - rose")
  function songLabel(path: string) {
    return path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path // yeah i dont understand any of this this is ai assisted :')
  }
  
  // Extract song artist name from title. They werent in the metadata
  function songArtist(path: string) {
    return path.split('/').pop()?.replace(/\.[^.]+$/, '').split(' - ')[0] ?? path
  }

  function songTitle(path: string) {
    return path.split('/').pop()?.replace(/\.[^.]+$/, '').split(' - ').slice(1).join(' - ') ?? path
  }

  let selectedSong = $state(songs[0])

  // Derived
  let isPlaying = $derived(() => initialized && !errorMsg)
  //let currentTitle = $derived(() => (metadata as any)?.title ?? '')
  let currentArtist = $derived(() => (metadata as any)?.artist ?? '')

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
  function load(url: string) { chiptune?.load(url); finallyPlayingSong = true; console.log("Now playing ", url); }
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
            <h3>{songTitle(selectedSong)}</h3>
            <p class="song-author">{currentArtist() || songArtist(selectedSong)}</p>
        {:else}
            <h3>No song loaded</h3>
        {/if}
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