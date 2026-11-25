import {
  DraftElementCategory,
  DraftElementKind,
  FloorPlanElement,
  PlanBuiltInKey,
} from '../types/condocore';

export interface StencilDefinition {
  kind: DraftElementKind;
  category: DraftElementCategory;
  name: string;
  shortLabel: string;
  defaultWidth: number; // in 1000x620 viewBox units (default 10px = 1ft)
  defaultHeight: number;
  fillColor: string;
  strokeColor: string;
  description: string;
  canPromoteToAsset?: boolean;
}

export const STENCIL_CATEGORIES: { id: DraftElementCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'structure', label: 'Structure' },
  { id: 'openings', label: 'Doors & Windows' },
  { id: 'circulation', label: 'Stairs & Elev' },
  { id: 'systems', label: 'MEP Systems' },
  { id: 'exterior', label: 'Parking & Site' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'annotations', label: 'Zones & Labels' },
];

export const FLOORPLAN_STENCILS: StencilDefinition[] = [
  // Structure
  {
    kind: 'room',
    category: 'structure',
    name: 'Room / Space',
    shortLabel: 'Room',
    defaultWidth: 180,
    defaultHeight: 140,
    fillColor: '#FFFFFF',
    strokeColor: '#1C4ED8',
    description: 'Enclosed architectural room with automatic footage readout',
  },
  {
    kind: 'unit_box',
    category: 'structure',
    name: 'Condo Unit',
    shortLabel: 'Unit',
    defaultWidth: 200,
    defaultHeight: 160,
    fillColor: '#FBFCFE',
    strokeColor: '#1C4ED8',
    description: 'Residential condominium unit footprint',
  },
  {
    kind: 'corridor',
    category: 'structure',
    name: 'Common Corridor',
    shortLabel: 'Corridor',
    defaultWidth: 320,
    defaultHeight: 70,
    fillColor: '#F1F2F6',
    strokeColor: '#475569',
    description: 'Shared hallway or building circulation spine',
  },
  {
    kind: 'wall',
    category: 'structure',
    name: 'Structural Wall',
    shortLabel: 'Wall',
    defaultWidth: 160,
    defaultHeight: 12,
    fillColor: '#121316',
    strokeColor: '#121316',
    description: 'Load-bearing or interior partition wall segment',
  },
  {
    kind: 'column',
    category: 'structure',
    name: 'Structural Column',
    shortLabel: 'Column',
    defaultWidth: 26,
    defaultHeight: 26,
    fillColor: '#121316',
    strokeColor: '#121316',
    description: 'Concrete or steel structural pier',
    canPromoteToAsset: true,
  },
  {
    kind: 'balcony',
    category: 'structure',
    name: 'Balcony / Terrace',
    shortLabel: 'Balcony',
    defaultWidth: 120,
    defaultHeight: 46,
    fillColor: '#F7F6F3',
    strokeColor: '#64748B',
    description: 'Exterior cantilevered balcony or roof deck area',
    canPromoteToAsset: true,
  },

  // Openings
  {
    kind: 'door_swing',
    category: 'openings',
    name: 'Single Swing Door',
    shortLabel: 'Door',
    defaultWidth: 38,
    defaultHeight: 38,
    fillColor: 'transparent',
    strokeColor: '#1C4ED8',
    description: 'Standard 90° architectural swing door',
    canPromoteToAsset: true,
  },
  {
    kind: 'double_door',
    category: 'openings',
    name: 'Double Entry Door',
    shortLabel: 'Dbl Door',
    defaultWidth: 68,
    defaultHeight: 38,
    fillColor: 'transparent',
    strokeColor: '#1C4ED8',
    description: 'Double-leaf lobby, mechanical, or service entrance',
    canPromoteToAsset: true,
  },
  {
    kind: 'sliding_door',
    category: 'openings',
    name: 'Sliding Glass Door',
    shortLabel: 'Slider',
    defaultWidth: 72,
    defaultHeight: 16,
    fillColor: '#EEF3FF',
    strokeColor: '#1C4ED8',
    description: 'Balcony or terrace sliding patio door',
  },
  {
    kind: 'window',
    category: 'openings',
    name: 'Window Bay',
    shortLabel: 'Window',
    defaultWidth: 64,
    defaultHeight: 14,
    fillColor: '#EEF3FF',
    strokeColor: '#2856D6',
    description: 'Exterior glazing mullion window assembly',
    canPromoteToAsset: true,
  },
  {
    kind: 'garage_gate',
    category: 'openings',
    name: 'Garage Overhead Gate',
    shortLabel: 'Gate',
    defaultWidth: 110,
    defaultHeight: 18,
    fillColor: '#FEF3C7',
    strokeColor: '#B45309',
    description: 'Motorized garage entry gate or overhead door',
    canPromoteToAsset: true,
  },

  // Circulation
  {
    kind: 'stairs',
    category: 'circulation',
    name: 'Stairwell Run',
    shortLabel: 'Stairs',
    defaultWidth: 96,
    defaultHeight: 54,
    fillColor: '#F8F3E8',
    strokeColor: '#1C4ED8',
    description: 'Interior or fire egress stairwell with tread lines',
    canPromoteToAsset: true,
  },
  {
    kind: 'elevator',
    category: 'circulation',
    name: 'Elevator Shaft',
    shortLabel: 'Elevator',
    defaultWidth: 74,
    defaultHeight: 74,
    fillColor: '#EEF3FF',
    strokeColor: '#1C4ED8',
    description: 'Passenger or freight elevator cab & hoistway',
    canPromoteToAsset: true,
  },
  {
    kind: 'ladder',
    category: 'circulation',
    name: 'Roof / Hatch Ladder',
    shortLabel: 'Ladder',
    defaultWidth: 28,
    defaultHeight: 52,
    fillColor: '#FFFFFF',
    strokeColor: '#1C4ED8',
    description: 'Fixed steel access ladder to roof or pit',
    canPromoteToAsset: true,
  },
  {
    kind: 'ramp',
    category: 'circulation',
    name: 'Vehicle / ADA Ramp',
    shortLabel: 'Ramp',
    defaultWidth: 140,
    defaultHeight: 68,
    fillColor: '#F1F2F6',
    strokeColor: '#475569',
    description: 'Sloped garage ramp or accessible entry incline',
    canPromoteToAsset: true,
  },

  // MEP & Building Systems
  {
    kind: 'boiler_hvac',
    category: 'systems',
    name: 'Boiler / HVAC Unit',
    shortLabel: 'Boiler/HVAC',
    defaultWidth: 88,
    defaultHeight: 56,
    fillColor: '#EEF3FF',
    strokeColor: '#1C4ED8',
    description: 'Central boiler, chiller, RTU, or air handler',
    canPromoteToAsset: true,
  },
  {
    kind: 'fire_riser',
    category: 'systems',
    name: 'Fire Riser / FACP',
    shortLabel: 'Fire Riser',
    defaultWidth: 64,
    defaultHeight: 46,
    fillColor: '#FEF2F2',
    strokeColor: '#B91C1C',
    description: 'Sprinkler standpipe riser, valve, or fire alarm panel',
    canPromoteToAsset: true,
  },
  {
    kind: 'electrical_panel',
    category: 'systems',
    name: 'Electrical Switchgear',
    shortLabel: 'Elec Panel',
    defaultWidth: 76,
    defaultHeight: 36,
    fillColor: '#FEF3C7',
    strokeColor: '#B45309',
    description: 'Main breaker switchgear or sub-panel cabinet',
    canPromoteToAsset: true,
  },
  {
    kind: 'water_valve',
    category: 'systems',
    name: 'Water Main / Valve',
    shortLabel: 'Valve',
    defaultWidth: 44,
    defaultHeight: 44,
    fillColor: '#EEF3FF',
    strokeColor: '#0369A1',
    description: 'Domestic water shutoff, RPZ backflow, or pump',
    canPromoteToAsset: true,
  },
  {
    kind: 'roof_drain',
    category: 'systems',
    name: 'Roof / Trench Drain',
    shortLabel: 'Drain',
    defaultWidth: 36,
    defaultHeight: 36,
    fillColor: '#EEF3FF',
    strokeColor: '#1C4ED8',
    description: 'Stormwater roof drain, scupper, or sump pit',
    canPromoteToAsset: true,
  },
  {
    kind: 'meter_bank',
    category: 'systems',
    name: 'Utility Meter Bank',
    shortLabel: 'Meters',
    defaultWidth: 110,
    defaultHeight: 34,
    fillColor: '#F1F2F6',
    strokeColor: '#334155',
    description: 'Electric, gas, or water sub-meter rack',
    canPromoteToAsset: true,
  },

  // Exterior & Parking
  {
    kind: 'parking_stall',
    category: 'exterior',
    name: 'Parking Stall',
    shortLabel: 'Parking',
    defaultWidth: 76,
    defaultHeight: 120,
    fillColor: '#FFFFFF',
    strokeColor: '#64748B',
    description: 'Standard 9 ft × 18 ft structured or surface bay',
  },
  {
    kind: 'walkway',
    category: 'exterior',
    name: 'Sidewalk / Paving',
    shortLabel: 'Walkway',
    defaultWidth: 180,
    defaultHeight: 44,
    fillColor: '#EFEDE8',
    strokeColor: '#94A3B8',
    description: 'Concrete entry path, courtyard paver, or drive lane',
  },
  {
    kind: 'courtyard_tree',
    category: 'exterior',
    name: 'Landscape / Tree',
    shortLabel: 'Tree',
    defaultWidth: 48,
    defaultHeight: 48,
    fillColor: '#ECFDF5',
    strokeColor: '#15803D',
    description: 'Site greenery, courtyard tree, or planter',
  },

  // Furniture & Fixtures
  {
    kind: 'desk_table',
    category: 'furniture',
    name: 'Table / Desk',
    shortLabel: 'Table',
    defaultWidth: 68,
    defaultHeight: 42,
    fillColor: '#F7F6F3',
    strokeColor: '#525763',
    description: 'Boardroom table, lobby concierge desk, or dining table',
  },
  {
    kind: 'sofa',
    category: 'furniture',
    name: 'Lobby Sofa / Seating',
    shortLabel: 'Sofa',
    defaultWidth: 76,
    defaultHeight: 34,
    fillColor: '#F7F6F3',
    strokeColor: '#525763',
    description: 'Common-area lounge or unit seating',
  },
  {
    kind: 'bed',
    category: 'furniture',
    name: 'Bed Footprint',
    shortLabel: 'Bed',
    defaultWidth: 62,
    defaultHeight: 74,
    fillColor: '#F7F6F3',
    strokeColor: '#525763',
    description: 'Residential bedroom layout reference',
  },
  {
    kind: 'kitchen_counter',
    category: 'furniture',
    name: 'Counter / Wet Bar',
    shortLabel: 'Counter',
    defaultWidth: 94,
    defaultHeight: 28,
    fillColor: '#F1F2F6',
    strokeColor: '#475569',
    description: 'Millwork counter with sink basin',
  },
  {
    kind: 'storage_rack',
    category: 'furniture',
    name: 'Storage Lockers / Rack',
    shortLabel: 'Lockers',
    defaultWidth: 88,
    defaultHeight: 28,
    fillColor: '#EFEDE8',
    strokeColor: '#525763',
    description: 'Resident storage cages, bike racks, or supply shelves',
  },
  {
    kind: 'workbench',
    category: 'furniture',
    name: 'Maintenance Workbench',
    shortLabel: 'Bench',
    defaultWidth: 80,
    defaultHeight: 32,
    fillColor: '#FEF3C7',
    strokeColor: '#92400E',
    description: 'Superintendent tool bench or workshop counter',
  },

  // Annotations & Zones
  {
    kind: 'zone_callout',
    category: 'annotations',
    name: 'Inspection / Hazard Zone',
    shortLabel: 'Zone',
    defaultWidth: 160,
    defaultHeight: 110,
    fillColor: 'rgba(220, 38, 38, 0.08)',
    strokeColor: '#B91C1C',
    description: 'Dashed area callout for leaks, repairs, or reserve scope',
  },
  {
    kind: 'dimension_line',
    category: 'annotations',
    name: 'Dimension Ruler',
    shortLabel: 'Dimension',
    defaultWidth: 160,
    defaultHeight: 24,
    fillColor: 'transparent',
    strokeColor: '#1C4ED8',
    description: 'Architectural dimension span with automatic foot measurement',
  },
  {
    kind: 'text_label',
    category: 'annotations',
    name: 'Text Callout',
    shortLabel: 'Label',
    defaultWidth: 140,
    defaultHeight: 30,
    fillColor: '#FFFFFF',
    strokeColor: '#CBD5E1',
    description: 'Editable architectural callout or room note',
  },
];

