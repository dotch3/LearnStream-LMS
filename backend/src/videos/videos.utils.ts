export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&\s]{11})/,
    /youtu\.be\/([^?&\s]{11})/,
    /embed\/([^?&\s]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
