import { cva } from 'class-variance-authority';

const appShellClassNames = {
  appRoot: 'relative z-[1] min-h-[var(--app-height)] w-full',
  bodyBleed: 'relative overflow-x-hidden min-h-[var(--app-height)] bg-canvas',
  hudRoot: 'pointer-events-none relative z-[1] h-[var(--app-height)]',
  main: 'relative min-h-[var(--app-height)]',
  sceneRoot:
    'absolute inset-x-0 top-[var(--scene-cover-offset)] z-0 h-[var(--scene-cover-height)] overflow-hidden bg-canvas',
  sceneShell: 'sticky top-0 h-[var(--scene-cover-height)] overflow-visible'
} as const;

const surfaceClassNames = {
  floating: 'rounded-full border border-outline/18 bg-surface/84 text-ink shadow-panel backdrop-blur-[16px]',
  infoField: 'rounded-control border border-ink-muted/8 bg-ink/3',
  panel: 'rounded-panel border border-outline/16 bg-surface/76 shadow-panel backdrop-blur-[14px]',
  popover: 'rounded-control border border-ink-muted/12 bg-surface/96 text-ink shadow-panel backdrop-blur-[18px]',
  subtle: 'rounded-control border border-ink-muted/8 bg-ink/3'
} as const;

const scrollAreaClassNames = {
  thin:
    'overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(168,201,125,0.28)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand/24'
} as const;

const textClassNames = {
  badge: 'text-[9px] uppercase tracking-[0.04em]',
  mutedBody: 'text-ui-sm leading-[1.6] text-ink-muted/72',
  title: 'text-ui-title leading-[1.1] tracking-[-0.04em]'
} as const;

const inspectorSectionClassNames = {
  body: 'px-0 pt-1.5 pb-3 max-[760px]:pt-1 max-[760px]:pb-[0.9rem]',
  root:
    'w-full py-1.5 px-[var(--rail-content-pad)] max-[760px]:px-[0.95rem]',
  summary:
    'ml-auto min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-ink-muted/66 max-[760px]:text-[var(--type-mobile-summary)]',
  title:
    'text-[10px] uppercase tracking-[0.18em] text-brand/88 max-[760px]:text-[var(--type-mobile-section-label)]',
  trigger:
    'flex w-full items-center justify-between gap-3 border-0 bg-transparent px-0 py-2.5 text-left text-ink opacity-95 transition-[opacity,transform] duration-180 ease-out max-[760px]:gap-3 max-[760px]:py-[0.85rem]',
  triggerIcon:
    'shrink-0 text-[14px] leading-none text-ink-muted/58 transition-colors max-[760px]:text-[16px]'
} as const;

const itemCardTextClassNames = {
  body:
    'mt-1 block text-[10px] leading-[1.5] text-ink-muted/72 max-[760px]:text-[var(--type-mobile-body)] max-[760px]:leading-[1.55]',
  line: 'grid gap-[3px]',
  meta:
    'm-0 text-[9px] tracking-[0.04em] text-ink-muted/46 max-[760px]:text-[var(--type-mobile-meta)]',
  title:
    'block text-[11.5px] font-semibold text-ink max-[760px]:text-[var(--type-mobile-title)] max-[760px]:leading-[1.28]'
} as const;

const sliderFieldClassNames = {
  description:
    'text-[10px] leading-[1.45] text-ink-muted/72 max-[760px]:text-[var(--type-mobile-body)] max-[760px]:leading-[1.55]',
  input: 'm-0 w-full cursor-ew-resize accent-brand',
  label:
    'text-[10px] uppercase tracking-[0.04em] text-ink-muted/58 max-[760px]:text-[var(--type-mobile-meta)]',
  root:
    `${surfaceClassNames.subtle} grid gap-2 px-3 py-2.5 max-[760px]:px-[0.9rem] max-[760px]:py-[0.85rem]`,
  value: 'text-ui-sm font-semibold text-brand-strong'
} as const;

const selectClassNames = {
  content: `${surfaceClassNames.popover} z-[20] min-w-[140px] overflow-hidden p-1 text-ui-xs`,
  item:
    'relative flex w-full cursor-pointer select-none items-center rounded-[10px] px-3 py-2 text-ui-xs outline-none data-[highlighted]:bg-brand/12 data-[highlighted]:text-brand-strong',
  trigger:
    'min-w-[104px] rounded-[10px] border border-ink-muted/12 bg-surface/82 px-2.5 py-1.5 text-ui-xs text-ink'
} as const;

const settingToggleClassNames = {
  body:
    'grid gap-0.5',
  description:
    'text-[10px] leading-[1.4] text-ink-muted/72 max-[760px]:text-[var(--type-mobile-body)] max-[760px]:leading-[1.55]',
  label:
    'text-[11px] font-semibold text-ink max-[760px]:text-[var(--type-mobile-title)] max-[760px]:leading-[1.28]',
  root:
    `mt-1 flex items-center justify-between gap-3 ${surfaceClassNames.subtle} px-3 py-2.5 max-[760px]:px-[0.9rem] max-[760px]:py-[0.85rem]`
} as const;

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full border text-ui-sm transition-[transform,border-color,background-color,color,opacity] duration-180 ease-out disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        floating: `${surfaceClassNames.floating} px-4 py-3`,
        ghost: 'border-transparent bg-transparent px-[13px] py-[9px] text-ink-muted/72 shadow-none',
        primary: 'border-transparent bg-brand px-[13px] py-[9px] text-[#2a221a]',
        secondary: 'border-outline/20 bg-ink/4 px-[13px] py-[9px] text-ink',
        tertiary: 'border-brand/22 bg-brand/8 px-[13px] py-[9px] text-brand-strong'
      }
    },
    defaultVariants: {
      variant: 'primary'
    }
  }
);

const badgeVariants = cva(textClassNames.badge, {
  variants: {
    variant: {
      default: 'bg-ink/6 text-ink-muted/74',
      muted: 'bg-[#7a583d]/42 text-ink-muted/82',
      success: 'bg-brand/88 text-success-ink'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

const itemCardButtonVariants = cva(
  'w-full rounded-control border text-left transition-[background-color,border-color,transform,box-shadow] duration-180 ease-out disabled:cursor-not-allowed disabled:opacity-55 max-[760px]:min-h-[52px]',
  {
    variants: {
      active: {
        false: 'border-ink-muted/8 bg-ink/3',
        true: 'border-brand/36 bg-brand/12'
      },
      density: {
        compact: 'px-2.5 py-2',
        regular: 'px-3 py-2.5'
      },
      running: {
        false: '',
        true: 'border-brand-strong/42 shadow-[inset_0_0_0_1px_rgba(199,227,158,0.18)]'
      }
    },
    compoundVariants: [
      {
        active: false,
        running: false,
        className: 'hover:-translate-y-px hover:border-brand/36 hover:bg-brand/12'
      }
    ],
    defaultVariants: {
      active: false,
      density: 'regular',
      running: false
    }
  }
);

const switchClassNames = {
  root:
    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-muted/12 bg-ink/6 transition-colors data-[state=checked]:bg-brand/22 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
  thumb:
    'pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-ink/88 shadow transition-transform data-[state=checked]:translate-x-[1.3rem]'
} as const;

export {
  appShellClassNames,
  badgeVariants,
  buttonVariants,
  inspectorSectionClassNames,
  itemCardButtonVariants,
  itemCardTextClassNames,
  selectClassNames,
  scrollAreaClassNames,
  settingToggleClassNames,
  sliderFieldClassNames,
  surfaceClassNames,
  switchClassNames,
  textClassNames
};
