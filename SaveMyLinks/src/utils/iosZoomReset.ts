// src/utils/iosZoomReset.ts
export function resetIOSZoom() {
  if (typeof window === 'undefined') return;
  // Only run on iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  if (!isIOS) return;

  // Blur any focused input
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'auto' });

  // Force a layout reflow and zoom reset
  document.body.style.transform = 'scale(1)';
  setTimeout(() => {
    document.body.style.transform = '';
  }, 100);

  // Temporarily set maximum-scale=1 to force reset
  const viewport = document.querySelector('meta[name=viewport]');
  if (!viewport) return;
  const content = viewport.getAttribute('content');
  if (!content) return;
  viewport.setAttribute('content', content + ', maximum-scale=1');
  setTimeout(() => {
    viewport.setAttribute('content', content);
  }, 100);
} 