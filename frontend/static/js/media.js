/**
 * Handles decorative background videos (e.g. the navy panel on
 * login/register). Any <video> with a `data-loop-seconds` attribute
 * will automatically restart once it reaches that timestamp — useful
 * if your source file is longer than the loop you actually want
 * (e.g. a 30s clip but you only want the first 10s to loop).
 *
 * If your video file is ALREADY trimmed to exactly the loop length you
 * want, this is a harmless no-op safety net — the native `loop`
 * attribute on the <video> tag handles the repeat either way.
 */
function initLoopVideos() {
  document.querySelectorAll("video[data-loop-seconds]").forEach((video) => {
    const maxSeconds = parseFloat(video.dataset.loopSeconds);
    if (!maxSeconds || Number.isNaN(maxSeconds)) return;

    video.addEventListener("timeupdate", () => {
      if (video.currentTime >= maxSeconds) {
        video.currentTime = 0;
      }
    });

    // Some mobile browsers block autoplay until a user gesture even when
    // muted; this retries playback on first tap/click anywhere on the page.
    video.play().catch(() => {
      const resume = () => {
        video.play().catch(() => {});
        document.removeEventListener("click", resume);
      };
      document.addEventListener("click", resume, { once: true });
    });
  });
}

document.addEventListener("DOMContentLoaded", initLoopVideos);
