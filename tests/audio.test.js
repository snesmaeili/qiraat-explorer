import { describe, it, expect } from 'vitest';
import {
  audioUrl,
  audioUrlInfo,
  firstAvailableReciter,
  recitersFor,
  audioSourceFor,
  AUDIO_SOURCES,
} from '../src/lib/audio.js';

describe('audio URL builder', () => {
  it('builds verse-level EveryAyah URLs for the preferred Hafs reciter', () => {
    const reciter = firstAvailableReciter('hafs');
    expect(reciter).toBeTruthy();
    expect(reciter.source).toBe('everyayah');
    const info = audioUrlInfo(reciter, 1, 4);
    expect(info?.granularity).toBe('ayah');
    expect(info?.url).toBe('https://everyayah.com/data/Husary_128kbps/001004.mp3');
  });

  it('builds verse-level EveryAyah URLs for the preferred Warsh reciter', () => {
    const reciter = firstAvailableReciter('warsh');
    expect(reciter).toBeTruthy();
    expect(reciter.source).toBe('everyayah');
    const info = audioUrlInfo(reciter, 2, 9);
    expect(info?.granularity).toBe('ayah');
    expect(info?.url).toMatch(/^https:\/\/everyayah\.com\/data\/warsh\/.+\/002009\.mp3$/);
  });

  it('builds surah-level MP3Quran URLs for the preferred Qālūn reciter', () => {
    const reciter = firstAvailableReciter('qalun');
    expect(reciter).toBeTruthy();
    expect(reciter.source).toBe('mp3quran');
    expect(reciter.audioGranularity).toBe('surah');
    const info = audioUrlInfo(reciter, 2, 9);
    expect(info?.granularity).toBe('surah');
    expect(info?.url).toBe('https://server13.mp3quran.net/husr/Rewayat-Qalon-A-n-Nafi/002.mp3');
    // Surah-level URL ignores the ayah parameter (still resolves the same).
    const info2 = audioUrlInfo(reciter, 2, 999);
    expect(info2?.url).toBe(info?.url);
  });

  it('returns null for riwāyas with no configured reciter', () => {
    expect(firstAvailableReciter('duri')).toBeNull();
    expect(firstAvailableReciter('susi')).toBeNull();
    expect(audioUrl('nonexistent', 1, 1)).toBeNull();
  });

  it('lists all reciters for a given riwāya, sorted by usability', () => {
    const hafs = recitersFor('hafs');
    expect(hafs.length).toBeGreaterThanOrEqual(4);
    expect(hafs.every((r) => r.riwayah === 'hafs')).toBe(true);
    const qalun = recitersFor('qalun');
    expect(qalun.length).toBeGreaterThanOrEqual(2);
    expect(qalun.every((r) => r.riwayah === 'qalun')).toBe(true);
  });

  it('exposes per-source attribution metadata', () => {
    const reciter = firstAvailableReciter('hafs');
    const meta = audioSourceFor(reciter);
    expect(meta.label).toBe('EveryAyah.com');
    const qalunReciter = firstAvailableReciter('qalun');
    const qalunMeta = audioSourceFor(qalunReciter);
    expect(qalunMeta.label).toBe('MP3Quran.net');
    expect(AUDIO_SOURCES.everyayah.audioGranularity).toBe('ayah');
    expect(AUDIO_SOURCES.mp3quran.audioGranularity).toBe('surah');
  });
});
