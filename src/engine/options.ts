/**
 * Default options as framework-agnostic data — the single source of truth for the chrome.
 * The React chrome (toolbar/dropdowns/dialogs/popovers) reads these; new options are added here.
 * Icons are the shared `note-icon-*` set used by every theme.
 */

export type ToolbarGroup = readonly [string, readonly string[]];

export interface PopoverConfig {
  readonly image: readonly ToolbarGroup[];
  readonly link: readonly ToolbarGroup[];
  readonly table: readonly ToolbarGroup[];
  readonly air: readonly ToolbarGroup[];
}

export interface KeyMap {
  readonly pc: Readonly<Record<string, string>>;
  readonly mac: Readonly<Record<string, string>>;
}

export const defaultOptions = {
  toolbar: [
    ['style', ['style', 'fontsize', 'height']],
    ['font', ['bold', 'underline', 'clear']],
    ['fontname', ['fontname']],
    ['color', ['color']],
    ['para', ['ul', 'ol', 'paragraph']],
    ['table', ['table']],
    ['insert', ['link', 'picture', 'video']],
    ['view', ['fullscreen', 'codeview', 'help']],
  ] as readonly ToolbarGroup[],

  popover: {
    image: [
      ['resize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
      ['float', ['floatLeft', 'floatRight', 'floatNone']],
      ['remove', ['removeMedia']],
    ],
    link: [['link', ['linkDialogShow', 'unlink']]],
    table: [
      ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
      ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
    ],
    air: [
      ['color', ['color']],
      ['font', ['bold', 'underline', 'clear']],
      ['para', ['ul', 'paragraph']],
      ['table', ['table']],
      ['insert', ['link', 'picture']],
      ['view', ['fullscreen', 'codeview']],
    ],
  } as PopoverConfig,

  styleTags: ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

  fontNames: [
    '굴림',
    '굴림체',
    '궁서',
    '궁서체',
    '돋움',
    '돋움체',
    '맑은 고딕',
    '바탕',
    '바탕체',
    'Arial',
    'Inter',
    'Tahoma',
    'Times New Roman',
    'Verdana',
    'Noto Sans KR',
  ],
  fontNamesIgnoreCheck: [] as readonly string[],
  addDefaultFonts: true,

  fontSizes: ['8', '9', '10', '11', '12', '14', '18', '24', '36'],
  fontSizeUnits: ['px', 'pt'],

  colors: [
    ['#000000', '#424242', '#636363', '#9C9C94', '#CEC6CE', '#EFEFEF', '#F7F7F7', '#FFFFFF'],
    ['#FF0000', '#FF9C00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#9C00FF', '#FF00FF'],
    ['#F7C6CE', '#FFE7CE', '#FFEFC6', '#D6EFD6', '#CEDEE7', '#CEE7F7', '#D6D6E7', '#E7D6DE'],
    ['#E79C9C', '#FFC69C', '#FFE79C', '#B5D6A5', '#A5C6CE', '#9CC6EF', '#B5A5D6', '#D6A5BD'],
    ['#E76363', '#F7AD6B', '#FFD663', '#94BD7B', '#73A5AD', '#6BADDE', '#8C7BC6', '#C67BA5'],
    ['#CE0000', '#E79439', '#EFC631', '#6BA54A', '#4A7B8C', '#3984C6', '#634AA5', '#A54A7B'],
    ['#9C0000', '#B56308', '#BD9400', '#397B21', '#104A5A', '#085294', '#311873', '#731842'],
    ['#630000', '#7B3900', '#846300', '#295218', '#083139', '#003163', '#21104A', '#4A1031'],
  ] as readonly (readonly string[])[],

  colorsName: [
    ['Black', 'Tundora', 'Dove Gray', 'Star Dust', 'Pale Slate', 'Gallery', 'Alabaster', 'White'],
    ['Red', 'Orange Peel', 'Yellow', 'Green', 'Cyan', 'Blue', 'Electric Violet', 'Magenta'],
    ['Azalea', 'Karry', 'Egg White', 'Zanah', 'Botticelli', 'Tropical Blue', 'Mischka', 'Twilight'],
    ['Tonys Pink', 'Peach Orange', 'Cream Brulee', 'Sprout', 'Casper', 'Perano', 'Cold Purple', 'Careys Pink'],
    ['Mandy', 'Rajah', 'Dandelion', 'Olivine', 'Gulf Stream', 'Viking', 'Blue Marguerite', 'Puce'],
    ['Guardsman Red', 'Fire Bush', 'Golden Dream', 'Chelsea Cucumber', 'Smalt Blue', 'Boston Blue', 'Butterfly Bush', 'Cadillac'],
    ['Sangria', 'Mai Tai', 'Buddha Gold', 'Forest Green', 'Eden', 'Venice Blue', 'Meteorite', 'Claret'],
    ['Rosewood', 'Cinnamon', 'Olive', 'Parsley', 'Tiber', 'Midnight Blue', 'Valentino', 'Loulou'],
  ] as readonly (readonly string[])[],

  colorButton: { foreColor: '#000000', backColor: '#FFFF00' },

  lineHeights: ['1.0', '1.2', '1.4', '1.5', '1.6', '1.8', '2.0', '3.0'],

  tableClassName: 'table table-bordered',
  insertTableMaxSize: { col: 10, row: 10 },

  tooltip: 'auto' as string | boolean,
  shortcuts: true,

  keyMap: {
    pc: {
      ESC: 'escape',
      ENTER: 'insertParagraph',
      'CTRL+Z': 'undo',
      'CTRL+Y': 'redo',
      TAB: 'tab',
      'SHIFT+TAB': 'untab',
      'CTRL+B': 'bold',
      'CTRL+I': 'italic',
      'CTRL+U': 'underline',
      'CTRL+SHIFT+S': 'strikethrough',
      'CTRL+BACKSLASH': 'removeFormat',
      'CTRL+SHIFT+L': 'justifyLeft',
      'CTRL+SHIFT+E': 'justifyCenter',
      'CTRL+SHIFT+R': 'justifyRight',
      'CTRL+SHIFT+J': 'justifyFull',
      'CTRL+SHIFT+NUM7': 'insertUnorderedList',
      'CTRL+SHIFT+NUM8': 'insertOrderedList',
      'CTRL+LEFTBRACKET': 'outdent',
      'CTRL+RIGHTBRACKET': 'indent',
      'CTRL+NUM0': 'formatPara',
      'CTRL+NUM1': 'formatH1',
      'CTRL+NUM2': 'formatH2',
      'CTRL+NUM3': 'formatH3',
      'CTRL+NUM4': 'formatH4',
      'CTRL+NUM5': 'formatH5',
      'CTRL+NUM6': 'formatH6',
      'CTRL+ENTER': 'insertHorizontalRule',
      'CTRL+K': 'linkDialog.show',
    },
    mac: {
      ESC: 'escape',
      ENTER: 'insertParagraph',
      'CMD+Z': 'undo',
      'CMD+SHIFT+Z': 'redo',
      TAB: 'tab',
      'SHIFT+TAB': 'untab',
      'CMD+B': 'bold',
      'CMD+I': 'italic',
      'CMD+U': 'underline',
      'CMD+SHIFT+S': 'strikethrough',
      'CMD+BACKSLASH': 'removeFormat',
      'CMD+SHIFT+L': 'justifyLeft',
      'CMD+SHIFT+E': 'justifyCenter',
      'CMD+SHIFT+R': 'justifyRight',
      'CMD+SHIFT+J': 'justifyFull',
      'CMD+SHIFT+NUM7': 'insertUnorderedList',
      'CMD+SHIFT+NUM8': 'insertOrderedList',
      'CMD+LEFTBRACKET': 'outdent',
      'CMD+RIGHTBRACKET': 'indent',
      'CMD+NUM0': 'formatPara',
      'CMD+NUM1': 'formatH1',
      'CMD+NUM2': 'formatH2',
      'CMD+NUM3': 'formatH3',
      'CMD+NUM4': 'formatH4',
      'CMD+NUM5': 'formatH5',
      'CMD+NUM6': 'formatH6',
      'CMD+ENTER': 'insertHorizontalRule',
      'CMD+K': 'linkDialog.show',
    },
  } as KeyMap,

  icons: {
    align: 'note-icon-align',
    alignCenter: 'note-icon-align-center',
    alignJustify: 'note-icon-align-justify',
    alignLeft: 'note-icon-align-left',
    alignRight: 'note-icon-align-right',
    rowBelow: 'note-icon-row-below',
    colBefore: 'note-icon-col-before',
    colAfter: 'note-icon-col-after',
    rowAbove: 'note-icon-row-above',
    rowRemove: 'note-icon-row-remove',
    colRemove: 'note-icon-col-remove',
    indent: 'note-icon-align-indent',
    outdent: 'note-icon-align-outdent',
    arrowsAlt: 'note-icon-arrows-alt',
    bold: 'note-icon-bold',
    caret: 'note-icon-caret',
    circle: 'note-icon-circle',
    close: 'note-icon-close',
    code: 'note-icon-code',
    eraser: 'note-icon-eraser',
    floatLeft: 'note-icon-float-left',
    floatRight: 'note-icon-float-right',
    font: 'note-icon-font',
    frame: 'note-icon-frame',
    italic: 'note-icon-italic',
    link: 'note-icon-link',
    unlink: 'note-icon-chain-broken',
    magic: 'note-icon-magic',
    menuCheck: 'note-icon-menu-check',
    minus: 'note-icon-minus',
    orderedlist: 'note-icon-orderedlist',
    pencil: 'note-icon-pencil',
    picture: 'note-icon-picture',
    question: 'note-icon-question',
    redo: 'note-icon-redo',
    rollback: 'note-icon-rollback',
    square: 'note-icon-square',
    strikethrough: 'note-icon-strikethrough',
    subscript: 'note-icon-subscript',
    superscript: 'note-icon-superscript',
    table: 'note-icon-table',
    textHeight: 'note-icon-text-height',
    trash: 'note-icon-trash',
    underline: 'note-icon-underline',
    undo: 'note-icon-undo',
    unorderedlist: 'note-icon-unorderedlist',
    video: 'note-icon-video',
  },
};

export type Icons = typeof defaultOptions.icons;
