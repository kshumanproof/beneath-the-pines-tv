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
const trailerFrame = document.getElementById('trailerFrame');

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

function openTrailerModal() {
  closeMobileMenu();

  if (familyAudio && !familyAudio.paused) {
    familyAudio.pause();
    updateFamilyAudioUI();
  }

  if (typeof TRAILER_VIMEO_ID === 'undefined' || !TRAILER_VIMEO_ID || !trailerFrame || !trailerModal) {
    alert('Trailer coming soon.');
    return;
  }

  trailerModal.classList.remove('hidden');
  trailerModal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  handleToTopVisibility();

  // Set the source on open so the Vimeo player isn't loaded on every page view,
  // and so closing the modal actually stops playback.
  trailerFrame.src = 'https://player.vimeo.com/video/' + TRAILER_VIMEO_ID +
    '?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
}

function closeTrailerModal() {
  if (!trailerModal) return;

  trailerModal.classList.add('hidden');
  trailerModal.classList.remove('flex');

  if (trailerFrame) {
    trailerFrame.removeAttribute('src');
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
