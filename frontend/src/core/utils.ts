// src/core/utils.ts

export const formatMs = (v?: number | string) => {
  if (v === undefined || v === null || v === '' || !Number.isFinite(Number(v))) {
    return '—';
  }
  const n = Number(v);
  const centiseconds = Math.floor((n % 1000) / 10);
  const totalSeconds = Math.floor(n / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const formattedMinutes = minutes > 0 ? `${minutes}:` : '';
  const formattedSeconds = minutes > 0 ? String(seconds).padStart(2, '0') : String(seconds);
  const formattedCentiseconds = String(centiseconds).padStart(2, '0');

  return `${formattedMinutes}${formattedSeconds};${formattedCentiseconds}`;
};
