import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerseDisplay } from '../src/components/VerseDisplay.jsx';
import { Legend } from '../src/components/Legend.jsx';
import { MorphologyBrowser } from '../src/components/MorphologyBrowser.jsx';
import { ManuscriptTimeline } from '../src/components/ManuscriptTimeline.jsx';
import { getAyah, getRiwayah } from '../src/lib/dataLoader.js';
import { diffByCuratedVariants } from '../src/lib/diff.js';

describe('<VerseDisplay>', () => {
  it('renders the base verse text and highlights the variant word', () => {
    const ayah = getAyah(1, 4);
    const wordDiffs = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    render(
      <VerseDisplay
        ayahData={ayah}
        surah={1}
        ayah={4}
        surahMeta={{ name: 'Al-Fatiha', number: 1, ayahCount: 7 }}
        wordDiffs={wordDiffs}
        baseRiwayah={getRiwayah('hafs')}
        compRiwayah={getRiwayah('warsh')}
      />
    );
    expect(screen.getByText('مَٰلِكِ')).toBeInTheDocument();
    expect(screen.getByText('يَوْمِ')).toBeInTheDocument();
    expect(screen.getByText('ٱلدِّينِ')).toBeInTheDocument();
    expect(screen.getByText('مَٰلِكِ')).toHaveAttribute('role', 'button');
    expect(screen.getByText('يَوْمِ')).not.toHaveAttribute('role', 'button');
  });

  it('opens the variant panel on click and shows base + comparison forms with source attribution', () => {
    const ayah = getAyah(2, 9);
    const wordDiffs = diffByCuratedVariants(ayah, 'hafs', 'warsh');
    render(
      <VerseDisplay
        ayahData={ayah}
        surah={2}
        ayah={9}
        surahMeta={{ name: 'Al-Baqara', number: 2, ayahCount: 286 }}
        wordDiffs={wordDiffs}
        baseRiwayah={getRiwayah('hafs')}
        compRiwayah={getRiwayah('warsh')}
      />
    );
    fireEvent.click(screen.getByText('يَخْدَعُونَ'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('يَخْدَعُونَ');
    expect(dialog).toHaveTextContent('يُخَٰدِعُونَ');
    expect(dialog).toHaveTextContent(/word-form/i);
    expect(dialog).toHaveTextContent(/Curated sample/i);
    // CC attestations overlay (CC BY-SA 4.0, sourced from
    // src/data/ccVariants.json) renders as a collapsible details element.
    // Q 2:9 word 5 (يَخْدَعُونَ) has CC entries — assert the summary
    // header is present.
    expect(dialog).toHaveTextContent(/Corpus Coranicum attestations/i);

    // Audio play buttons render for both rows (Hafs + Warsh both have
    // EveryAyah reciters configured in src/data/audioReciters.json).
    // We don't assert real playback (jsdom lacks HTMLAudioElement support);
    // we just check the button is enabled and has a constructed data-src.
    const playButtons = dialog.querySelectorAll('button.tooltip__audio-btn');
    expect(playButtons.length).toBeGreaterThanOrEqual(2);
    const enabledButtons = Array.from(playButtons).filter(
      (b) => !b.classList.contains('is-disabled') && b.hasAttribute('data-src'),
    );
    expect(enabledButtons.length).toBeGreaterThanOrEqual(2);
    // Exactly one of the constructed URLs should target the warsh CDN path.
    const srcs = enabledButtons.map((b) => b.getAttribute('data-src'));
    expect(srcs.some((s) => /everyayah\.com\/data\/Husary_128kbps/.test(s))).toBe(true);
    expect(srcs.some((s) => /everyayah\.com\/data\/warsh\//.test(s))).toBe(true);
  });

  it('shows an empty-state when no ayah data is available', () => {
    render(
      <VerseDisplay
        ayahData={null}
        surah={114}
        ayah={6}
        surahMeta={{ name: 'An-Nas', number: 114, ayahCount: 6 }}
        wordDiffs={[]}
        baseRiwayah={getRiwayah('hafs')}
        compRiwayah={getRiwayah('warsh')}
      />
    );
    expect(screen.getByText(/No data for 114:6/)).toBeInTheDocument();
  });
});

describe('<Legend>', () => {
  it('renders the documented categories', () => {
    render(<Legend />);
    expect(screen.getByText('Vocalization')).toBeInTheDocument();
    expect(screen.getByText('Consonantal (rasm)')).toBeInTheDocument();
    expect(screen.getByText('Word-form')).toBeInTheDocument();
    expect(screen.getByText('Orthographic')).toBeInTheDocument();
    expect(screen.getByText('Verse numbering')).toBeInTheDocument();
  });
});

describe('<MorphologyBrowser>', () => {
  it('renders morphology comparisons for sample-backed verses', () => {
    render(<MorphologyBrowser surah={1} ayah={4} ayahData={getAyah(1, 4)} />);
    expect(screen.getByText('Morphological Analysis')).toBeInTheDocument();
    expect(screen.getAllByText('QAC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Talmon').length).toBeGreaterThan(0);
  });

  it('renders an empty state when the selected verse has no morphology sample', () => {
    render(<MorphologyBrowser surah={1} ayah={6} ayahData={getAyah(1, 6)} />);
    expect(screen.getByText(/No morphology comparison is available/)).toBeInTheDocument();
  });
});

describe('<ManuscriptTimeline>', () => {
  it('renders dated manuscript records, filters, and the selected detail panel', () => {
    render(<ManuscriptTimeline />);
    expect(screen.getByText("Early Qur'anic Manuscripts")).toBeInTheDocument();

    // Filter controls render: date sliders + repository pills.
    expect(screen.getByLabelText(/Earliest year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Latest year/i)).toBeInTheDocument();
    expect(screen.getByText(/All repositories/i)).toBeInTheDocument();

    // BL Or. 2165 was already featured before the famous-shelfmark fallback
    // injection (centerYear 700 CE).
    expect(screen.getAllByText('Or. 2165').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Date range:/).length).toBeGreaterThan(0);

    // FAMOUS_SHELFMARKS now surfaces codices CC's TEI lacks imageUrls for.
    // Birmingham (Mingana Islamic Arabic 1572a) and at least one Sanaa
    // palimpsest fragment (DAM 01-*) must now appear in the timeline list.
    expect(screen.getAllByText(/Islamic Arabic 1572a/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^DAM 01-/).length).toBeGreaterThan(0);
  });
});
