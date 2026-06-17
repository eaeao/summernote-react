export interface PlaceholderProps {
  text: string;
  visible: boolean;
}

/** Placeholder overlay shown over an empty editable (the lite .note-placeholder). */
export function Placeholder({ text, visible }: PlaceholderProps): JSX.Element | null {
  if (!visible) {
    return null;
  }
  return (
    <div className="note-placeholder" style={{ display: 'block' }}>
      {text}
    </div>
  );
}
