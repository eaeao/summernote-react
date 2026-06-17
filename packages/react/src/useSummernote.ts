import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type MutableRefObject,
} from 'react';
import {
  createEditorCore,
  type EditorCore,
  type EditorCoreOptions,
  type EditorState,
} from '@eaeao4jerry/summernote-core';

const INERT_STATE: EditorState = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  superscript: false,
  subscript: false,
  orderedList: false,
  unorderedList: false,
  align: null,
  formatBlock: null,
  link: false,
  inTable: false,
  fontName: '',
  fontSize: '',
  fontSizeUnit: 'px',
  lineHeight: '',
  canUndo: false,
  canRedo: false,
  isComposing: false,
};

export interface UseSummernoteResult {
  /** attach to the `.note-editable` div — the engine owns this subtree imperatively. */
  editableRef: MutableRefObject<HTMLDivElement | null>;
  core: EditorCore | null;
  state: EditorState;
}

/**
 * Mounts an EditorCore on an uncontrolled editable ref (client-only, StrictMode-idempotent)
 * and bridges its state into React via useSyncExternalStore — chrome re-renders on state
 * change while the editable DOM is never reconciled by React.
 */
export function useSummernote(options: EditorCoreOptions = {}): UseSummernoteResult {
  const editableRef = useRef<HTMLDivElement | null>(null);
  const [core, setCore] = useState<EditorCore | null>(null);

  // latest callbacks/options without remounting the engine
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useLayoutEffect(() => {
    const el = editableRef.current;
    if (!el) {
      return undefined;
    }
    const instance = createEditorCore(el, {
      ...optionsRef.current,
      onChange: (html: string): void => optionsRef.current.onChange?.(html),
    });
    setCore(instance);
    return (): void => {
      instance.destroy();
      setCore(null);
    };
    // mount-once; option changes flow through optionsRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => (core ? core.subscribe(onStoreChange) : () => undefined),
    [core],
  );
  const getSnapshot = useCallback((): EditorState => (core ? core.getSnapshot() : INERT_STATE), [core]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => INERT_STATE);

  return { editableRef, core, state };
}
