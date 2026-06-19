import { forwardRef } from 'react';
import { SummernoteEditor, type SummernoteEditorHandle, type SummernoteEditorProps } from '@eaeao/summernote-react';
import { useColorScheme } from './useColorScheme';

/**
 * A <SummernoteEditor> that follows the demo's light/dark theme toggle by default, so the editors
 * switch with the site. An explicit `colorScheme` prop (e.g. the Dark mode example's own toggle)
 * still wins, since props are spread after the default.
 */
export const DemoEditor = forwardRef<SummernoteEditorHandle, SummernoteEditorProps>(function DemoEditor(props, ref) {
  const scheme = useColorScheme();
  return <SummernoteEditor ref={ref} colorScheme={scheme} {...props} />;
});
