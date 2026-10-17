import './SoundToggle.css';

interface SoundToggleProps {
  muted: boolean;
  onToggle: () => void;
}

export default function SoundToggle({ muted, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? 'Turn notification sound on' : 'Turn notification sound off'}
      title={muted ? 'Sound off' : 'Sound on'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {muted ? (
          <>
            <path d="m16 9 5 6" />
            <path d="m21 9-5 6" />
          </>
        ) : (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        )}
      </svg>
    </button>
  );
}
