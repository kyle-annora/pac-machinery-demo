/* Official PAC Machinery video, verified against the product gallery and
   YouTube oEmbed on 2026-11-07. Model: Rollbag R3200 Fulfillment.
   Source: https://www.pacmachinery.com/products/rollbag-r3200-fulfillment-automatic-bagger/
   Video: https://www.youtube.com/watch?v=ztBByFhJACA
   The poster is the existing catalog photograph; no YouTube request occurs
   until the visitor presses Play. */
const videoId = "ztBByFhJACA";
const watchURL = `https://www.youtube.com/watch?v=${videoId}`;

export function renderHomeVideo(posterMarkup) {
  return `<div class="feature-image home-video" data-home-video>
    <div class="home-video-stage">
      <div class="home-video-poster" data-video-poster>
        ${posterMarkup}
        <button class="home-video-play" type="button" data-video-play aria-controls="home-fulfillment-video-player" aria-expanded="false" aria-label="Play official PAC Machinery video: Rollbag R3200 Fulfillment — Poly Bag Prep">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6 3.5 16 10 6 16.5Z"/></svg>
          <span>Watch in action</span>
        </button>
      </div>
      <div class="home-video-player" id="home-fulfillment-video-player" data-video-player hidden></div>
    </div>
    <div class="home-video-caption">
      <span>Rollbag R3200 Fulfillment · Poly Bag Prep</span>
      <div class="home-video-links">
        <a href="${watchURL}" target="_blank" rel="noopener">Watch on YouTube <img class="icon" src="/website/assets/icons/external-link.svg" alt="" aria-hidden="true"></a>
        <button type="button" data-video-close hidden aria-label="Close video and restore the product photograph">Close video <img class="icon" src="/website/assets/icons/x.svg" alt="" aria-hidden="true"></button>
      </div>
    </div>
  </div>`;
}

export function mountHomeVideo({ document = globalThis.document } = {}) {
  const host = document.querySelector("[data-home-video]");
  if (!host) return () => {};
  const poster = host.querySelector("[data-video-poster]");
  const player = host.querySelector("[data-video-player]");
  const play = host.querySelector("[data-video-play]");
  const close = host.querySelector("[data-video-close]");
  let frame = null;

  const showVideo = () => {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.title = "PAC Machinery — Rollbag R3200 Fulfillment: Poly Bag Prep";
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    // Playback is initiated only by the visitor's explicit Play action.
    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
    player.replaceChildren(frame);
    poster.hidden = true;
    player.hidden = false;
    close.hidden = false;
    play.setAttribute("aria-expanded", "true");
    frame.focus({ preventScroll: true });
  };

  const restorePoster = (restoreFocus = true) => {
    player.replaceChildren();
    frame = null;
    player.hidden = true;
    poster.hidden = false;
    close.hidden = true;
    play.setAttribute("aria-expanded", "false");
    if (restoreFocus) play.focus({ preventScroll: true });
  };
  const closeVideo = () => restorePoster();
  play.addEventListener("click", showVideo);
  close.addEventListener("click", closeVideo);

  return () => {
    play.removeEventListener("click", showVideo);
    close.removeEventListener("click", closeVideo);
    restorePoster(false);
  };
}
