import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

export type SortableValue = string | number | boolean | null | undefined;

export interface TableColumnDef<K extends string = string> {
  key: K;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  resizable?: boolean;
  /** Initial percentage or CSS width class (e.g. 'w-[24%]') used before manual resizing */
  widthClass?: string;
  /** Minimum pixel width enforced while dragging the column edge */
  minWidth?: number;
}

export function compareSortableValues(a: SortableValue, b: SortableValue): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K> | null,
  getValue: (row: T, key: K) => SortableValue
): T[] {
  if (!sort) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const valA = getValue(a, sort.key);
    const valB = getValue(b, sort.key);
    const aEmpty = valA === null || valA === undefined || valA === '';
    const bEmpty = valB === null || valB === undefined || valB === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    return compareSortableValues(valA, valB) * dir;
  });
}

interface ActiveResize {
  key: string;
  startX: number;
  startWidth: number;
  minWidth: number;
}

export function useInteractiveTable<K extends string>(
  columns: TableColumnDef<K>[],
  initialSort: SortState<K> | null = null
) {
  const [sort, setSort] = useState<SortState<K> | null>(initialSort);
  const [colWidths, setColWidths] = useState<Record<string, number> | null>(null);
  const [resizingKey, setResizingKey] = useState<string | null>(null);

  const tableRef = useRef<HTMLTableElement | null>(null);
  const activeResizeRef = useRef<ActiveResize | null>(null);

  const toggleSort = useCallback((key: K) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }, []);

  const resetWidths = useCallback(() => {
    setColWidths(null);
  }, []);

  const startResize = useCallback(
    (key: K, e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const table = tableRef.current;
      if (!table) return;

      const ths = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead tr:first-child th'));
      const snapshot: Record<string, number> = {};

      columns.forEach((col, idx) => {
        if (colWidths && colWidths[col.key]) {
          snapshot[col.key] = colWidths[col.key];
        } else if (ths[idx]) {
          snapshot[col.key] = Math.round(ths[idx].getBoundingClientRect().width);
        } else {
          snapshot[col.key] = col.minWidth ?? 120;
        }
      });

      const colDef = columns.find((c) => c.key === key);
      const startWidth = snapshot[key] ?? 140;
      const minWidth = colDef?.minWidth ?? 80;

      setColWidths(snapshot);
      setResizingKey(key);
      activeResizeRef.current = {
        key,
        startX: e.clientX,
        startWidth,
        minWidth,
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columns, colWidths]
  );

  useEffect(() => {
    if (!resizingKey) return;

    const handlePointerMove = (e: PointerEvent) => {
      const active = activeResizeRef.current;
      if (!active) return;
      const delta = e.clientX - active.startX;
      const nextWidth = Math.max(active.minWidth, Math.round(active.startWidth + delta));
      setColWidths((prev) => (prev ? { ...prev, [active.key]: nextWidth } : prev));
    };

    const handlePointerUp = () => {
      activeResizeRef.current = null;
      setResizingKey(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingKey]);

  const totalResizedWidth = useMemo(() => {
    if (!colWidths) return undefined;
    return columns.reduce((sum, col) => sum + (colWidths[col.key] ?? col.minWidth ?? 120), 0);
  }, [colWidths, columns]);

  return {
    tableRef,
    columns,
    sort,
    toggleSort,
    colWidths,
    hasCustomWidths: colWidths !== null,
    totalResizedWidth,
    resizingKey,
    startResize,
    resetWidths,
  };
}

interface InteractiveTableProps<K extends string> {
  controller: ReturnType<typeof useInteractiveTable<K>>;
  className?: string;
  compact?: boolean;
  manualZebra?: boolean;
  children: React.ReactNode;
}

export function InteractiveTable<K extends string>({
  controller,
  className = '',
  compact = false,
  manualZebra = false,
  children,
}: InteractiveTableProps<K>) {
  const {
    tableRef,
    columns,
    sort,
    toggleSort,
    colWidths,
    hasCustomWidths,
    totalResizedWidth,
    resizingKey,
    startResize,
    resetWidths,
  } = controller;

  const classes = [
    'arch-grid-table',
    compact ? 'arch-grid-table-compact' : '',
    manualZebra ? 'arch-grid-manual-zebra' : '',
    hasCustomWidths ? 'arch-grid-resized' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <table
      ref={tableRef}
      className={classes}
      style={
        hasCustomWidths && totalResizedWidth
          ? { width: `${totalResizedWidth}px`, minWidth: `${totalResizedWidth}px` }
          : undefined
      }
    >
      {hasCustomWidths && colWidths && (
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: `${colWidths[col.key] ?? col.minWidth ?? 120}px` }} />
          ))}
        </colgroup>
      )}
      <thead>
        <tr>
          {columns.map((col, idx) => {
            const isSortable = col.sortable !== false;
            const isResizable = col.resizable !== false;
            const isLastCol = idx === columns.length - 1;
            const isSorted = sort?.key === col.key;
            const direction = isSorted ? sort?.direction : undefined;
            const alignClass =
              col.align === 'right'
                ? 'justify-end text-right'
                : col.align === 'center'
                ? 'justify-center text-center'
                : 'justify-start text-left';

            return (
              <th
                key={col.key}
                className={`arch-th-interactive ${isSorted ? 'arch-th-sorted' : ''} ${
                  !hasCustomWidths && col.widthClass ? col.widthClass : ''
                }`}
                aria-sort={
                  isSortable
                    ? isSorted
                      ? direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                    : undefined
                }
              >
                {isSortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={`arch-th-sort-btn group ${alignClass}`}
                    title={`Sort by ${col.label}`}
                  >
                    <span className="truncate">{col.label}</span>
                    <span className="shrink-0 inline-flex items-center">
                      {direction === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#1C4ED8]" />
                      ) : direction === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5 text-[#1C4ED8]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#98A2B3] opacity-60 group-hover:opacity-100 group-hover:text-[#475062] transition-opacity" />
                      )}
                    </span>
                  </button>
                ) : (
                  <div className={`arch-th-inner ${alignClass}`}>
                    <span className="truncate">{col.label}</span>
                  </div>
                )}

                {isResizable && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${col.label} column`}
                    data-resizing={resizingKey === col.key ? 'true' : 'false'}
                    onPointerDown={(e) => startResize(col.key, e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      resetWidths();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to resize column · Double-click to reset widths"
                    className={`arch-col-resizer ${isLastCol ? '!right-0 !w-2' : ''}`}
                  />
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      {children}
    </table>
  );
}
