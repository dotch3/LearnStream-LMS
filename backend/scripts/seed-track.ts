/**
 * seed-track.ts
 * Creates a track and bulk-imports videos from YouTube links.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-track.ts
 *
 * Required env vars (in backend/.env):
 *   YOUTUBE_API_KEY=   — Google Data API v3 key (free tier)
 *   SEED_ADMIN_EMAIL=  — admin email created during setup
 *   SEED_ADMIN_PASS=   — admin password
 *   API_URL=           — defaults to http://localhost:3000
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Config ──────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3001';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? '';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? '';
const ADMIN_PASS = process.env.SEED_ADMIN_PASS ?? '';

// ─── Track definition ────────────────────────────────────────────────────────

const TRACK = {
  name: 'Curso de Líderes 011church',
  description: 'Formação de líderes da 011 Church.',
  order: 1,
};

const VIDEOS = [
  { order: 1,  title: 'Aula 1',  url: 'https://youtu.be/pTJaacq5YWQ' },
  { order: 2,  title: 'Aula 2',  url: 'https://youtu.be/JWkDz9_xV5s' },
  { order: 3,  title: 'Aula 3',  url: 'https://youtu.be/uIHm20HWrGE' },
  { order: 4,  title: 'Aula 4',  url: 'https://youtu.be/LqsTrOAQaSQ' },
  { order: 5,  title: 'Aula 5',  url: 'https://youtu.be/k1JDcVcIs2U' },
  { order: 6,  title: 'Aula 6',  url: 'https://youtu.be/-lljox48aaY' },
  { order: 7,  title: 'Aula 7',  url: 'https://youtu.be/bArtht0zgy8' },
  { order: 8,  title: 'Aula 8',  url: 'https://youtu.be/TTq5L2mh75A' },
  { order: 9,  title: 'Aula 9',  url: 'https://youtu.be/_gsKoTjNeGc' },
  { order: 10, title: 'Aula 10', url: 'https://youtu.be/KqJele7Zpis' },
  { order: 11, title: 'Aula 11', url: 'https://youtu.be/-Nu6leXII4g' },
  { order: 12, title: 'Aula 12', url: 'https://youtu.be/KEeHB7VeZrk' },
  { order: 13, title: 'Aula 13', url: 'https://youtu.be/eAsW9zxtSuk' },
  { order: 14, title: 'Aula 14', url: 'https://youtu.be/Jt1_9bKqzUE' },
  { order: 15, title: 'Aula 15', url: 'https://youtu.be/Sfw4Dd8rWv0' },
  { order: 16, title: 'Aula 16', url: 'https://youtu.be/d0holGWH7Xs' },
  { order: 17, title: 'Aula 17', url: 'https://youtu.be/ZmZsk3dWNU4' },
  { order: 18, title: 'Aula 18', url: 'https://youtu.be/chslhBkGFwQ' },
  { order: 19, title: 'Aula 19', url: 'https://youtu.be/vipVNB0Hu2Y' },
  { order: 20, title: 'Aula 20', url: 'https://youtu.be/pcAZ_ETQC-Y' },
  { order: 21, title: 'Aula 21', url: 'https://youtu.be/9C69iV0Azko' },
  { order: 22, title: 'Aula 22', url: 'https://youtu.be/PkF6vDDxEbY' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractYoutubeId(url: string): string {
  // Handles: youtu.be/ID  |  youtube.com/watch?v=ID  |  youtube.com/embed/ID
  const patterns = [
    /youtu\.be\/([^?&\s]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  throw new Error(`Cannot extract YouTube ID from: ${url}`);
}

/** Parse ISO 8601 duration (PT1H2M3S) → seconds */
function iso8601ToSeconds(duration: string): number {
  const m = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0') * 3600) +
         (parseInt(m[2] ?? '0') * 60) +
         parseInt(m[3] ?? '0');
}

async function getYoutubeDurations(ids: string[]): Promise<Map<string, number>> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠  YOUTUBE_API_KEY not set — using placeholder duration of 3600s');
    return new Map(ids.map((id) => [id, 3600]));
  }

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));

  const result = new Map<string, number>();

  for (const chunk of chunks) {
    const qs = new URLSearchParams({
      part: 'contentDetails',
      id: chunk.join(','),
      key: YOUTUBE_API_KEY,
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      items: { id: string; contentDetails: { duration: string } }[];
    };
    for (const item of data.items) {
      result.set(item.id, iso8601ToSeconds(item.contentDetails.duration));
    }
  }

  return result;
}

async function login(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function createTrack(token: string, track: typeof TRACK): Promise<string> {
  const res = await fetch(`${API_URL}/api/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(track),
  });
  if (!res.ok) throw new Error(`Create track failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function createVideo(
  token: string,
  payload: { title: string; youtubeUrl: string; duration: number; trackId: string; order: number },
): Promise<void> {
  const res = await fetch(`${API_URL}/api/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create video "${payload.title}" failed (${res.status}): ${await res.text()}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔑  Logging in...');
  const token = await login();
  console.log('✅  Authenticated\n');

  console.log('🎬  Fetching durations from YouTube...');
  const ids = VIDEOS.map((v) => extractYoutubeId(v.url));
  const durations = await getYoutubeDurations(ids);
  console.log(`✅  Got durations for ${durations.size} videos\n`);

  console.log(`📚  Creating track "${TRACK.name}"...`);
  const trackId = await createTrack(token, TRACK);
  console.log(`✅  Track created: ${trackId}\n`);

  console.log('🎥  Importing videos...');
  for (const video of VIDEOS) {
    const youtubeId = extractYoutubeId(video.url);
    const duration = durations.get(youtubeId) ?? 3600;
    await createVideo(token, {
      title: video.title,
      youtubeUrl: video.url,
      duration,
      trackId,
      order: video.order,
    });
    console.log(`  ✅  ${video.title} (${duration}s)`);
  }

  console.log(`\n🎉  Done! Track "${TRACK.name}" with ${VIDEOS.length} videos created.`);
}

main().catch((err) => {
  console.error('\n❌  Error:', err.message);
  process.exit(1);
});
