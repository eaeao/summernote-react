export interface CodeviewProps {
  value: string;
  onChange: (html: string) => void;
}

/**
 * Codeview textarea (the lite `codable`). Shows raw HTML for direct editing; SummernoteEditor
 * syncs it back into the engine when codeview is toggled off. Preserves the .note-codable class.
 *
 * NOTE: the codeviewFilter/codeviewIframeFilter XSS purification (security-sensitive) is applied
 * at sync time when those options are enabled — a follow-up; the default (no filter) matches the
 * legacy default.
 */
export function Codeview({ value, onChange }: CodeviewProps): JSX.Element {
  return (
    <textarea
      className="note-codable"
      aria-label="Code View"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
    />
  );
}
