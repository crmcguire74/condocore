import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  Copy,
  Eye,
  EyeOff,
  Grid,
  Group,
  Layers,
  Lock,
  Magnet,
  Maximize2,
  MousePointer2,
  Pin,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Ungroup,
  Unlock,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BuildingAsset,
  DraftElementCategory,
  DraftElementKind,
  FloorPlan,
  FloorPlanElement,
} from '../types/condocore';
import {
  DRAFT_COLOR_SWATCHES,
  FLOORPLAN_STENCILS,
  getEditableElementsForBuiltInKey,
  STARTER_LAYOUT_TEMPLATES,
  STENCIL_CATEGORIES,
  StencilDefinition,
} from '../data/floorplanStencils';
import { DraftElementSvg, StencilPreviewIcon } from './DraftElementSvg';
import { BuiltInArchitecturalSvg } from './FloorplanCanvas';

interface FloorplanBuilderStudioProps {
  plan: FloorPlan;
  associationName: string;
  assets: BuildingAsset[];
  onSave: (
    elements: FloorPlanElement[],
    options: { scalePxPerFoot: number; underlayOpacity: number }
  ) => void;
  onPromoteToAsset?: (elementId: string) => void;
  onClose: () => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface InteractionState {
  mode: 'move' | 'resize' | 'rotate' | 'marquee';
  elementId?: string;
  handle?: ResizeHandle;
  startSvgX: number;
  startSvgY: number;
  origEl?: FloorPlanElement;
  origElements?: Record<string, { x: number; y: number; width: number; height: number }>;
  groupBounds?: { minX: number; minY: number; maxX: number; maxY: number };
  additive?: boolean;
  initialSelectedIds?: string[];
  didMutate?: boolean;
}

interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AlignmentGuides {
  vertical: number[];
  horizontal: number[];
}

const VIEWBOX_W = 1000;
const VIEWBOX_H = 620;

function snapValue(val: number, step: number): number {
  if (step <= 0) return Math.round(val);
  return Math.round(val / step) * step;
}

function expandIdsWithGroups(ids: string[], allElements: FloorPlanElement[]): string[] {
  const idSet = new Set(ids);
  const groupIds = new Set<string>();
  for (const el of allElements) {
    if (idSet.has(el.id) && el.groupId) {
      groupIds.add(el.groupId);
    }
  }
  if (groupIds.size === 0) return Array.from(idSet);
  for (const el of allElements) {
    if (el.groupId && groupIds.has(el.groupId)) {
      idSet.add(el.id);
    }
  }
  return Array.from(idSet);
}

export function FloorplanBuilderStudio({
  plan,
  associationName,
  assets,
  onSave,
  onPromoteToAsset,
  onClose,
}: FloorplanBuilderStudioProps) {
  const activeVersion =
    plan.versions.find((v) => v.id === plan.activeVersionId) || plan.versions[0];
  const usesEditableDemoElements =
    !activeVersion.uploadedImageUrl &&
    (plan.draftElements !== undefined ||
      (Boolean(activeVersion.builtInKey) && activeVersion.builtInKey !== 'manual_draft'));

  const initialElements = useMemo<FloorPlanElement[]>(() => {
    if (plan.draftElements !== undefined) return plan.draftElements;
    if (!activeVersion.uploadedImageUrl && activeVersion.builtInKey) {
      return getEditableElementsForBuiltInKey(activeVersion.builtInKey);
    }
    return [];
  }, [plan.draftElements, activeVersion.uploadedImageUrl, activeVersion.builtInKey]);

  const hasUnderlay =
    Boolean(activeVersion.uploadedImageUrl) ||
    (plan.scannedSpaces && plan.scannedSpaces.length > 0);

  const [elements, setElements] = useState<FloorPlanElement[]>(() => initialElements);
  const [history, setHistory] = useState<FloorPlanElement[][]>(() => [initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<DraftElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snapGridPx, setSnapGridPx] = useState<number>(10);
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [scalePxPerFoot, setScalePxPerFoot] = useState<number>(plan.draftScalePxPerFoot || 10);
  const [underlayOpacity, setUnderlayOpacity] = useState<number>(
    plan.underlayOpacity ?? (hasUnderlay ? 0.65 : 1)
  );
  const [showAssetPins, setShowAssetPins] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [guides, setGuides] = useState<AlignmentGuides>({ vertical: [], horizontal: [] });
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mobileDockTab, setMobileDockTab] = useState<'canvas' | 'palette' | 'inspector'>('canvas');

  const svgRef = useRef<SVGSVGElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const liveElementsRef = useRef<FloorPlanElement[]>(elements);
  liveElementsRef.current = elements;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedElements = useMemo(
    () => elements.filter((el) => selectedSet.has(el.id)),
    [elements, selectedSet]
  );
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const isMultiSelected = selectedElements.length > 1;

  const selectionBounds = useMemo(() => {
    if (selectedElements.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of selectedElements) {
      if (el.x < minX) minX = el.x;
      if (el.y < minY) minY = el.y;
      if (el.x + el.width > maxX) maxX = el.x + el.width;
      if (el.y + el.height > maxY) maxY = el.y + el.height;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }, [selectedElements]);

  const sharedGroupId = useMemo(() => {
    if (selectedElements.length < 2) return null;
    const first = selectedElements[0]?.groupId;
    if (!first) return null;
    return selectedElements.every((el) => el.groupId === first) ? first : null;
  }, [selectedElements]);

  const hasAnyGroupedSelected = useMemo(
    () => selectedElements.some((el) => Boolean(el.groupId)),
    [selectedElements]
  );
  const allSelectedLocked = useMemo(
    () => selectedElements.length > 0 && selectedElements.every((el) => Boolean(el.locked)),
    [selectedElements]
  );

  // Sync if plan switches externally
  useEffect(() => {
    const initial = plan.draftElements || [];
    setElements(initial);
    setHistory([initial]);
    setHistoryIndex(0);
    setSelectedIds([]);
    setHasUnsavedChanges(false);
  }, [plan.id]);

  const commitHistory = useCallback(
    (nextElements: FloorPlanElement[]) => {
      setElements(nextElements);
      setHasUnsavedChanges(true);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, nextElements].slice(-40);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    setHistoryIndex(prevIdx);
    setElements(history[prevIdx]);
    setHasUnsavedChanges(true);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    setElements(history[nextIdx]);
    setHasUnsavedChanges(true);
  }, [history, historyIndex]);

  const clientToSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 500, y: 310 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEWBOX_W;
    const y = ((clientY - rect.top) / rect.height) * VIEWBOX_H;
    return { x, y };
  }, []);

  const createElementFromStencil = useCallback(
    (stencil: StencilDefinition, centerX: number, centerY: number): FloorPlanElement => {
      const sameKindCount =
        liveElementsRef.current.filter((e) => e.kind === stencil.kind).length + 1;
      const rawX = centerX - stencil.defaultWidth / 2;
      const rawY = centerY - stencil.defaultHeight / 2;
      const clampedX = Math.max(
        24,
        Math.min(VIEWBOX_W - 24 - stencil.defaultWidth, snapValue(rawX, snapGridPx))
      );
      const clampedY = Math.max(
        24,
        Math.min(VIEWBOX_H - 60 - stencil.defaultHeight, snapValue(rawY, snapGridPx))
      );
      return {
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: stencil.kind,
        category: stencil.category,
        label:
          stencil.kind === 'unit_box'
            ? `Unit ${100 + sameKindCount}`
            : stencil.kind === 'parking_stall'
            ? `P-${sameKindCount}`
            : `${stencil.shortLabel} ${sameKindCount}`,
        x: clampedX,
        y: clampedY,
        width: stencil.defaultWidth,
        height: stencil.defaultHeight,
        rotation: 0,
        fillColor: stencil.fillColor,
        strokeColor: stencil.strokeColor,
      };
    },
    [snapGridPx]
  );

  const handleAddStencilAtCenter = (stencil: StencilDefinition) => {
    const offset = (elements.length % 6) * 14;
    const created = createElementFromStencil(stencil, 460 + offset, 280 + offset);
    commitHistory([...elements, created]);
    setSelectedIds([created.id]);
    setMobileDockTab('canvas');
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    const kind = e.dataTransfer.getData('application/x-condocore-stencil') as DraftElementKind;
    if (!kind) return;
    const stencil = FLOORPLAN_STENCILS.find((s) => s.kind === kind);
    if (!stencil) return;
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    const created = createElementFromStencil(stencil, pt.x, pt.y);
    commitHistory([...elements, created]);
    setSelectedIds([created.id]);
  };

  const updateSelectedElements = useCallback(
    (patch: Partial<FloorPlanElement>, recordHistory = true) => {
      if (selectedIds.length === 0) return;
      const sel = new Set(selectedIds);
      const next = liveElementsRef.current.map((el) =>
        sel.has(el.id) ? { ...el, ...patch } : el
      );
      if (recordHistory) {
        commitHistory(next);
      } else {
        setElements(next);
        setHasUnsavedChanges(true);
      }
    },
    [selectedIds, commitHistory]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const removableIds = new Set(
      liveElementsRef.current
        .filter((e) => sel.has(e.id) && !e.locked)
        .map((e) => e.id)
    );
    if (removableIds.size === 0) return;
    const next = liveElementsRef.current.filter((e) => !removableIds.has(e.id));
    commitHistory(next);
    setSelectedIds((prev) => prev.filter((id) => !removableIds.has(id)));
  }, [selectedIds, commitHistory]);

  const handleDuplicateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const targets = liveElementsRef.current.filter((e) => sel.has(e.id));
    if (targets.length === 0) return;

    const groupRemap: Record<string, string> = {};
    const now = Date.now();
    const clones: FloorPlanElement[] = targets.map((el, i) => {
      let nextGroupId: string | undefined = undefined;
      if (el.groupId) {
        if (!groupRemap[el.groupId]) {
          groupRemap[el.groupId] = `grp-${now}-${Math.random().toString(36).slice(2, 5)}`;
        }
        nextGroupId = groupRemap[el.groupId];
      }
      return {
        ...el,
        id: `el-${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        x: Math.min(VIEWBOX_W - 24 - el.width, el.x + 20),
        y: Math.min(VIEWBOX_H - 60 - el.height, el.y + 20),
        locked: false,
        groupId: nextGroupId,
        promotedAssetId: undefined,
      };
    });

    commitHistory([...liveElementsRef.current, ...clones]);
    setSelectedIds(clones.map((c) => c.id));
  }, [selectedIds, commitHistory]);

  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const sel = new Set(selectedIds);
    const newGroupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const next = liveElementsRef.current.map((el) =>
      sel.has(el.id) ? { ...el, groupId: newGroupId } : el
    );
    commitHistory(next);
  }, [selectedIds, commitHistory]);

  const handleUngroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const touchedGroups = new Set<string>();
    for (const el of liveElementsRef.current) {
      if (sel.has(el.id) && el.groupId) touchedGroups.add(el.groupId);
    }
    if (touchedGroups.size === 0) return;
    const next = liveElementsRef.current.map((el) =>
      sel.has(el.id) || (el.groupId && touchedGroups.has(el.groupId))
        ? { ...el, groupId: undefined }
        : el
    );
    commitHistory(next);
  }, [selectedIds, commitHistory]);

  const handleToggleLockSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const targets = liveElementsRef.current.filter((e) => sel.has(e.id));
    const shouldLock = !targets.every((e) => Boolean(e.locked));
    const next = liveElementsRef.current.map((el) =>
      sel.has(el.id) ? { ...el, locked: shouldLock } : el
    );
    commitHistory(next);
  }, [selectedIds, commitHistory]);

  const handleRotateSelected = useCallback(
    (deltaDeg: number) => {
      if (selectedIds.length === 0) return;
      const sel = new Set(selectedIds);
      const next = liveElementsRef.current.map((el) =>
        sel.has(el.id) && !el.locked
          ? { ...el, rotation: ((el.rotation || 0) + deltaDeg + 360) % 360 }
          : el
      );
      commitHistory(next);
    },
    [selectedIds, commitHistory]
  );

  const handleAlignSelected = useCallback(
    (
      alignment:
        | 'left'
        | 'centerX'
        | 'right'
        | 'top'
        | 'middleY'
        | 'bottom'
        | 'distributeH'
        | 'distributeV'
    ) => {
      if (selectedIds.length < 2) return;
      const sel = new Set(selectedIds);
      const movable = liveElementsRef.current.filter((e) => sel.has(e.id) && !e.locked);
      if (movable.length < 2) return;

      const minX = Math.min(...movable.map((e) => e.x));
      const maxX = Math.max(...movable.map((e) => e.x + e.width));
      const midX = (minX + maxX) / 2;
      const minY = Math.min(...movable.map((e) => e.y));
      const maxY = Math.max(...movable.map((e) => e.y + e.height));
      const midY = (minY + maxY) / 2;

      const patchById: Record<string, { x?: number; y?: number }> = {};

      if (alignment === 'left') {
        movable.forEach((e) => (patchById[e.id] = { x: minX }));
      } else if (alignment === 'centerX') {
        movable.forEach((e) => (patchById[e.id] = { x: Math.round(midX - e.width / 2) }));
      } else if (alignment === 'right') {
        movable.forEach((e) => (patchById[e.id] = { x: maxX - e.width }));
      } else if (alignment === 'top') {
        movable.forEach((e) => (patchById[e.id] = { y: minY }));
      } else if (alignment === 'middleY') {
        movable.forEach((e) => (patchById[e.id] = { y: Math.round(midY - e.height / 2) }));
      } else if (alignment === 'bottom') {
        movable.forEach((e) => (patchById[e.id] = { y: maxY - e.height }));
      } else if (alignment === 'distributeH' && movable.length >= 3) {
        const sorted = [...movable].sort((a, b) => a.x - b.x);
        const totalWidths = sorted.reduce((sum, e) => sum + e.width, 0);
        const span = maxX - minX;
        const gap = (span - totalWidths) / (sorted.length - 1);
        let cursor = minX;
        sorted.forEach((e) => {
          patchById[e.id] = { x: Math.round(cursor) };
          cursor += e.width + gap;
        });
      } else if (alignment === 'distributeV' && movable.length >= 3) {
        const sorted = [...movable].sort((a, b) => a.y - b.y);
        const totalHeights = sorted.reduce((sum, e) => sum + e.height, 0);
        const span = maxY - minY;
        const gap = (span - totalHeights) / (sorted.length - 1);
        let cursor = minY;
        sorted.forEach((e) => {
          patchById[e.id] = { y: Math.round(cursor) };
          cursor += e.height + gap;
        });
      } else {
        return;
      }

      const next = liveElementsRef.current.map((el) => {
        const p = patchById[el.id];
        if (!p) return el;
        return {
          ...el,
          x: p.x !== undefined ? Math.max(20, Math.min(VIEWBOX_W - 20 - el.width, p.x)) : el.x,
          y: p.y !== undefined ? Math.max(20, Math.min(VIEWBOX_H - 56 - el.height, p.y)) : el.y,
        };
      });
      commitHistory(next);
    },
    [selectedIds, commitHistory]
  );

  const handleReorderLayer = (direction: 'front' | 'back') => {
    if (selectedIds.length === 0) return;
    const sel = new Set(selectedIds);
    const chosen = elements.filter((e) => sel.has(e.id));
    const others = elements.filter((e) => !sel.has(e.id));
    if (chosen.length === 0) return;
    const next = direction === 'front' ? [...others, ...chosen] : [...chosen, ...others];
    commitHistory(next);
  };

  const handleLoadStarterTemplate = (templateId: string) => {
    const tpl = STARTER_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const stamped: FloorPlanElement[] = tpl.elements.map((el, i) => ({
      ...el,
      id: `el-tpl-${Date.now()}-${i}`,
    }));
    commitHistory(stamped);
    setSelectedIds([]);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedIds(liveElementsRef.current.map((el) => el.id));
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupSelected();
        } else {
          handleGroupSelected();
        }
        return;
      }
      if (e.key === 'Escape') {
        setSelectedIds([]);
        return;
      }
      if (selectedIds.length === 0) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRotateSelected(90);
        return;
      }

      const step = e.shiftKey ? 10 : Math.max(2, snapGridPx || 2);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const sel = new Set(selectedIds);
        const movable = liveElementsRef.current.filter((el) => sel.has(el.id) && !el.locked);
        if (movable.length === 0) return;

        let dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        let dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        // Clamp collective delta so multi-selection stays intact within bounds
        const minX = Math.min(...movable.map((m) => m.x));
        const maxX = Math.max(...movable.map((m) => m.x + m.width));
        const minY = Math.min(...movable.map((m) => m.y));
        const maxY = Math.max(...movable.map((m) => m.y + m.height));

        dx = Math.max(20 - minX, Math.min(VIEWBOX_W - 20 - maxX, dx));
        dy = Math.max(20 - minY, Math.min(VIEWBOX_H - 56 - maxY, dy));

        const next = liveElementsRef.current.map((el) =>
          sel.has(el.id) && !el.locked ? { ...el, x: el.x + dx, y: el.y + dy } : el
        );
        commitHistory(next);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selectedIds,
    snapGridPx,
    handleUndo,
    handleRedo,
    handleDuplicateSelected,
    handleGroupSelected,
    handleUngroupSelected,
    handleDeleteSelected,
    handleRotateSelected,
    commitHistory,
  ]);

  // Helper to initiate moving one or many selected elements together
  const beginMultiMove = (
    e: React.PointerEvent<Element>,
    moveIds: string[],
    captureTarget: Element
  ) => {
    const idSet = new Set(moveIds);
    const movable = liveElementsRef.current.filter((item) => idSet.has(item.id) && !item.locked);
    if (movable.length === 0) return;

    const pt = clientToSvgPoint(e.clientX, e.clientY);
    const origElements: Record<string, { x: number; y: number; width: number; height: number }> = {};
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of movable) {
      origElements[item.id] = { x: item.x, y: item.y, width: item.width, height: item.height };
      if (item.x < minX) minX = item.x;
      if (item.y < minY) minY = item.y;
      if (item.x + item.width > maxX) maxX = item.x + item.width;
      if (item.y + item.height > maxY) maxY = item.y + item.height;
    }

    interactionRef.current = {
      mode: 'move',
      startSvgX: pt.x,
      startSvgY: pt.y,
      origElements,
      groupBounds: { minX, minY, maxX, maxY },
      didMutate: false,
    };
    captureTarget.setPointerCapture?.(e.pointerId);
  };

  // Pointer interactions (Select, Marquee, Multi-Move, Resize, Rotate)
  const startMove = (e: React.PointerEvent<SVGGElement>, el: FloorPlanElement) => {
    e.stopPropagation();

    const targetIds =
      el.groupId && !e.altKey
        ? liveElementsRef.current.filter((item) => item.groupId === el.groupId).map((item) => item.id)
        : [el.id];

    // Shift / Ctrl / Cmd click toggles selection without starting a drag
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      setSelectedIds((prev) => {
        const nextSet = new Set(prev);
        const allPresent = targetIds.every((id) => nextSet.has(id));
        if (allPresent) {
          targetIds.forEach((id) => nextSet.delete(id));
        } else {
          targetIds.forEach((id) => nextSet.add(id));
        }
        return Array.from(nextSet);
      });
      return;
    }

    // If clicking an element already in a multi-selection (and not Alt-isolating), keep whole selection for dragging
    let activeIds: string[];
    if (!e.altKey && selectedSet.has(el.id)) {
      activeIds = selectedIds;
    } else {
      activeIds = targetIds;
      setSelectedIds(activeIds);
    }

    beginMultiMove(e, activeIds, e.currentTarget as unknown as Element);
  };

  const startMarquee = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    interactionRef.current = {
      mode: 'marquee',
      startSvgX: pt.x,
      startSvgY: pt.y,
      additive: e.shiftKey || e.metaKey || e.ctrlKey,
      initialSelectedIds: selectedIds,
      didMutate: false,
    };
    setMarqueeRect({ x: pt.x, y: pt.y, width: 0, height: 0 });
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const startResize = (
    e: React.PointerEvent<SVGRectElement>,
    el: FloorPlanElement,
    handle: ResizeHandle
  ) => {
    e.stopPropagation();
    if (el.locked) return;
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    interactionRef.current = {
      mode: 'resize',
      elementId: el.id,
      handle,
      startSvgX: pt.x,
      startSvgY: pt.y,
      origEl: { ...el },
      didMutate: false,
    };
    (e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId);
  };

  const startRotate = (e: React.PointerEvent<SVGCircleElement>, el: FloorPlanElement) => {
    e.stopPropagation();
    if (el.locked) return;
    const pt = clientToSvgPoint(e.clientX, e.clientY);
    interactionRef.current = {
      mode: 'rotate',
      elementId: el.id,
      startSvgX: pt.x,
      startSvgY: pt.y,
      origEl: { ...el },
      didMutate: false,
    };
    (e.currentTarget as unknown as Element).setPointerCapture?.(e.pointerId);
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const inter = interactionRef.current;
    if (!inter) return;

    const pt = clientToSvgPoint(e.clientX, e.clientY);

    if (inter.mode === 'marquee') {
      const rx = Math.min(inter.startSvgX, pt.x);
      const ry = Math.min(inter.startSvgY, pt.y);
      const rw = Math.abs(pt.x - inter.startSvgX);
      const rh = Math.abs(pt.y - inter.startSvgY);
      setMarqueeRect({ x: rx, y: ry, width: rw, height: rh });

      if (rw > 3 || rh > 3) {
        inter.didMutate = true;
        const hits = liveElementsRef.current
          .filter(
            (el) =>
              el.x < rx + rw &&
              el.x + el.width > rx &&
              el.y < ry + rh &&
              el.y + el.height > ry
          )
          .map((el) => el.id);

        const expandedHits = expandIdsWithGroups(hits, liveElementsRef.current);
        if (inter.additive) {
          setSelectedIds(Array.from(new Set([...(inter.initialSelectedIds || []), ...expandedHits])));
        } else {
          setSelectedIds(expandedHits);
        }
      }
      return;
    }

    if (inter.mode === 'move' && inter.origElements && inter.groupBounds) {
      const rawDx = pt.x - inter.startSvgX;
      const rawDy = pt.y - inter.startSvgY;
      if (Math.abs(rawDx) > 1 || Math.abs(rawDy) > 1) {
        inter.didMutate = true;
      }

      const { minX, minY, maxX, maxY } = inter.groupBounds;
      const groupW = maxX - minX;
      const groupH = maxY - minY;

      let nextMinX = snapValue(minX + rawDx, snapGridPx);
      let nextMinY = snapValue(minY + rawDy, snapGridPx);

      const vGuides: number[] = [];
      const hGuides: number[] = [];

      if (smartGuidesEnabled) {
        const threshold = 6;
        const movingIds = new Set(Object.keys(inter.origElements));
        const siblings = liveElementsRef.current.filter((s) => !movingIds.has(s.id));
        const targetXs = [nextMinX, nextMinX + groupW / 2, nextMinX + groupW];
        const targetYs = [nextMinY, nextMinY + groupH / 2, nextMinY + groupH];

        for (const sib of siblings) {
          const sibXs = [sib.x, sib.x + sib.width / 2, sib.x + sib.width];
          for (let ti = 0; ti < targetXs.length; ti++) {
            for (const sx of sibXs) {
              if (Math.abs(targetXs[ti] - sx) <= threshold) {
                const offset = sx - targetXs[ti];
                nextMinX += offset;
                vGuides.push(sx);
                break;
              }
            }
          }

          const sibYs = [sib.y, sib.y + sib.height / 2, sib.y + sib.height];
          for (let ti = 0; ti < targetYs.length; ti++) {
            for (const sy of sibYs) {
              if (Math.abs(targetYs[ti] - sy) <= threshold) {
                const offset = sy - targetYs[ti];
                nextMinY += offset;
                hGuides.push(sy);
                break;
              }
            }
          }
        }
      }

      nextMinX = Math.max(20, Math.min(VIEWBOX_W - 20 - groupW, nextMinX));
      nextMinY = Math.max(20, Math.min(VIEWBOX_H - 56 - groupH, nextMinY));

      const finalDx = nextMinX - minX;
      const finalDy = nextMinY - minY;

      setGuides({
        vertical: Array.from(new Set(vGuides)).slice(0, 3),
        horizontal: Array.from(new Set(hGuides)).slice(0, 3),
      });

      const origMap = inter.origElements;
      setElements((prev) =>
        prev.map((el) => {
          const orig = origMap[el.id];
          if (!orig) return el;
          return { ...el, x: orig.x + finalDx, y: orig.y + finalDy };
        })
      );
      setHasUnsavedChanges(true);
    } else if (inter.mode === 'resize' && inter.handle && inter.origEl) {
      const { origEl } = inter;
      const dx = pt.x - inter.startSvgX;
      const dy = pt.y - inter.startSvgY;
      inter.didMutate = true;
      const minSize = origEl.kind === 'wall' || origEl.kind === 'window' ? 8 : 18;

      let nx = origEl.x;
      let ny = origEl.y;
      let nw = origEl.width;
      let nh = origEl.height;

      const h = inter.handle;
      if (h.includes('e')) {
        nw = Math.max(minSize, snapValue(origEl.width + dx, snapGridPx));
      }
      if (h.includes('s')) {
        nh = Math.max(minSize, snapValue(origEl.height + dy, snapGridPx));
      }
      if (h.includes('w')) {
        const snappedLeft = snapValue(origEl.x + dx, snapGridPx);
        const maxLeft = origEl.x + origEl.width - minSize;
        nx = Math.min(maxLeft, Math.max(20, snappedLeft));
        nw = origEl.x + origEl.width - nx;
      }
      if (h.includes('n')) {
        const snappedTop = snapValue(origEl.y + dy, snapGridPx);
        const maxTop = origEl.y + origEl.height - minSize;
        ny = Math.min(maxTop, Math.max(20, snappedTop));
        nh = origEl.y + origEl.height - ny;
      }

      nw = Math.min(VIEWBOX_W - 20 - nx, nw);
      nh = Math.min(VIEWBOX_H - 56 - ny, nh);

      setElements((prev) =>
        prev.map((el) =>
          el.id === inter.elementId ? { ...el, x: nx, y: ny, width: nw, height: nh } : el
        )
      );
      setHasUnsavedChanges(true);
    } else if (inter.mode === 'rotate' && inter.origEl) {
      const { origEl } = inter;
      inter.didMutate = true;
      const cx = origEl.x + origEl.width / 2;
      const cy = origEl.y + origEl.height / 2;
      const angleRad = Math.atan2(pt.y - cy, pt.x - cx);
      let angleDeg = Math.round((angleRad * 180) / Math.PI) + 90;
      angleDeg = (angleDeg + 360) % 360;
      const snapAngle = e.shiftKey ? 15 : 5;
      angleDeg = Math.round(angleDeg / snapAngle) * snapAngle;
      if (angleDeg === 360) angleDeg = 0;

      setElements((prev) =>
        prev.map((el) => (el.id === inter.elementId ? { ...el, rotation: angleDeg } : el))
      );
      setHasUnsavedChanges(true);
    }
  };

  const handleSvgPointerUp = () => {
    const inter = interactionRef.current;
    if (!inter) return;
    interactionRef.current = null;
    setGuides({ vertical: [], horizontal: [] });

    if (inter.mode === 'marquee') {
      setMarqueeRect(null);
      if (!inter.didMutate && !inter.additive) {
        setSelectedIds([]);
      }
      return;
    }

    if (inter.didMutate) {
      commitHistory(liveElementsRef.current);
    }
  };

  const filteredStencils = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FLOORPLAN_STENCILS.filter((s) => {
      const catMatch = activeCategory === 'all' || s.category === activeCategory;
      const qMatch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.shortLabel.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [activeCategory, searchQuery]);

  const totalDraftedSqFt = useMemo(() => {
    return elements
      .filter((e) => e.kind === 'room' || e.kind === 'unit_box' || e.kind === 'corridor')
      .reduce(
        (sum, e) => sum + (e.width / scalePxPerFoot) * (e.height / scalePxPerFoot),
        0
      );
  }, [elements, scalePxPerFoot]);

  const handleSaveNow = () => {
    onSave(elements, { scalePxPerFoot, underlayOpacity });
    setHasUnsavedChanges(false);
  };

  const handlePromoteSelected = () => {
    if (!selectedElement || !onPromoteToAsset) return;
    // Save current elements first so the store has the latest element before promoting
    onSave(elements, { scalePxPerFoot, underlayOpacity });
    setHasUnsavedChanges(false);
    setTimeout(() => {
      onPromoteToAsset(selectedElement.id);
    }, 30);
  };

  return (
    <div className="arch-surface rounded-2xl overflow-hidden flex flex-col lg:flex-1 lg:min-h-0 bg-white">
      {/* Studio Top Bar */}
      <div className="bg-[#111318] text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="px-2.5 py-1 bg-[#1C4ED8] text-white font-display text-[11px] font-semibold tracking-wide rounded-lg shrink-0">
            Floorplan Studio
          </div>
          <div className="min-w-0">
            <div className="text-sm font-display font-semibold truncate">
              {plan.levelCode} · {plan.name}
            </div>
            <div className="text-xs text-[#9BA1AE] truncate">
              {hasUnderlay
                ? 'Supplementing existing / uploaded / scanned floorplan'
                : 'Manual drag-and-drop architectural drafting'}
              {' · '}
              <span className="tabular-nums">{elements.length}</span> element{elements.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-xl text-[#D1D5DB] hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-xl text-[#D1D5DB] hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/15 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleSaveNow}
            className="arch-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap"
          >
            {hasUnsavedChanges ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
            {hasUnsavedChanges ? 'Save Layout' : 'Saved'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasUnsavedChanges) {
                onSave(elements, { scalePxPerFoot, underlayOpacity });
              }
              onClose();
            }}
            className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-white/18 text-white rounded-xl transition-colors whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Done
          </button>
        </div>
      </div>

      {/* Studio Precision Controls Bar */}
      <div className="bg-[#FAFBFD] border-b border-black/[0.06] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Snap Grid */}
          <label className="inline-flex items-center gap-1.5 text-[#525866] bg-white border border-black/[0.08] rounded-xl px-2.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <Grid className="w-3.5 h-3.5 text-[#1C4ED8]" />
            <span className="hidden sm:inline font-medium">Snap</span>
            <select
              value={snapGridPx}
              onChange={(e) => setSnapGridPx(Number(e.target.value))}
              className="bg-transparent text-xs font-medium text-[#111318] focus:outline-none"
            >
              <option value={0}>Free</option>
              <option value={5}>0.5 ft</option>
              <option value={10}>1 ft</option>
              <option value={20}>2 ft</option>
            </select>
          </label>

          {/* Scale */}
          <label className="inline-flex items-center gap-1.5 text-[#525866] bg-white border border-black/[0.08] rounded-xl px-2.5 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <span className="hidden sm:inline font-medium">Scale</span>
            <select
              value={scalePxPerFoot}
              onChange={(e) => {
                setScalePxPerFoot(Number(e.target.value));
                setHasUnsavedChanges(true);
              }}
              className="bg-transparent text-xs font-medium text-[#111318] focus:outline-none"
            >
              <option value={6}>166&apos; × 103&apos; Site</option>
              <option value={8}>125&apos; × 78&apos; Large</option>
              <option value={10}>100&apos; × 62&apos; Standard</option>
              <option value={15}>67&apos; × 41&apos; Wing</option>
              <option value={20}>50&apos; × 31&apos; Suite</option>
            </select>
          </label>

          {/* Smart Alignment Guides */}
          <button
            type="button"
            onClick={() => setSmartGuidesEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              smartGuidesEnabled
                ? 'bg-[#EEF3FF] border-[#C7D7FE] text-[#1C4ED8]'
                : 'bg-white border-black/[0.08] text-[#525866]'
            }`}
            title="Toggle Visio-style smart alignment guides"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Smart Guides</span>
          </button>

          {/* Underlay Opacity Slider (when supplementing an uploaded, built-in, or scanned plan) */}
          {hasUnderlay && (
            <label className="inline-flex items-center gap-2 text-[#525866] bg-white border border-black/[0.08] rounded-xl px-3 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <Layers className="w-3.5 h-3.5 text-[#1C4ED8]" />
              <span className="hidden xl:inline font-medium">Base Plan</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(underlayOpacity * 100)}
                onChange={(e) => {
                  setUnderlayOpacity(Number(e.target.value) / 100);
                  setHasUnsavedChanges(true);
                }}
                className="w-16 sm:w-20 accent-[#1C4ED8]"
                aria-label="Underlay opacity"
              />
              <span className="font-mono text-[11px] tabular-nums w-8 text-right text-[#111318]">
                {Math.round(underlayOpacity * 100)}%
              </span>
            </label>
          )}

          {/* Toggle existing asset pins reference */}
          {assets.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAssetPins((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-black/[0.08] rounded-xl text-[#525866] hover:text-[#111318] font-medium"
            >
              {showAssetPins ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">Pins ({assets.length})</span>
            </button>
          )}
          {/* Contextual Multi-Select Quick Actions */}
          {selectedElements.length >= 2 && (
            <div className="inline-flex items-center gap-1.5 bg-[#EEF3FF] border border-[#C7D7FE] rounded-xl px-2 py-1">
              <span className="font-mono text-[11px] font-semibold text-[#1C4ED8] px-1 tabular-nums">
                {selectedElements.length} selected
              </span>
              {sharedGroupId ? (
                <button
                  type="button"
                  onClick={handleUngroupSelected}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-black/[0.08] rounded-lg text-[11px] font-medium text-[#111318] hover:border-[#1C4ED8]"
                  title="Ungroup (Ctrl+Shift+G)"
                >
                  <Ungroup className="w-3 h-3 text-[#1C4ED8]" />
                  Ungroup
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGroupSelected}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1C4ED8] text-white rounded-lg text-[11px] font-semibold hover:bg-[#153DB0]"
                  title="Group selected elements (Ctrl+G)"
                >
                  <Group className="w-3 h-3" />
                  Group
                </button>
              )}
              <button
                type="button"
                onClick={handleDuplicateSelected}
                className="p-1 bg-white border border-black/[0.08] rounded-lg text-[#525866] hover:text-[#111318]"
                title="Duplicate selected (Ctrl+D)"
                aria-label="Duplicate selected"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={allSelectedLocked}
                className="p-1 bg-white border border-[#FECACA] rounded-lg text-[#B91C1C] hover:bg-[#FEF2F2] disabled:opacity-40"
                title="Delete selected (Del)"
                aria-label="Delete selected"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="inline-flex items-center bg-white border border-black/[0.08] rounded-xl p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
            className="p-1.5 text-[#525866] hover:text-[#111318] hover:bg-[#F4F5F7] rounded-lg"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs tabular-nums text-[#525866] w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
            className="p-1.5 text-[#525866] hover:text-[#111318] hover:bg-[#F4F5F7] rounded-lg"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 text-[#525866] hover:text-[#111318] hover:bg-[#F4F5F7] rounded-lg"
            aria-label="Reset zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Dock Switcher */}
      <div className="lg:hidden flex items-center border-b border-black/[0.06] bg-white p-1.5 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileDockTab('palette')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl ${
            mobileDockTab === 'palette'
              ? 'bg-[#111318] text-white'
              : 'text-[#525866] hover:bg-[#F4F5F7]'
          }`}
        >
          Elements Library
        </button>
        <button
          type="button"
          onClick={() => setMobileDockTab('canvas')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl ${
            mobileDockTab === 'canvas'
              ? 'bg-[#111318] text-white'
              : 'text-[#525866] hover:bg-[#F4F5F7]'
          }`}
        >
          Drafting Canvas
        </button>
        <button
          type="button"
          onClick={() => setMobileDockTab('inspector')}
          className={`flex-1 py-2 text-xs font-medium rounded-xl ${
            mobileDockTab === 'inspector'
              ? 'bg-[#111318] text-white'
              : 'text-[#525866] hover:bg-[#F4F5F7]'
          }`}
        >
          Properties {selectedElements.length > 0 ? `(${selectedElements.length})` : ''}
        </button>
      </div>

      {/* 3-Pane Modern Visio / Planner5D Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-[268px_minmax(0,1fr)_278px] flex-1 min-h-[540px] lg:min-h-0">
        {/* LEFT PANE: Drag-and-Drop Stencil Library */}
        <aside
          className={`border-r border-black/[0.06] bg-[#FAFBFD] flex flex-col lg:min-h-0 ${
            mobileDockTab === 'palette' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3.5 border-b border-black/[0.06] space-y-2.5 bg-white shrink-0">
            <div className="text-xs font-display font-semibold text-[#111318]">
              Drag or Click Elements
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#788090] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms, doors, HVAC..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F4F5F7] border border-transparent focus:bg-white focus:border-[#1C4ED8] rounded-xl focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {STENCIL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#1C4ED8] text-white shadow-xs'
                      : 'bg-[#ECEEF2] text-[#525866] hover:text-[#111318]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 overflow-y-auto flex-1 grid grid-cols-2 gap-2 content-start">
            {filteredStencils.map((stencil) => (
              <div
                key={stencil.kind}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-condocore-stencil', stencil.kind);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => handleAddStencilAtCenter(stencil)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAddStencilAtCenter(stencil);
                  }
                }}
                title={`${stencil.name} — Drag onto canvas or click to add`}
                className="group bg-white border border-black/[0.07] hover:border-[#1C4ED8]/60 hover:shadow-sm rounded-xl p-2.5 flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing transition-all select-none text-center"
              >
                <StencilPreviewIcon
                  kind={stencil.kind}
                  fillColor={stencil.fillColor}
                  strokeColor={stencil.strokeColor}
                />
                <span className="text-[11px] font-medium text-[#111318] leading-tight line-clamp-1">
                  {stencil.shortLabel}
                </span>
              </div>
            ))}

            {filteredStencils.length === 0 && (
              <div className="col-span-2 py-8 text-center text-xs text-[#788090]">
                No matching building elements.
              </div>
            )}
          </div>
        </aside>

        {/* CENTER PANE: Interactive Drafting Canvas */}
        <div
          onDragOver={handleCanvasDragOver}
          onDragLeave={() => setIsDragOverCanvas(false)}
          onDrop={handleCanvasDrop}
          className={`relative overflow-auto blueprint-grid p-3 sm:p-4 lg:min-h-0 ${
            isDragOverCanvas ? 'ring-2 ring-inset ring-[#1C4ED8] bg-[#EEF3FF]/40' : ''
          } ${mobileDockTab === 'canvas' ? 'block' : 'hidden lg:block'}`}
        >
          {isDragOverCanvas && (
            <div className="sticky top-2 left-0 right-0 z-30 flex justify-center pointer-events-none">
              <div className="px-3.5 py-1.5 bg-[#1C4ED8] text-white text-xs font-semibold rounded-xl shadow-lg">
                Drop anywhere on blueprint to place element
              </div>
            </div>
          )}

          <div
            className="relative mx-auto rounded-xl overflow-hidden shadow-[0_8px_30px_-14px_rgba(15,23,42,0.2)] border border-black/[0.08] bg-white"
            style={{
              width: `${zoom * 100}%`,
              minWidth: '640px',
              aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}`,
            }}
          >
            {/* Underlay Layer: Uploaded Image or Architectural Blueprint Sheet */}
            <div
              className="absolute inset-0 pointer-events-none select-none"
              style={{ opacity: activeVersion.uploadedImageUrl ? underlayOpacity : 1 }}
            >
              {activeVersion.uploadedImageUrl ? (
                <img
                  src={activeVersion.uploadedImageUrl}
                  alt={plan.name}
                  className="w-full h-full object-contain bg-[#FAF9F7]"
                />
              ) : (
                <BuiltInArchitecturalSvg
                  planKey={usesEditableDemoElements ? 'manual_draft' : activeVersion.builtInKey || 'manual_draft'}
                  versionLabel={activeVersion.label}
                  associationName={associationName}
                />
              )}
            </div>

            {/* Scanned Spaces Reference Underlay (if supplementing a camera-scanned plan) */}
            {plan.scannedSpaces && plan.scannedSpaces.length > 0 && (
              <svg
                viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ opacity: underlayOpacity }}
              >
                {plan.scannedSpaces.map((sp) => {
                  const rx = (sp.planX / 100) * VIEWBOX_W;
                  const ry = (sp.planY / 100) * VIEWBOX_H;
                  const rw = (sp.planWidthPct / 100) * VIEWBOX_W;
                  const rh = (sp.planHeightPct / 100) * VIEWBOX_H;
                  return (
                    <g key={sp.id}>
                      <rect
                        x={rx}
                        y={ry}
                        width={rw}
                        height={rh}
                        fill="rgba(238, 243, 255, 0.55)"
                        stroke="#1C4ED8"
                        strokeWidth={1.8}
                        strokeDasharray="6 3"
                      />
                      <text
                        x={rx + rw / 2}
                        y={ry + 16}
                        textAnchor="middle"
                        fill="#1C4ED8"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        SCANNED: {sp.name.toUpperCase()} ({sp.widthFt}&apos;×{sp.lengthFt}&apos;)
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Main Interactive Drafting SVG */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              className="absolute inset-0 w-full h-full touch-none select-none z-10"
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerCancel={handleSvgPointerUp}
              onPointerDown={(e) => {
                if (
                  e.target === svgRef.current ||
                  (e.target as Element).getAttribute('data-bg') === 'true'
                ) {
                  startMarquee(e);
                }
              }}
            >
              <defs>
                <pattern
                  id="studio-minor-grid"
                  width={Math.max(5, snapGridPx || 10)}
                  height={Math.max(5, snapGridPx || 10)}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${Math.max(5, snapGridPx || 10)} 0 L 0 0 0 ${Math.max(5, snapGridPx || 10)}`}
                    fill="none"
                    stroke="rgba(28, 78, 216, 0.08)"
                    strokeWidth="0.7"
                  />
                </pattern>
                <pattern
                  id="studio-major-grid"
                  width={Math.max(5, snapGridPx || 10) * 5}
                  height={Math.max(5, snapGridPx || 10) * 5}
                  patternUnits="userSpaceOnUse"
                >
                  <rect
                    width={Math.max(5, snapGridPx || 10) * 5}
                    height={Math.max(5, snapGridPx || 10) * 5}
                    fill="url(#studio-minor-grid)"
                  />
                  <path
                    d={`M ${Math.max(5, snapGridPx || 10) * 5} 0 L 0 0 0 ${
                      Math.max(5, snapGridPx || 10) * 5
                    }`}
                    fill="none"
                    stroke="rgba(28, 78, 216, 0.16)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              {/* Blueprint grid overlay */}
              <rect
                x={20}
                y={20}
                width={960}
                height={544}
                fill="url(#studio-major-grid)"
                data-bg="true"
              />

              {/* Existing CondoCore Asset Pins Reference Markers */}
              {showAssetPins &&
                assets.map((ast) => {
                  const ax = (ast.x / 100) * VIEWBOX_W;
                  const ay = (ast.y / 100) * VIEWBOX_H;
                  const pinColor =
                    ast.condition === 'red'
                      ? '#B91C1C'
                      : ast.condition === 'yellow'
                      ? '#B45309'
                      : '#1C4ED8';
                  return (
                    <g key={ast.id} transform={`translate(${ax}, ${ay})`} pointerEvents="none" opacity={0.7}>
                      <circle cx={0} cy={0} r={5} fill={pinColor} stroke="#FFFFFF" strokeWidth={1.5} />
                      <text
                        x={8}
                        y={3}
                        fill={pinColor}
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {ast.code}
                      </text>
                    </g>
                  );
                })}

              {/* Multi-Select / Group Interactive Drag Underlay (behind elements so Shift/Alt+click still hits shapes) */}
              {isMultiSelected && selectionBounds && (
                <rect
                  x={selectionBounds.minX - 6}
                  y={selectionBounds.minY - 6}
                  width={selectionBounds.width + 12}
                  height={selectionBounds.height + 12}
                  rx={6}
                  fill="rgba(28, 78, 216, 0.05)"
                  className={allSelectedLocked ? 'cursor-not-allowed' : 'cursor-move'}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    beginMultiMove(e, selectedIds, e.currentTarget as unknown as Element);
                  }}
                />
              )}

              {/* User Drafted Architectural Elements */}
              {elements.map((el) => (
                <DraftElementSvg
                  key={el.id}
                  element={el}
                  scalePxPerFoot={scalePxPerFoot}
                  isSelected={selectedSet.has(el.id)}
                  isInteractive
                  onPointerDown={(e) => startMove(e, el)}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              ))}

              {/* Multi-Select / Group Frame Outline & Labels */}
              {isMultiSelected && selectionBounds && (
                <g pointerEvents="none">
                  <rect
                    x={selectionBounds.minX - 6}
                    y={selectionBounds.minY - 6}
                    width={selectionBounds.width + 12}
                    height={selectionBounds.height + 12}
                    rx={6}
                    fill="none"
                    stroke="#1C4ED8"
                    strokeWidth={1.6}
                    strokeDasharray={sharedGroupId ? 'none' : '6 3'}
                  />
                  {/* Corner accent markers */}
                  {[
                    [selectionBounds.minX - 6, selectionBounds.minY - 6],
                    [selectionBounds.maxX + 6, selectionBounds.minY - 6],
                    [selectionBounds.minX - 6, selectionBounds.maxY + 6],
                    [selectionBounds.maxX + 6, selectionBounds.maxY + 6],
                  ].map(([cx, cy], idx) => (
                    <circle
                      key={`mb-${idx}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      fill={sharedGroupId ? '#1C4ED8' : '#FFFFFF'}
                      stroke="#1C4ED8"
                      strokeWidth={1.6}
                    />
                  ))}
                  {/* Top-left Selection / Group Badge */}
                  <g transform={`translate(${selectionBounds.minX - 6}, ${Math.max(24, selectionBounds.minY - 24)})`}>
                    <rect
                      x={0}
                      y={0}
                      width={sharedGroupId ? 104 : 88}
                      height={16}
                      rx={4}
                      fill={sharedGroupId ? '#1C4ED8' : '#111318'}
                    />
                    <text
                      x={sharedGroupId ? 52 : 44}
                      y={11}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {sharedGroupId
                        ? `GROUP · ${selectedElements.length} ITEMS`
                        : `${selectedElements.length} SELECTED`}
                    </text>
                  </g>
                  {/* Collective Dimensions Pill */}
                  <g
                    transform={`translate(${selectionBounds.minX + selectionBounds.width / 2}, ${
                      selectionBounds.maxY + 20
                    })`}
                  >
                    <rect x={-56} y={-10} width={112} height={16} rx={5} fill="#111318" opacity={0.92} />
                    <text
                      x={0}
                      y={1}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {(selectionBounds.width / scalePxPerFoot).toFixed(1)}&apos; ×{' '}
                      {(selectionBounds.height / scalePxPerFoot).toFixed(1)}&apos;
                    </text>
                  </g>
                </g>
              )}

              {/* Rubber-Band Marquee Drag Selection Box */}
              {marqueeRect && (marqueeRect.width > 2 || marqueeRect.height > 2) && (
                <rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.width}
                  height={marqueeRect.height}
                  rx={3}
                  fill="rgba(28, 78, 216, 0.10)"
                  stroke="#1C4ED8"
                  strokeWidth={1.4}
                  strokeDasharray="5 3"
                  pointerEvents="none"
                />
              )}

              {/* Visio-style Smart Alignment Guide Lines */}
              {guides.vertical.map((vx, i) => (
                <line
                  key={`vg-${i}`}
                  x1={vx}
                  y1={20}
                  x2={vx}
                  y2={564}
                  stroke="#1C4ED8"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              ))}
              {guides.horizontal.map((hy, i) => (
                <line
                  key={`hg-${i}`}
                  x1={20}
                  y1={hy}
                  x2={980}
                  y2={hy}
                  stroke="#1C4ED8"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              ))}

              {/* Selected Element Resize & Rotate Handles */}
              {selectedElement && !selectedElement.locked && (
                <g
                  transform={`translate(${selectedElement.x}, ${selectedElement.y}) rotate(${
                    selectedElement.rotation || 0
                  }, ${selectedElement.width / 2}, ${selectedElement.height / 2})`}
                >
                  {/* Rotation stem & knob */}
                  <line
                    x1={selectedElement.width / 2}
                    y1={-3}
                    x2={selectedElement.width / 2}
                    y2={-22}
                    stroke="#1C4ED8"
                    strokeWidth={1.4}
                  />
                  <circle
                    cx={selectedElement.width / 2}
                    cy={-24}
                    r={5.5}
                    fill="#F0C05A"
                    stroke="#121316"
                    strokeWidth={1.5}
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(e) => startRotate(e, selectedElement)}
                  />

                  {/* 8 Resize Handles */}
                  {(
                    [
                      { id: 'nw', hx: -4, hy: -4, cursor: 'nwse-resize' },
                      { id: 'n', hx: selectedElement.width / 2 - 4, hy: -4, cursor: 'ns-resize' },
                      { id: 'ne', hx: selectedElement.width - 4, hy: -4, cursor: 'nesw-resize' },
                      { id: 'e', hx: selectedElement.width - 4, hy: selectedElement.height / 2 - 4, cursor: 'ew-resize' },
                      { id: 'se', hx: selectedElement.width - 4, hy: selectedElement.height - 4, cursor: 'nwse-resize' },
                      { id: 's', hx: selectedElement.width / 2 - 4, hy: selectedElement.height - 4, cursor: 'ns-resize' },
                      { id: 'sw', hx: -4, hy: selectedElement.height - 4, cursor: 'nesw-resize' },
                      { id: 'w', hx: -4, hy: selectedElement.height / 2 - 4, cursor: 'ew-resize' },
                    ] as { id: ResizeHandle; hx: number; hy: number; cursor: string }[]
                  ).map((h) => (
                    <rect
                      key={h.id}
                      x={h.hx}
                      y={h.hy}
                      width={8}
                      height={8}
                      rx={1.5}
                      fill="#FFFFFF"
                      stroke="#1C4ED8"
                      strokeWidth={1.8}
                      style={{ cursor: h.cursor }}
                      onPointerDown={(e) => startResize(e, selectedElement, h.id)}
                    />
                  ))}

                  {/* Live dimension readout pill below selected shape */}
                  <g transform={`translate(${selectedElement.width / 2}, ${selectedElement.height + 16})`}>
                    <rect
                      x={-54}
                      y={-10}
                      width={108}
                      height={16}
                      rx={5}
                      fill="#111318"
                      opacity={0.92}
                    />
                    <text
                      x={0}
                      y={1}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {(selectedElement.width / scalePxPerFoot).toFixed(1)}&apos; ×{' '}
                      {(selectedElement.height / scalePxPerFoot).toFixed(1)}&apos;
                      {selectedElement.rotation ? ` · ${selectedElement.rotation}°` : ''}
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* RIGHT PANE: Properties Inspector & Layer Manager */}
        <aside
          className={`border-l border-black/[0.06] bg-white flex flex-col lg:min-h-0 overflow-y-auto ${
            mobileDockTab === 'inspector' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {isMultiSelected ? (
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-black/[0.06] pb-3">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[#111318] text-sm flex items-center gap-1.5">
                    <MousePointer2 className="w-3.5 h-3.5 text-[#1C4ED8]" />
                    <span>
                      {sharedGroupId ? 'Grouped Elements' : 'Multiple Selected'} ({selectedElements.length})
                    </span>
                  </div>
                  {selectionBounds && (
                    <div className="text-[11px] font-mono text-[#525866] mt-0.5 tabular-nums">
                      Span: {(selectionBounds.width / scalePxPerFoot).toFixed(1)}&apos; ×{' '}
                      {(selectionBounds.height / scalePxPerFoot).toFixed(1)}&apos;
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleLockSelected}
                  className={`p-1.5 rounded-xl border transition-colors ${
                    allSelectedLocked
                      ? 'bg-[#FEF3C7] border-[#F59E0B]/40 text-[#B45309]'
                      : 'border-black/[0.08] text-[#525866] hover:text-[#111318] hover:bg-[#F4F5F7]'
                  }`}
                  title={allSelectedLocked ? 'Unlock all selected' : 'Lock all selected'}
                >
                  {allSelectedLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Group / Ungroup Primary Action */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleGroupSelected}
                  disabled={Boolean(sharedGroupId)}
                  className="arch-btn-primary inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-[11px] font-semibold disabled:opacity-40"
                >
                  <Group className="w-3.5 h-3.5" />
                  Group
                </button>
                <button
                  type="button"
                  onClick={handleUngroupSelected}
                  disabled={!hasAnyGroupedSelected}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-[11px] font-medium disabled:opacity-40"
                >
                  <Ungroup className="w-3.5 h-3.5" />
                  Ungroup
                </button>
              </div>

              {/* Visio-Style Alignment & Distribution */}
              <div className="space-y-1.5">
                <span className="block font-medium text-[#111318]">Align &amp; Distribute</span>
                <div className="grid grid-cols-6 gap-1">
                  <button
                    type="button"
                    disabled={allSelectedLocked}
                    onClick={() => handleAlignSelected('left')}
                    className="arch-btn-secondary p-2 flex items-center justify-center disabled:opacity-40"
                    title="Align Left Edges"
                    aria-label="Align Left Edges"
                  >
                    <AlignStartVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={allSelectedLocked}
                    onClick={() => handleAlignSelected('centerX')}
                    className="arch-btn-secondary p-2 flex items-center justify-center disabled:opacity-40"
                    title="Align Horizontal Centers"
                    aria-label="Align Horizontal Centers"
                  >
                    <AlignCenterVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={allSelectedLocked}
                    onClick={() => handleAlignSelected('right')}
                    className="arch-btn-secondary p-2 flex items-center justify-center disabled:opacity-40"
                    title="Align Right Edges"
                    aria-label="Align Right Edges"
                  >
                    <AlignEndVertical className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={allSelectedLocked}
                    onClick={() => handleAlignSelected('top')}
                    className="arch-btn-secondary p-2 flex items-center justify-center disabled:opacity-40"
                    title="Align Top Edges"
                    aria-label="Align Top Edges"
                  >
                    <AlignStartHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={allSelectedLocked}
                    onClick={() => handleAlignSelected('middleY')}
                    className="arch-btn-secondary p-2 flex items-center justify-center disabled:opacity-40"
                    title="Align Vertical Centers"
                    aria-label="Align Vertical Centers"
                  >
                    <AlignCenterHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={allSelectedLocked}
                    onClick={() => handleAlignSelected('bottom')}
                    className="arch-btn-secondary p-2 flex items-center justify-center disabled:opacity-40"
                    title="Align Bottom Edges"
                    aria-label="Align Bottom Edges"
                  >
                    <AlignEndHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
                {selectedElements.length >= 3 && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={allSelectedLocked}
                      onClick={() => handleAlignSelected('distributeH')}
                      className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium disabled:opacity-40"
                    >
                      <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                      Space X
                    </button>
                    <button
                      type="button"
                      disabled={allSelectedLocked}
                      onClick={() => handleAlignSelected('distributeV')}
                      className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium disabled:opacity-40"
                    >
                      <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
                      Space Y
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Finish Swatch */}
              <div className="space-y-1.5">
                <span className="block font-medium text-[#111318]">Apply Finish to All</span>
                <div className="grid grid-cols-4 gap-2">
                  {DRAFT_COLOR_SWATCHES.map((sw) => (
                    <button
                      key={sw.name}
                      type="button"
                      disabled={allSelectedLocked}
                      onClick={() =>
                        updateSelectedElements(
                          { fillColor: sw.fill, strokeColor: sw.stroke },
                          true
                        )
                      }
                      title={sw.name}
                      className="h-7 rounded-lg border-2 hover:scale-105 transition-transform disabled:opacity-40"
                      style={{ backgroundColor: sw.fill, borderColor: sw.stroke }}
                    />
                  ))}
                </div>
              </div>

              {/* Bulk Layer & Edit Actions */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate All
                </button>
                <button
                  type="button"
                  disabled={allSelectedLocked}
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] rounded-xl text-[11px] font-medium disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete All
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderLayer('front')}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] text-[#525866]"
                >
                  <ArrowUpToLine className="w-3 h-3" />
                  To Front
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderLayer('back')}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] text-[#525866]"
                >
                  <ArrowDownToLine className="w-3 h-3" />
                  To Back
                </button>
              </div>

              {/* Members in Selection */}
              <div className="space-y-1.5 pt-2 border-t border-black/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#111318]">Selected Items</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-[11px] font-medium text-[#1C4ED8] hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="divide-y divide-black/[0.05] border border-black/[0.07] rounded-xl bg-[#FAFBFD]">
                  {selectedElements.map((el) => (
                    <div
                      key={el.id}
                      className="px-2.5 py-2 flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedIds([el.id])}
                        className="min-w-0 text-left flex-1 hover:text-[#1C4ED8]"
                        title="Click to inspect this element individually"
                      >
                        <div className="font-medium text-[#111318] truncate">{el.label}</div>
                        <div className="text-[10px] font-mono text-[#6B7280]">
                          {(el.width / scalePxPerFoot).toFixed(1)}&apos; ×{' '}
                          {(el.height / scalePxPerFoot).toFixed(1)}&apos;
                          {el.locked ? ' · Locked' : ''}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds((prev) => prev.filter((id) => id !== el.id))
                        }
                        className="p-1 text-[#788090] hover:text-[#111318]"
                        title="Remove from selection"
                        aria-label={`Remove ${el.label} from selection`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedElement ? (
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-start justify-between gap-2 border-b border-black/[0.06] pb-3">
                <div className="min-w-0">
                  <div className="font-display font-semibold text-[#111318] text-sm truncate">
                    {selectedElement.label}
                  </div>
                  <div className="text-[11px] font-medium text-[#1C4ED8] capitalize mt-0.5 flex items-center gap-1.5">
                    <span>{selectedElement.kind.replace(/_/g, ' ')}</span>
                    {selectedElement.groupId && (
                      <span className="font-mono text-[10px] text-[#525866]">· Grouped</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSelectedElements({ locked: !selectedElement.locked })}
                  className={`p-1.5 rounded-xl border transition-colors ${
                    selectedElement.locked
                      ? 'bg-[#FEF3C7] border-[#F59E0B]/40 text-[#B45309]'
                      : 'border-black/[0.08] text-[#525866] hover:text-[#111318] hover:bg-[#F4F5F7]'
                  }`}
                  title={selectedElement.locked ? 'Unlock element' : 'Lock element'}
                >
                  {selectedElement.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>

              {selectedElement.groupId && (
                <div className="flex items-center justify-between gap-2 p-2.5 bg-[#EEF3FF] border border-[#C7D7FE] rounded-xl text-[11px]">
                  <span className="font-medium text-[#1C4ED8]">Part of a group</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIds(
                          elements
                            .filter((el) => el.groupId === selectedElement.groupId)
                            .map((el) => el.id)
                        )
                      }
                      className="font-semibold text-[#1C4ED8] hover:underline"
                    >
                      Select Group
                    </button>
                    <button
                      type="button"
                      onClick={handleUngroupSelected}
                      className="font-medium text-[#525866] hover:text-[#111318]"
                    >
                      Ungroup
                    </button>
                  </div>
                </div>
              )}

              {/* Label */}
              <div>
                <label className="block font-medium text-[#111318] mb-1">Element Label</label>
                <input
                  type="text"
                  value={selectedElement.label}
                  disabled={selectedElement.locked}
                  onChange={(e) => updateSelectedElements({ label: e.target.value }, false)}
                  onBlur={() => commitHistory(liveElementsRef.current)}
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.09] focus:bg-white focus:border-[#1C4ED8] rounded-xl text-xs focus:outline-none transition-colors"
                />
              </div>

              {/* Dimensions in Feet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#111318]">Dimensions (ft)</span>
                  <span className="font-mono text-[11px] text-[#525866] tabular-nums">
                    {Math.round(
                      (selectedElement.width / scalePxPerFoot) *
                        (selectedElement.height / scalePxPerFoot)
                    )}{' '}
                    sq ft
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[#525866] mb-1">Width (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="95"
                      disabled={selectedElement.locked}
                      value={Number((selectedElement.width / scalePxPerFoot).toFixed(1))}
                      onChange={(e) => {
                        const ft = Math.max(0.8, Number(e.target.value) || 1);
                        updateSelectedElements({ width: Math.round(ft * scalePxPerFoot) }, true);
                      }}
                      className="w-full px-2.5 py-2 font-mono tabular-nums bg-[#F8F9FB] border border-black/[0.09] focus:bg-white focus:border-[#1C4ED8] rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#525866] mb-1">Depth (ft)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="60"
                      disabled={selectedElement.locked}
                      value={Number((selectedElement.height / scalePxPerFoot).toFixed(1))}
                      onChange={(e) => {
                        const ft = Math.max(0.5, Number(e.target.value) || 1);
                        updateSelectedElements({ height: Math.round(ft * scalePxPerFoot) }, true);
                      }}
                      className="w-full px-2.5 py-2 font-mono tabular-nums bg-[#F8F9FB] border border-black/[0.09] focus:bg-white focus:border-[#1C4ED8] rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#111318]">Orientation</span>
                  <span className="font-mono text-[11px] text-[#525866] tabular-nums">
                    {selectedElement.rotation || 0}°
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={selectedElement.locked}
                    onClick={() => handleRotateSelected(-90)}
                    className="arch-btn-secondary flex-1 py-1.5 text-[11px] font-medium"
                  >
                    -90°
                  </button>
                  <button
                    type="button"
                    disabled={selectedElement.locked}
                    onClick={() => handleRotateSelected(90)}
                    className="arch-btn-secondary flex-1 py-1.5 text-[11px] font-medium inline-flex items-center justify-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    +90°
                  </button>
                  <button
                    type="button"
                    disabled={selectedElement.locked}
                    onClick={() => updateSelectedElements({ rotation: 0 }, true)}
                    className="arch-btn-secondary px-3 py-1.5 text-[11px] font-mono"
                  >
                    0°
                  </button>
                </div>
              </div>

              {/* Swatches */}
              <div className="space-y-1.5">
                <span className="block font-medium text-[#111318]">Architectural Finish</span>
                <div className="grid grid-cols-4 gap-2">
                  {DRAFT_COLOR_SWATCHES.map((sw) => {
                    const isActive =
                      selectedElement.fillColor === sw.fill &&
                      selectedElement.strokeColor === sw.stroke;
                    return (
                      <button
                        key={sw.name}
                        type="button"
                        disabled={selectedElement.locked}
                        onClick={() =>
                          updateSelectedElements(
                            { fillColor: sw.fill, strokeColor: sw.stroke },
                            true
                          )
                        }
                        title={sw.name}
                        className={`h-7 rounded-lg border-2 transition-transform ${
                          isActive ? 'ring-2 ring-[#1C4ED8] ring-offset-1 scale-105' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: sw.fill, borderColor: sw.stroke }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-[#111318] mb-1">Field Notes</label>
                <textarea
                  rows={2}
                  disabled={selectedElement.locked}
                  value={selectedElement.notes || ''}
                  onChange={(e) => updateSelectedElements({ notes: e.target.value }, false)}
                  onBlur={() => commitHistory(liveElementsRef.current)}
                  placeholder="Material, fire rating, valve ID, or access notes..."
                  className="w-full px-3 py-2 bg-[#F8F9FB] border border-black/[0.09] focus:bg-white focus:border-[#1C4ED8] rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Layer & Actions */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={selectedElement.locked}
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] rounded-xl text-[11px] font-medium disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderLayer('front')}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] text-[#525866]"
                >
                  <ArrowUpToLine className="w-3 h-3" />
                  To Front
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderLayer('back')}
                  className="arch-btn-secondary inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] text-[#525866]"
                >
                  <ArrowDownToLine className="w-3 h-3" />
                  To Back
                </button>
              </div>

              {/* Promote to CondoCore Asset Pin */}
              {onPromoteToAsset && (
                <div className="pt-2.5 border-t border-black/[0.06]">
                  <button
                    type="button"
                    onClick={handlePromoteSelected}
                    className="arch-btn-primary w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {selectedElement.promotedAssetId
                      ? 'Open Linked Asset Dossier'
                      : 'Promote to Tracked Asset Pin'}
                  </button>
                  <p className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
                    Links this drafted component to warranties, inspections, work orders, and reserve life tracking.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4 text-xs">
              <div className="border-b border-black/[0.06] pb-3.5">
                <div className="font-display font-semibold text-sm text-[#111318]">Drafting Summary</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="bg-[#F8F9FB] border border-black/[0.06] rounded-xl p-2.5">
                    <div className="text-[11px] text-[#6B7280]">Elements</div>
                    <div className="font-mono text-base font-semibold text-[#111318] tabular-nums mt-0.5">
                      {elements.length}
                    </div>
                  </div>
                  <div className="bg-[#F8F9FB] border border-black/[0.06] rounded-xl p-2.5">
                    <div className="text-[11px] text-[#6B7280]">Drafted Area</div>
                    <div className="font-mono text-base font-semibold text-[#111318] tabular-nums mt-0.5">
                      {Math.round(totalDraftedSqFt)} SF
                    </div>
                  </div>
                </div>
              </div>

              {/* Starter Layouts (great when starting a blank manual plan) */}
              {!hasUnderlay && (
                <div className="space-y-2 border-b border-black/[0.06] pb-3.5">
                  <div className="font-display font-semibold text-[#111318] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1C4ED8]" />
                    Editable Floor Templates
                  </div>
                  <div className="space-y-1.5">
                    {STARTER_LAYOUT_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleLoadStarterTemplate(tpl.id)}
                        className="w-full text-left p-2.5 rounded-xl border border-black/[0.07] hover:border-[#1C4ED8]/50 hover:bg-[#EEF3FF]/45 transition-colors"
                      >
                        <div className="font-semibold text-[#111318]">{tpl.name}</div>
                        <div className="text-[11px] text-[#6B7280] leading-snug mt-0.5">
                          {tpl.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Placed Elements List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-[#111318]">
                    Placed Elements ({elements.length})
                  </span>
                  {elements.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        commitHistory([]);
                        setSelectedIds([]);
                      }}
                      className="text-[11px] font-medium text-[#B91C1C] hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {elements.length === 0 ? (
                  <div className="p-3.5 bg-[#F8F9FB] border border-dashed border-black/[0.14] rounded-xl text-[11px] text-[#525866] leading-relaxed">
                    Drag any architectural stencil from the left palette onto the blueprint—or drag across empty canvas to box-select, group, align, and move multiple elements together.
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.05] border border-black/[0.07] rounded-xl bg-[#FAFBFD]">
                    {elements.map((el) => (
                      <button
                        key={el.id}
                        type="button"
                        onClick={(e) => {
                          if (e.shiftKey || e.metaKey || e.ctrlKey) {
                            setSelectedIds((prev) =>
                              prev.includes(el.id)
                                ? prev.filter((id) => id !== el.id)
                                : [...prev, el.id]
                            );
                          } else {
                            setSelectedIds([el.id]);
                          }
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-white flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[#111318] truncate flex items-center gap-1.5">
                            <span className="truncate">{el.label}</span>
                            {el.groupId && (
                              <Group className="w-3 h-3 text-[#1C4ED8] shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-[#6B7280]">
                            {(el.width / scalePxPerFoot).toFixed(1)}&apos; ×{' '}
                            {(el.height / scalePxPerFoot).toFixed(1)}&apos;
                          </div>
                        </div>
                        <Plus className="w-3 h-3 text-[#788090] shrink-0 rotate-45 opacity-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Shortcuts hint */}
              <div className="pt-2.5 border-t border-black/[0.06] text-[11px] text-[#6B7280] space-y-1">
                <div>Drag empty canvas to box-select · Shift+Click to toggle</div>
                <div>Ctrl+G group · Ctrl+Shift+G ungroup · Ctrl+A select all</div>
                <div>Arrows nudge · R rotate · Ctrl+D duplicate · Del remove</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
