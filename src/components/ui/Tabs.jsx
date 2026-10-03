'use client';

import { createContext, useCallback, useContext, useId, useMemo, useRef } from 'react';

const TabsContext = createContext(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab must be rendered inside <Tabs>');
  return ctx;
}

const ORIENTATION_KEYS = {
  horizontal: { next: 'ArrowRight', prev: 'ArrowLeft' },
  vertical: { next: 'ArrowDown', prev: 'ArrowUp' },
};

const LAYOUT = {
  horizontal: 'flex flex-wrap gap-2',
  'horizontal-grid': '',
  vertical: 'flex flex-col gap-2',
};

/**
 * @param {{ value?: any, onChange?: (value: any) => void, label?: string,
 *   orientation?: string, layout?: string, className?: string,
 *   children?: import('react').ReactNode }} props
 */
export function Tabs({
  value,
  onChange,
  label,
  orientation = 'horizontal',
  layout,
  className = '',
  children,
}) {
  const baseId = useId();
  const tabRefs = useRef(new Map());

  const registerTab = useCallback((tabValue, node) => {
    if (node) tabRefs.current.set(tabValue, node);
    else tabRefs.current.delete(tabValue);
  }, []);

  const orderedValues = useMemo(() => {
    const arr = [];
    // children may include falsy / wrapping nodes; we only collect Tab.value props
    const walk = (nodes) => {
      const list = Array.isArray(nodes) ? nodes : [nodes];
      for (const n of list) {
        if (!n) continue;
        if (n.props?.value !== undefined && n.type?.__isTab) {
          arr.push(n.props.value);
        } else if (n.props?.children) {
          walk(n.props.children);
        }
      }
    };
    walk(children);
    return arr;
  }, [children]);

  const handleKeyDown = useCallback(
    (e) => {
      const keys = ORIENTATION_KEYS[orientation] || ORIENTATION_KEYS.horizontal;
      if (![keys.next, keys.prev, 'Home', 'End'].includes(e.key)) return;
      if (orderedValues.length === 0) return;
      e.preventDefault();
      const currentIdx = orderedValues.indexOf(value);
      let nextIdx = currentIdx;
      if (e.key === keys.next) nextIdx = (currentIdx + 1) % orderedValues.length;
      else if (e.key === keys.prev)
        nextIdx = (currentIdx - 1 + orderedValues.length) % orderedValues.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = orderedValues.length - 1;
      const nextValue = orderedValues[nextIdx];
      onChange?.(nextValue);
      // Focus the new tab after state updates
      requestAnimationFrame(() => {
        tabRefs.current.get(nextValue)?.focus();
      });
    },
    [orderedValues, orientation, value, onChange]
  );

  const ctx = useMemo(
    () => ({ value, onChange, baseId, registerTab, orientation }),
    [value, onChange, baseId, registerTab, orientation]
  );

  const layoutCls = layout
    ? layout // caller supplied a custom grid (e.g., the 8-col phase grid)
    : LAYOUT[orientation] || LAYOUT.horizontal;

  return (
    <TabsContext.Provider value={ctx}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={`${layoutCls} ${className}`}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

const PILL_STYLES = {
  active: 'bg-charcoal text-lime border-charcoal',
  inactive: 'bg-white text-charcoal border-muted/40 hover:border-lime',
};

const CARD_STYLES = {
  active: 'border-lime bg-charcoal text-white shadow-card',
  inactive: 'border-muted/30 bg-white hover:border-lime/50',
};

const VERTICAL_STYLES = {
  active: 'border-lime bg-lime/10',
  inactive: 'border-muted/30 hover:border-lime/40 bg-white',
};

const VARIANT_BASE = {
  pill: 'px-5 py-3 rounded-md font-semibold text-sm transition border-2',
  card: 'text-left p-3 rounded-md border transition',
  'card-lg': 'text-left p-4 rounded-md border-2 transition',
  vertical: 'w-full text-left p-4 rounded-md border-2 transition',
};

const VARIANT_STATES = {
  pill: PILL_STYLES,
  card: CARD_STYLES,
  'card-lg': CARD_STYLES,
  vertical: VERTICAL_STYLES,
};

/**
 * @param {{ value?: any, variant?: string, panelId?: string, className?: string,
 *   children?: import('react').ReactNode, onClick?: (e: any) => void,
 *   [prop: string]: any }} props
 */
export function Tab({
  value,
  variant = 'pill',
  panelId,
  className = '',
  children,
  onClick,
  ...rest
}) {
  const { value: active, onChange, baseId, registerTab } = useTabsContext();
  const isActive = active === value;
  const tabId = `${baseId}-tab-${String(value)}`;
  const base = VARIANT_BASE[variant] || VARIANT_BASE.pill;
  const states = VARIANT_STATES[variant] || VARIANT_STATES.pill;
  return (
    <button
      ref={(node) => registerTab(value, node)}
      role="tab"
      type="button"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={(e) => {
        onChange?.(value);
        onClick?.(e);
      }}
      className={`${base} ${isActive ? states.active : states.inactive} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 ${className}`}
      data-active={isActive ? 'true' : 'false'}
      {...rest}
    >
      {typeof children === 'function' ? children({ active: isActive }) : children}
    </button>
  );
}
// Tag so Tabs can identify Tab children for keyboard nav ordering
Tab.__isTab = true;
