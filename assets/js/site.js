/*
  Shared site behavior for What's Buried Beneath the Pines / Family Tradition.
  Used by both index.html and family-tradition.html so this logic is fetched
  and cached once instead of being duplicated inline on every page.

  Every lookup below is written to tolerate elements that don't exist on a
  given page (e.g. index.html has no trailer modal) so this single file is
  safe to include on both pages unmodified.

  Page-specific feature-flag toggling (which sections/nav items a page shows
  or hides) stays in a small inline <script> on each page, right after this
  file is loaded, since the flags and target elements differ per page.
*/

const trailerModal = document.getElementById('trailerModal');
const trailerVideo = document.getElementById('trailerVideo');

const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');
const mobileLinks = document.querySelectorAll('[data-mobile-link]');

const toTopButton = document.getElementById('toTopButton');

const familyAudioPlayer = document.getElementById('familyAudioPlayer');
const familyMobileAudioPlayer = document.getElementById('familyMobileAudioPlayer');
const familyAudio = document.getElementById('familyAudio');

const familyAudioPlayButtons = [
  document.getElementById('familyAudioPlayDesktop'),
  document.getElementById('familyAudioPlayMobile')
].filter(Boolean);

const familyAudioPlayIcons = [
  document.getElementById('familyAudioPlayIconDesktop'),
  document.getElementById('familyAudioPlayIconMobile')
].filter(Boolean);

const familyAudioSeekInputs = [
  document.getElementById('familyAudioSeekDesktop')
].filter(Boolean);

let isMobileMenuOpen = false;
let hlsInstance = null;
let hlsLibPromise = null;

function syncFamilyAudioState() {
  if (!familyAudio) return;

  const isPlaying = !familyAudio.paused;

  if (familyAudioPlayer) {
    familyAudioPlayer.classList.toggle('is-playing', isPlaying);
  }

  if (familyMobileAudioPlayer) {
    familyMobileAudioPlayer.classList.toggle('is-playing', isPlaying);
  }
}

function updateFamilyAudioUI() {
  if (!familyAudio) return;

  const isPlaying = !familyAudio.paused;

  familyAudioPlayIcons.forEach((icon) => {
    icon.textContent = isPlaying ? '❚❚' : '▶';
    icon.classList.toggle('ml-0.5', !isPlaying);
  });

  familyAudioPlayButtons.forEach((button) => {
    button.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    button.setAttribute(
      'aria-label',
      isPlaying ? 'Pause Family Tradition song' : 'Play Family Tradition song'
    );
  });

  if (familyAudio.duration) {
    const progress = (familyAudio.currentTime / familyAudio.duration) * 100;

    familyAudioSeekInputs.forEach((input) => {
      if (document.activeElement !== input) {
        input.value = progress;
      }
    });
  } else {
    familyAudioSeekInputs.forEach((input) => {
      input.value = 0;
    });
  }

  syncFamilyAudioState();
}

function toggleFamilyAudioPlayback() {
  if (!familyAudio) return;

  if (familyAudio.paused) {
    familyAudio.play().catch(function() {
      alert('Audio could not be played. Please tap play again.');
    });
  } else {
    familyAudio.pause();
  }

  updateFamilyAudioUI();
}

