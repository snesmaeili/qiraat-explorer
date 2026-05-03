import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerseDisplay } from '../src/components/VerseDisplay.jsx';
import { Legend } from '../src/components/Legend.jsx';
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
