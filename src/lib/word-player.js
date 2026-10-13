const SESSION_ACTIONS = ['play', 'pause', 'previoustrack', 'nexttrack', 'stop'];

function makeAudio() {
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.playsInline = true;
  audio.setAttribute('playsinline', '');
  audio.setAttribute('webkit-playsinline', '');
  // Keep the element in the document, but do not use display:none. Some mobile
  // browsers will not continue a hidden element once the screen is locked.
  audio.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
  document.body.append(audio);
  return audio;
}

function publishMetadata(clip) {
  if (!clip || !('mediaSession' in navigator)) return;
  const artworkSrc = document.querySelector('link[rel="icon"]')?.href;
  const details = {
    title: clip.title || 'Belajar Indonesia',
    artist: clip.artist || 'Belajar Indonesia',
    album: clip.album || 'Flashcards',
  };
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      ...details,
      artwork: artworkSrc ? [{ src: artworkSrc, sizes: 'any', type: 'image/svg+xml' }] : [],
    });
  } catch {
    navigator.mediaSession.metadata = new MediaMetadata(details);
  }
}

function bindSession(actions) {
  if (!('mediaSession' in navigator)) return;
  for (const name of SESSION_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(name, actions[name] || null);
    } catch {
      /* This action is not supported here. */
    }
  }
}

function clearSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = 'none';
  try {
    navigator.mediaSession.metadata = null;
  } catch {
    /* Some browsers reject a null metadata assignment. */
  }
  for (const name of SESSION_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(name, null);
    } catch {
      /* This action is not supported here. */
    }
  }
}

/**
 * One audio element that plays a short queue. The next clip is started inside
 * the ended event so a listen session can keep going with the screen locked.
 */
export function createWordPlayer() {
  const audio = makeAudio();
  let clips = [];
  let index = 0;
  let playToken = 0;
  let callbacks = {};
  let session = false;
  let advancing = false;
  let acceptEnded = false;
  let expectedSrc = '';

  function currentToken() {
    return Number(audio.dataset.token);
  }

  function finish(which) {
    const done = callbacks[which];
    clips = [];
    acceptEnded = false;
    done?.();
  }

  function playAt(nextIndex) {
    index = nextIndex;
    const clip = clips[index];
    if (!clip) {
      finish('onEnd');
      return;
    }
    const token = ++playToken;
    audio.dataset.token = String(token);
    acceptEnded = false;
    if (session) publishMetadata(clip);
    callbacks.onClip?.(clip, index);
    advancing = true;
    audio.src = clip.src;
    expectedSrc = audio.src;
    advancing = false;
    const pending = audio.play();
    pending?.then(() => {
      if (token !== playToken) return;
      acceptEnded = true;
      if (!session || !('mediaSession' in navigator)) return;
      try {
        if (Number.isFinite(audio.duration)) {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime || 0, audio.duration),
          });
        }
      } catch {
        /* Position state is optional. Playback still continues. */
      }
    });
    pending?.catch((error) => {
      if (token !== playToken) return;
      if (error?.name === 'AbortError') return;
      if (error?.name === 'NotAllowedError') callbacks.onError?.(error);
    });
  }

  audio.addEventListener('playing', () => {
    acceptEnded = true;
  });

  audio.addEventListener('ended', () => {
    if (!acceptEnded || audio.src !== expectedSrc) return;
    if (Number(audio.dataset.token) !== playToken) return;
    if (!clips.length) return;
    acceptEnded = false;
    const next = index + 1;
    if (next >= clips.length) {
      finish('onEnd');
      return;
    }
    playAt(next);
  });

  audio.addEventListener('error', () => {
    if (advancing || currentToken() !== playToken || !clips.length) return;
    const code = audio.error?.code;
    if (!code || code === MediaError.MEDIA_ERR_ABORTED) return;
    const next = index + 1;
    if (next >= clips.length) {
      finish('onError');
      return;
    }
    playAt(next);
  });

  audio.addEventListener('play', () => {
    if (session && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    callbacks.onPlayState?.(true);
  });

  audio.addEventListener('pause', () => {
    if (advancing) return;
    if (session && clips.length && 'mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    callbacks.onPlayState?.(false);
  });

  return {
    play(nextClips, options = {}) {
      clips = nextClips.slice();
      callbacks = options;
      session = Boolean(options.session);
      if (!clips.length) {
        callbacks.onEnd?.();
        return;
      }
      if (session) bindSession(options.actions || {});
      else clearSession();
      if (!audio.paused && !audio.ended) {
        advancing = true;
        audio.pause();
        advancing = false;
      }
      playAt(0);
    },
    pause() {
      audio.pause();
    },
    resume() {
      if (!clips.length) return Promise.resolve();
      if (session) {
        publishMetadata(clips[index]);
        bindSession(callbacks.actions || {});
      }
      return audio.play();
    },
    stop() {
      playToken += 1;
      delete audio.dataset.token;
      clips = [];
      callbacks = {};
      advancing = true;
      audio.pause();
      audio.removeAttribute('src');
      expectedSrc = '';
      acceptEnded = false;
      advancing = false;
      if (session) clearSession();
      session = false;
    },
    get active() {
      return clips.length > 0;
    },
    get paused() {
      return audio.paused;
    },
  };
}