export const DRAFT_COLOR_SWATCHES = [
  { name: 'Architectural White', fill: '#FFFFFF', stroke: '#1C4ED8' },
  { name: 'Mechanical Ice', fill: '#EEF3FF', stroke: '#1C4ED8' },
  { name: 'Common Corridor', fill: '#F1F2F6', stroke: '#475569' },
  { name: 'Warm Stone', fill: '#F7F6F3', stroke: '#525763' },
  { name: 'Obsidian Wall', fill: '#121316', stroke: '#121316' },
  { name: 'Attention Ochre', fill: '#FEF3C7', stroke: '#B45309' },
  { name: 'Alert Crimson', fill: '#FEF2F2', stroke: '#B91C1C' },
  { name: 'Landscape Sage', fill: '#ECFDF5', stroke: '#15803D' },
];

export interface StarterLayoutTemplate {
  id: string;
  name: string;
  subtitle: string;
  levelCode: string;
  elements: Omit<FloorPlanElement, 'id'>[];
}

export const STARTER_LAYOUT_TEMPLATES: StarterLayoutTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Architectural Grid',
    subtitle: 'Empty calibrated blueprint sheet ready for custom drag-and-drop',
    levelCode: 'FL-1',
    elements: [],
  },
  {
    id: 'typical_6unit',
    name: '6-Unit Residential Floor',
    subtitle: 'Central corridor, 6 units, elevator core, and twin stairwells',
    levelCode: 'FL-2',
    elements: [
      { kind: 'corridor', category: 'structure', label: 'Central Corridor', x: 160, y: 260, width: 680, height: 80, rotation: 0, fillColor: '#F1F2F6', strokeColor: '#475569' },
      { kind: 'unit_box', category: 'structure', label: 'Unit 201', x: 100, y: 80, width: 260, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'unit_box', category: 'structure', label: 'Unit 202', x: 360, y: 80, width: 280, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'unit_box', category: 'structure', label: 'Unit 203', x: 640, y: 80, width: 260, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'unit_box', category: 'structure', label: 'Unit 204', x: 100, y: 340, width: 260, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'unit_box', category: 'structure', label: 'Unit 205', x: 360, y: 340, width: 280, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'unit_box', category: 'structure', label: 'Unit 206', x: 640, y: 340, width: 260, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'stairs', category: 'circulation', label: 'Stair A', x: 100, y: 260, width: 60, height: 80, rotation: 0, fillColor: '#F8F3E8', strokeColor: '#1C4ED8' },
      { kind: 'stairs', category: 'circulation', label: 'Stair B', x: 840, y: 260, width: 60, height: 80, rotation: 0, fillColor: '#F8F3E8', strokeColor: '#1C4ED8' },
      { kind: 'elevator', category: 'circulation', label: 'Elevator', x: 465, y: 263, width: 70, height: 74, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
      { kind: 'door_swing', category: 'openings', label: '201 Entry', x: 210, y: 222, width: 38, height: 38, rotation: 0, fillColor: 'transparent', strokeColor: '#1C4ED8' },
      { kind: 'door_swing', category: 'openings', label: '202 Entry', x: 410, y: 222, width: 38, height: 38, rotation: 0, fillColor: 'transparent', strokeColor: '#1C4ED8' },
      { kind: 'door_swing', category: 'openings', label: '203 Entry', x: 730, y: 222, width: 38, height: 38, rotation: 0, fillColor: 'transparent', strokeColor: '#1C4ED8' },
    ],
  },
  {
    id: 'mechanical_basement',
    name: 'Mechanical & Boiler Plant',
    subtitle: 'Boiler room, electrical switchgear, fire riser vault, and storage',
    levelCode: 'B1',
    elements: [
      { kind: 'room', category: 'structure', label: 'Boiler Room', x: 90, y: 70, width: 400, height: 220, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
      { kind: 'room', category: 'structure', label: 'Fire & Riser Vault', x: 490, y: 70, width: 420, height: 220, rotation: 0, fillColor: '#FEF2F2', strokeColor: '#B91C1C' },
      { kind: 'room', category: 'structure', label: 'Electrical Vault', x: 90, y: 290, width: 340, height: 220, rotation: 0, fillColor: '#FEF3C7', strokeColor: '#B45309' },
      { kind: 'room', category: 'structure', label: 'Storage & Workshop', x: 430, y: 290, width: 480, height: 220, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'boiler_hvac', category: 'systems', label: 'Boiler #1', x: 160, y: 150, width: 110, height: 66, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'boiler_hvac', category: 'systems', label: 'Boiler #2', x: 310, y: 150, width: 110, height: 66, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
      { kind: 'fire_riser', category: 'systems', label: 'Main Fire Riser', x: 650, y: 150, width: 90, height: 56, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#B91C1C' },
      { kind: 'electrical_panel', category: 'systems', label: '800A Switchgear', x: 140, y: 390, width: 120, height: 42, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#B45309' },
      { kind: 'meter_bank', category: 'systems', label: 'Unit Meter Bank', x: 280, y: 390, width: 120, height: 42, rotation: 0, fillColor: '#F1F2F6', strokeColor: '#334155' },
      { kind: 'workbench', category: 'furniture', label: 'Maint. Bench', x: 520, y: 420, width: 110, height: 36, rotation: 0, fillColor: '#FEF3C7', strokeColor: '#92400E' },
      { kind: 'storage_rack', category: 'furniture', label: 'Resident Lockers', x: 670, y: 420, width: 180, height: 36, rotation: 0, fillColor: '#EFEDE8', strokeColor: '#525763' },
    ],
  },
  {
    id: 'parking_deck',
    name: 'Garage & Parking Deck',
    subtitle: 'Two rows of parking stalls, drive aisle, entry ramp, and gate',
    levelCode: 'P1',
    elements: [
      { kind: 'room', category: 'structure', label: 'Parking Deck Slab', x: 80, y: 65, width: 840, height: 450, rotation: 0, fillColor: '#F8F8F5', strokeColor: '#1C4ED8' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-1', x: 110, y: 80, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-2', x: 190, y: 80, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-3', x: 270, y: 80, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-4', x: 350, y: 80, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-5', x: 430, y: 80, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-6', x: 510, y: 80, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-7', x: 110, y: 375, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-8', x: 190, y: 375, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-9', x: 270, y: 375, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'parking_stall', category: 'exterior', label: 'P-10', x: 350, y: 375, width: 80, height: 125, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#64748B' },
      { kind: 'ramp', category: 'circulation', label: 'Entry Ramp', x: 690, y: 365, width: 200, height: 130, rotation: 0, fillColor: '#F1F2F6', strokeColor: '#475569' },
      { kind: 'garage_gate', category: 'openings', label: 'Overhead Gate', x: 720, y: 345, width: 140, height: 18, rotation: 0, fillColor: '#FEF3C7', strokeColor: '#B45309' },
      { kind: 'roof_drain', category: 'systems', label: 'Trench Drain', x: 770, y: 300, width: 36, height: 36, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
    ],
  },
];

/**
 * Generates live, unlocked, editable FloorPlanElement[] representations for the
 * 5 built-in demo floorplans so every existing room, unit, stair, boiler, wall,
 * drain, and parking stall can be selected, moved, resized, grouped, or deleted
 * directly inside Floorplan Studio.
 */
export function getEditableElementsForBuiltInKey(planKey?: PlanBuiltInKey): FloorPlanElement[] {
  const stamp = (prefix: string, items: Omit<FloorPlanElement, 'id'>[]): FloorPlanElement[] =>
    items.map((item, idx) => ({ ...item, id: `el-${prefix}-${idx + 1}` }));

  switch (planKey) {
    case 'roof':
      return stamp('roof', [
        // Perimeter parapet walls (leaves roof deck open for easy marquee selection)
        { kind: 'wall', category: 'structure', label: 'North Parapet', x: 90, y: 70, width: 820, height: 12, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'South Parapet', x: 90, y: 500, width: 820, height: 12, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'West Parapet', x: 90, y: 82, width: 12, height: 418, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'East Parapet', x: 898, y: 82, width: 12, height: 418, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        // NW Membrane hazard callout zone
        { kind: 'zone_callout', category: 'annotations', label: 'NW Membrane Zone', x: 114, y: 94, width: 224, height: 144, rotation: 0, fillColor: 'rgba(220, 38, 38, 0.08)', strokeColor: '#DC2626', notes: 'Above Units 601/602 · Scupper #1 · 38% moisture pocket' },
        // Core structures
        { kind: 'room', category: 'structure', label: 'Elevator Penthouse', x: 435, y: 210, width: 160, height: 130, rotation: 0, fillColor: '#F2F4F8', strokeColor: '#1C4ED8', notes: 'Includes roof access hatch' },
        { kind: 'stairs', category: 'circulation', label: 'Stair A', x: 255, y: 240, width: 90, height: 90, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'stairs', category: 'circulation', label: 'Stair B', x: 685, y: 240, width: 90, height: 90, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        // 4 Roof drains
        { kind: 'roof_drain', category: 'systems', label: 'NW Drain', x: 192, y: 147, width: 36, height: 36, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'roof_drain', category: 'systems', label: 'NE Drain', x: 762, y: 147, width: 36, height: 36, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'roof_drain', category: 'systems', label: 'SW Drain', x: 192, y: 417, width: 36, height: 36, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'roof_drain', category: 'systems', label: 'SE Drain', x: 762, y: 417, width: 36, height: 36, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        // Parapet reference labels
        { kind: 'text_label', category: 'annotations', label: 'North Parapet (Courtyard)', x: 110, y: 38, width: 220, height: 26, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#CBD5E1' },
        { kind: 'text_label', category: 'annotations', label: 'South Parapet (Street)', x: 110, y: 520, width: 200, height: 26, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#CBD5E1' },
      ]);

    case 'mechanical':
      return stamp('mech', [
        { kind: 'room', category: 'structure', label: 'Boiler & Hydronic Plant', x: 90, y: 68, width: 380, height: 230, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'room', category: 'structure', label: 'Fire Sprinkler & Alarm Vault', x: 470, y: 68, width: 440, height: 230, rotation: 0, fillColor: '#FDF8F6', strokeColor: '#B91C1C' },
        { kind: 'room', category: 'structure', label: '800A Electrical Vault', x: 90, y: 298, width: 320, height: 214, rotation: 0, fillColor: '#F8FAFC', strokeColor: '#B45309' },
        { kind: 'room', category: 'structure', label: 'Domestic Water & Corridor', x: 410, y: 298, width: 500, height: 214, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'boiler_hvac', category: 'systems', label: 'Peerless 1250 Boiler', x: 195, y: 155, width: 135, height: 90, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'fire_riser', category: 'systems', label: '6" Riser + FACP', x: 650, y: 145, width: 140, height: 80, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#B91C1C' },
        { kind: 'meter_bank', category: 'systems', label: 'Unit Meter Bank', x: 130, y: 395, width: 210, height: 64, rotation: 0, fillColor: '#F1F2F6', strokeColor: '#334155' },
        { kind: 'water_valve', category: 'systems', label: '4" Copper Main + RPZ', x: 520, y: 405, width: 56, height: 56, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'workbench', category: 'furniture', label: 'Maintenance Bench', x: 720, y: 420, width: 120, height: 38, rotation: 0, fillColor: '#FEF3C7', strokeColor: '#92400E' },
      ]);

    case 'typical_floor':
      return stamp('typ', [
        { kind: 'corridor', category: 'structure', label: 'Common Corridor · Floors 2–6', x: 145, y: 245, width: 710, height: 90, rotation: 0, fillColor: '#F2F4F8', strokeColor: '#475569' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X01', x: 85, y: 65, width: 210, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X02', x: 295, y: 65, width: 205, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X03', x: 500, y: 65, width: 205, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X04', x: 705, y: 65, width: 210, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X05', x: 85, y: 335, width: 275, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X06', x: 360, y: 335, width: 280, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Unit X07', x: 640, y: 335, width: 275, height: 180, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'elevator', category: 'circulation', label: 'Elevator', x: 465, y: 250, width: 75, height: 80, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'stairs', category: 'circulation', label: 'Stair A', x: 85, y: 245, width: 60, height: 90, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
        { kind: 'stairs', category: 'circulation', label: 'Stair B', x: 855, y: 245, width: 60, height: 90, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
      ]);

    case 'ground_lobby':
      return stamp('gnd', [
        { kind: 'walkway', category: 'exterior', label: 'North Courtyard & Alley Access', x: 140, y: 58, width: 720, height: 48, rotation: 0, fillColor: '#F1F5F9', strokeColor: '#94A3B8' },
        { kind: 'unit_box', category: 'structure', label: 'Ground Units — West Wing', x: 140, y: 120, width: 260, height: 340, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'room', category: 'structure', label: 'Main Lobby', x: 400, y: 310, width: 200, height: 150, rotation: 0, fillColor: '#F2F4F8', strokeColor: '#1C4ED8' },
        { kind: 'room', category: 'structure', label: 'Mail & Package Room', x: 400, y: 120, width: 200, height: 190, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'unit_box', category: 'structure', label: 'Ground Units — East Wing', x: 600, y: 120, width: 260, height: 340, rotation: 0, fillColor: '#FFFFFF', strokeColor: '#1C4ED8' },
        { kind: 'room', category: 'structure', label: 'Portico', x: 445, y: 460, width: 110, height: 42, rotation: 0, fillColor: '#ECEEF2', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'West Brick Elevation', x: 128, y: 120, width: 12, height: 340, rotation: 0, fillColor: '#FEF3C7', strokeColor: '#B45309', notes: 'Masonry tuckpointing inspection elevation' },
        { kind: 'walkway', category: 'exterior', label: 'Front Sidewalk & Main Entry', x: 260, y: 510, width: 480, height: 38, rotation: 0, fillColor: '#EFEDE8', strokeColor: '#94A3B8' },
        { kind: 'courtyard_tree', category: 'exterior', label: 'NW Tree', x: 76, y: 74, width: 48, height: 48, rotation: 0, fillColor: '#ECFDF5', strokeColor: '#15803D' },
        { kind: 'courtyard_tree', category: 'exterior', label: 'NE Tree', x: 876, y: 74, width: 48, height: 48, rotation: 0, fillColor: '#ECFDF5', strokeColor: '#15803D' },
      ]);

    case 'garage':
      return stamp('gar', [
        // Perimeter garage walls (leaves central drive aisle open for marquee selection)
        { kind: 'wall', category: 'structure', label: 'North Garage Wall', x: 85, y: 68, width: 830, height: 12, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'South Garage Wall', x: 85, y: 504, width: 830, height: 12, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'West Garage Wall', x: 85, y: 80, width: 12, height: 424, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        { kind: 'wall', category: 'structure', label: 'East Garage Wall', x: 903, y: 80, width: 12, height: 424, rotation: 0, fillColor: '#1E293B', strokeColor: '#1C4ED8' },
        // North row parking stalls (P-101 to P-109)
        ...Array.from({ length: 9 }).map((_, i) => ({
          kind: 'parking_stall' as const,
          category: 'exterior' as const,
          label: `P-${101 + i}`,
          x: 115 + i * 76,
          y: 82,
          width: 76,
          height: 120,
          rotation: 0,
          fillColor: '#FFFFFF',
          strokeColor: '#64748B',
        })),
        // Structural Beam B-32 callout
        { kind: 'zone_callout', category: 'annotations', label: 'Beam B-32 & Expansion Joint', x: 115, y: 234, width: 685, height: 40, rotation: 0, fillColor: 'rgba(245, 158, 11, 0.10)', strokeColor: '#B45309', notes: 'Structural engineer crack & efflorescence monitoring zone' },
        // South row parking stalls (P-110 to P-116)
        ...Array.from({ length: 7 }).map((_, i) => ({
          kind: 'parking_stall' as const,
          category: 'exterior' as const,
          label: `P-${110 + i}`,
          x: 115 + i * 76,
          y: 378,
          width: 76,
          height: 120,
          rotation: 0,
          fillColor: '#FFFFFF',
          strokeColor: '#64748B',
        })),
        // Ramp, overhead gate & trench drain
        { kind: 'ramp', category: 'circulation', label: 'Ramp & Gate', x: 685, y: 368, width: 215, height: 132, rotation: 0, fillColor: '#F2F4F8', strokeColor: '#1C4ED8' },
        { kind: 'garage_gate', category: 'openings', label: 'Garage Gate', x: 695, y: 350, width: 195, height: 18, rotation: 0, fillColor: '#FEF3C7', strokeColor: '#B45309' },
        { kind: 'roof_drain', category: 'systems', label: 'Trench Drain', x: 774, y: 306, width: 38, height: 38, rotation: 0, fillColor: '#EEF3FF', strokeColor: '#1C4ED8' },
      ]);

    default:
      return [];
  }
}
