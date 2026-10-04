/* Floating "Birthday Playlist" player.
 * - Plays local files from assets/music (served by the Streamlit component).
 * - Never autoplays: start() is only called from the "Open Invitation" click.
 * - If no music files exist, a built-in Web Audio music-box "Happy Birthday"
 *   is used so the experience still has sound.
 */
(function () {
  const fmt = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  /* ---------- Built-in music box ---------- */
  class MusicBox {
    constructor() {
      this.ctx = null;
      this.vol = 0.7;
      this.beat = 0.46;
      // [midi note, beats]
      this.notes = [
        [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
        [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
        [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
        [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3],
      ];
      // simple accompaniment (root notes per bar)
      this.bass = [[48, 1], [48, 3], [55, 3], [55, 3], [48, 3], [48, 3], [53, 3], [48, 1.5], [55, 1.5], [48, 3]];
      this.duration = this.notes.reduce((a, n) => a + n[1], 0) * this.beat + 2;
      this.voices = [];
      this.songStart = 0;
    }
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol * 0.5;
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.27;
      const fb = this.ctx.createGain(); fb.gain.value = 0.3;
      const wet = this.ctx.createGain(); wet.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.ctx.destination);
    }
    freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    tone(m, t, d, gain = 0.32, type = "triangle") {
      const c = this.ctx, g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + d + 0.9);
      g.connect(this.master);
      const o1 = c.createOscillator(); o1.type = type; o1.frequency.value = this.freq(m);
      const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = this.freq(m) * 2.01;
      const g2 = c.createGain(); g2.gain.value = 0.25;
      o1.connect(g); o2.connect(g2); g2.connect(g);
      [o1, o2].forEach((o) => { o.start(t); o.stop(t + d + 1); this.voices.push(o); });
    }
    schedule(at) {
      this.songStart = at;
      let t = at + 0.05;
      this.notes.forEach(([m, b]) => { this.tone(m, t, b * this.beat * 0.9); t += b * this.beat; });
      let tb = at + 0.05;
      this.bass.forEach(([m, b]) => { this.tone(m, tb, b * this.beat, 0.12, "sine"); tb += b * this.beat; });
    }
    stopVoices() { this.voices.forEach((o) => { try { o.stop(0); } catch (e) { /* */ } }); this.voices = []; }
    play() {
      this.ensure();
      if (!this.scheduled) { this.scheduled = true; this.schedule(this.ctx.currentTime); }
      return this.ctx.resume();
    }
    pause() { if (this.ctx) this.ctx.suspend(); }
    restart() { this.ensure(); this.stopVoices(); this.schedule(this.ctx.currentTime); this.ctx.resume(); }
    tick() { // loop forever
      if (this.ctx && this.ctx.state === "running" && this.ctx.currentTime >= this.songStart + this.duration - 0.4) {
        this.voices = [];
        this.schedule(this.songStart + this.duration);
      }
    }
    get current() { return this.ctx ? Math.max(0, this.ctx.currentTime - this.songStart) : 0; }
    get playing() { return !!this.ctx && this.ctx.state === "running"; }
    setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v * 0.5; }
  }

  /* ---------- Player UI ---------- */
  class Player {
    constructor(tracks) {
      const $ = (id) => document.getElementById(id);
      this.el = $("player");
      this.audio = $("audio");
      this.ui = {
        title: $("trackTitle"), seek: $("seek"), cur: $("timeCur"), dur: $("timeDur"),
        play: $("playBtn"), prev: $("prevBtn"), next: $("nextBtn"), vol: $("volume"),
        list: $("trackList"), toggle: $("playerToggle"),
      };
      this.synthMode = !tracks || !tracks.length;
      this.tracks = this.synthMode ? [{ title: "Happy Birthday · Music Box 🎂", src: null }] : tracks;
      this.index = 0;
      this.blobs = {};
      this.box = this.synthMode ? new MusicBox() : null;
      this.seeking = false;
      this.started = false;

      this.audio.volume = 0.7;
      this.renderList();
      this.load(0, false);
      this.bind();
      setInterval(() => this.updateProgress(), 250);
    }

    bind() {
      const u = this.ui;
      u.play.addEventListener("click", () => this.toggle());
      u.prev.addEventListener("click", () => this.prev());
      u.next.addEventListener("click", () => this.next());
      u.toggle.addEventListener("click", () => this.el.classList.toggle("is-collapsed"));
      u.vol.addEventListener("input", () => {
        const v = u.vol.value / 100;
        this.audio.volume = v;
        if (this.box) this.box.setVolume(v);
      });
      u.seek.addEventListener("input", () => { this.seeking = true; });
      u.seek.addEventListener("change", () => { this.seekTo(u.seek.value / 1000); this.seeking = false; });
      this.audio.addEventListener("ended", () => this.next());
      this.audio.addEventListener("play", () => this.setPlaying(true));
      this.audio.addEventListener("pause", () => this.setPlaying(false));
      this.audio.addEventListener("loadedmetadata", () => this.updateProgress());
      this.audio.addEventListener("error", (e) => {
        console.warn("Audio element error on track", this.index, e);
        if (this.tracks && this.tracks.length > 1) {
          setTimeout(() => this.next(), 600);
        }
      });
    }

    updateTracks(newTracks) {
      if (!newTracks || !newTracks.length) return;
      this.tracks = newTracks;
      this.synthMode = false;
      this.renderList();
      if (!this.playing) {
        this.load(0, false);
      }
    }

    renderList() {
      this.ui.list.innerHTML = "";
      this.tracks.forEach((t, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${String(i + 1).padStart(2, "0")}</span><span></span>`;
        li.lastChild.textContent = t.title;
        li.addEventListener("click", () => this.load(i, true));
        this.ui.list.appendChild(li);
      });
    }

    load(i, autoplay) {
      this.index = (i + this.tracks.length) % this.tracks.length;
      const t = this.tracks[this.index];
      if (!t) return;
      this.ui.title.textContent = t.title || "Lagu Ulang Tahun";
      [...this.ui.list.children].forEach((li, k) => li.classList.toggle("active", k === this.index));
      if (this.synthMode || !t.src) {
        if (this.box && autoplay) { this.box.restart(); this.setPlaying(true); }
        return;
      }
      this.audio.src = this.blobs[this.index] || t.src;
      this.audio.load();
      if (autoplay) this.play();
    }

    /** Called from the "Open Invitation" click (a user gesture). */
    start() {
      this.started = true;
      return this.play();
    }

    play() {
      if (this.synthMode) {
        if (this.box) {
          this.box.play();
          this.setPlaying(true);
        }
        return;
      }
      const p = this.audio.play();
      if (p && p.catch) {
        p.catch((e) => console.info("Playback waiting for gesture:", e.message));
      }
    }

    pause() {
      if (this.synthMode) { this.box.pause(); this.setPlaying(false); }
      else this.audio.pause();
    }

    get playing() { return this.synthMode ? this.box.playing : !this.audio.paused; }
    toggle() { this.playing ? this.pause() : this.play(); }
    next() { this.load(this.index + 1, true); }
    prev() {
      if (!this.synthMode && this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
      this.load(this.index - 1, true);
    }

    async seekTo(frac) {
      if (this.synthMode) { if (frac < 0.05) this.box.restart(); return; }
      const a = this.audio;
      if (!isFinite(a.duration)) return;
      const target = frac * a.duration;
      a.currentTime = target;
      // Some servers don't support HTTP range requests (needed for seeking).
      // In that case load the track as a Blob once and seek inside it.
      setTimeout(async () => {
        if (Math.abs(a.currentTime - target) < 1.5 || this.blobs[this.index]) return;
        try {
          const idx = this.index, wasPlaying = !a.paused;
          const blob = await (await fetch(this.tracks[idx].src)).blob();
          this.blobs[idx] = URL.createObjectURL(blob);
          if (idx !== this.index) return;
          a.src = this.blobs[idx];
          a.addEventListener("loadedmetadata", () => {
            a.currentTime = target;
            if (wasPlaying) a.play();
          }, { once: true });
        } catch (e) { console.info("Seek fallback failed", e); }
      }, 350);
    }

    setPlaying(on) {
      this.el.classList.toggle("is-playing", on);
      this.ui.play.textContent = on ? "❚❚" : "▶";
      this.ui.play.setAttribute("aria-label", on ? "Pause" : "Play");
    }

    updateProgress() {
      let cur, dur;
      if (this.synthMode) {
        this.box.tick();
        cur = this.box.current; dur = this.box.duration;
        if (this.box.ctx) this.setPlaying(this.box.playing);
      } else {
        cur = this.audio.currentTime; dur = this.audio.duration;
      }
      this.ui.cur.textContent = fmt(cur);
      this.ui.dur.textContent = fmt(dur);
      if (!this.seeking && isFinite(dur) && dur > 0) this.ui.seek.value = Math.min(1000, (cur / dur) * 1000);
    }
  }

  window.Player = Player;
})();
