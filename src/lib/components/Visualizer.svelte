<!-- ported from https://github.com/freeCodeCamp/coderadio-client - originally licensed under BSD-3-Clause -->

<script lang="ts">
  import { onDestroy } from 'svelte'

  interface Props {
    analyser: AnalyserNode | null
    isPlaying: boolean
  }

  let { analyser, isPlaying }: Props = $props()

  let canvas = $state<HTMLCanvasElement | null>(null)
  let rafId: number | null = null
  let timerId: ReturnType<typeof setTimeout> | null = null
  let bands: Uint8Array | null = null

  const FADE_DELAY = 500

  $effect(() => {
    if (isPlaying && analyser) {
      if (!bands) {
        bands = new Uint8Array(analyser.frequencyBinCount - 32)
      }
      resizeCanvas()
      startDrawing()
    } else {
      setTimeout(() => {
        stopDrawing()
        clearCanvas()
      }, FADE_DELAY)
    }
  })

  function resizeCanvas() {
    if (!canvas) return
    canvas.width = canvas.parentElement?.offsetWidth ?? 300
    canvas.height = canvas.parentElement?.offsetHeight ?? 64
  }

  function startDrawing() {
    if (rafId !== null) return
    rafId = requestAnimationFrame(drawingLoop)
  }

  function stopDrawing() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    if (timerId !== null) { clearTimeout(timerId); timerId = null }
  }

  function clearCanvas() {
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  function drawingLoop() {
    if (!analyser || !bands) return
    analyser.getByteFrequencyData(bands)
    draw()
    const hasSignal = bands.some(b => b !== 0)
    if (hasSignal) {
      rafId = requestAnimationFrame(drawingLoop)
    } else {
      timerId = setTimeout(() => { rafId = requestAnimationFrame(drawingLoop) }, 250)
    }
  }

  function draw() {
    if (!canvas || !bands) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const barWidth = width / bands.length

    ctx.clearRect(0, 0, width, height)
    ctx.beginPath()
    ctx.moveTo(0, height)

    let x = 0
    for (const band of bands) {
      const y = height - (band / 255) * height
      ctx.lineTo(x, y)
      ctx.lineTo(x + barWidth, y)
      x += barWidth
    }

    ctx.lineTo(x, height)
    ctx.closePath()
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--vis-fill').trim() || 'rgba(99,102,241,0.5)'
    ctx.fill()
  }

  onDestroy(stopDrawing)
</script>

<canvas bind:this={canvas} class="visualizer" aria-label="Audio visualizer"></canvas>

<!--

BSD 3-Clause License

Copyright (c) 2018, freeCodeCamp.org

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

-->