function seekFamilyAudio(event) {
  if (!familyAudio || !familyAudio.duration) return;

  const targetProgress = Number(event.target.value);
  familyAudio.currentTime = (targetProgress / 100) * familyAudio.duration;
  updateFamilyAudioUI();
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function handleToTopVisibility() {
  if (!toTopButton) return;

  const modalIsHidden = !trailerModal || trailerModal.classList.contains('hidden');

  if (window.scrollY > 700 && !isMobileMenuOpen && modalIsHidden) {
    toTopButton.classList.remove('hidden');
    toTopButton.classList.add('flex');
  } else {
    toTopButton.classList.add('hidden');
    toTopButton.classList.remove('flex');
  }
}

// Loads the hls.js library only the first time it's actually needed
// (i.e. only on browsers without native HLS support, and only once a
// trailer is actually opened) instead of fetching it on every page view.
function ensureHlsLoaded() {
  if (window.Hls) {
    return Promise.resolve();
  }

  if (!hlsLibPromise) {
    hlsLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return hlsLibPromise;
}

function openTrailerModal() {
  closeMobileMenu();

  if (familyAudio && !familyAudio.paused) {
    familyAudio.pause();
    updateFamilyAudioUI();
  }

  if (
    typeof TRAILER_HLS_URL === 'undefined' ||
    !TRAILER_HLS_URL ||
    TRAILER_HLS_URL === 'YOUR_CLOUDFLARE_HLS_URL_HERE' ||
    !trailerVideo ||
    !trailerModal
  ) {
    alert('Trailer coming soon.');
    return;
  }

  trailerModal.classList.remove('hidden');
  trailerModal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  handleToTopVisibility();

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  if (trailerVideo.canPlayType('application/vnd.apple.mpegurl')) {
    trailerVideo.src = TRAILER_HLS_URL;
    return;
  }

  ensureHlsLoaded()
    .then(function () {
      if (!window.Hls || !Hls.isSupported()) {
        alert('This browser does not support the trailer playback format.');
        closeTrailerModal();
        return;
      }

      hlsInstance = new Hls();
      hlsInstance.loadSource(TRAILER_HLS_URL);
      hlsInstance.attachMedia(trailerVideo);
    })
    .catch(function () {
      alert('This browser does not support the trailer playback format.');
      closeTrailerModal();
    });
}

function closeTrailerModal() {
  if (!trailerModal) return;

  trailerModal.classList.add('hidden');
  trailerModal.classList.remove('flex');

  if (trailerVideo) {
    trailerVideo.pause();
    trailerVideo.removeAttribute('src');
    trailerVideo.load();
  }

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  if (!isMobileMenuOpen) {
    document.body.style.overflow = '';
  }

  handleToTopVisibility();
}

function setHamburgerOpen(isOpen) {
  if (!mobileMenuButton) return;

  if (isOpen) {
    mobileMenuButton.classList.add('is-open');
    mobileMenuButton.setAttribute('aria-expanded', 'true');
    mobileMenuButton.setAttribute('aria-label', 'Close menu');
  } else {
    mobileMenuButton.classList.remove('is-open');
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuButton.setAttribute('aria-label', 'Open menu');
  }
}

function openMobileMenu() {
  if (!mobileMenu || !mobileMenuButton) return;

  isMobileMenuOpen = true;

  mobileMenu.classList.remove('hidden');
  mobileMenu.classList.add('block');

  setHamburgerOpen(true);

  document.body.classList.add('menu-open');
  document.body.style.overflow = 'hidden';

  if (toTopButton) {
    toTopButton.classList.add('hidden');
    toTopButton.classList.remove('flex');
  }

  handleToTopVisibility();
}

function closeMobileMenu() {
  if (!mobileMenu || !mobileMenuButton) return;

  isMobileMenuOpen = false;

  mobileMenu.classList.add('hidden');
  mobileMenu.classList.remove('block');

  setHamburgerOpen(false);

  document.body.classList.remove('menu-open');

  const modalIsHidden = !trailerModal || trailerModal.classList.contains('hidden');

  if (modalIsHidden) {
    document.body.style.overflow = '';
  }

  handleToTopVisibility();
}

function toggleMobileMenu() {
  isMobileMenuOpen ? closeMobileMenu() : openMobileMenu();
}

familyAudioPlayButtons.forEach((button) => {
  button.addEventListener('click', toggleFamilyAudioPlayback);
});

familyAudioSeekInputs.forEach((input) => {
  input.addEventListener('input', seekFamilyAudio);
});

if (familyAudio) {
  familyAudio.addEventListener('play', updateFamilyAudioUI);
  familyAudio.addEventListener('pause', updateFamilyAudioUI);
  familyAudio.addEventListener('ended', updateFamilyAudioUI);
  familyAudio.addEventListener('timeupdate', updateFamilyAudioUI);
  familyAudio.addEventListener('loadedmetadata', updateFamilyAudioUI);
}

if (mobileMenuButton) {
  mobileMenuButton.addEventListener('click', toggleMobileMenu);
}

mobileLinks.forEach((link) => {
  link.addEventListener('click', closeMobileMenu);
});

if (trailerModal) {
  trailerModal.addEventListener('click', function(event) {
    if (event.target === trailerModal) {
      closeTrailerModal();
    }
  });
}

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeTrailerModal();
    closeMobileMenu();
  }
});

window.addEventListener('scroll', handleToTopVisibility);

updateFamilyAudioUI();
syncFamilyAudioState();
handleToTopVisibility();
