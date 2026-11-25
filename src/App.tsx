/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  DollarSign,
  Gavel,
  LayoutDashboard,
  Map,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { CondoCoreProvider, useCondoCore } from './store/CondoCoreContext';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { BoardNavTab, UserRole } from './types/condocore';
import { ROLE_ACTORS } from './data/seedData';
import { CondoCoreLogo } from './components/CondoCoreLogo';
import { TodayDashboard } from './components/TodayDashboard';
import { BuildingMapView } from './components/BuildingMapView';
import { InspectionsMaintenanceView } from './components/InspectionsMaintenanceView';
import { VendorsView } from './components/VendorsView';
import { FinancialsView } from './components/FinancialsView';
import { GovernanceView } from './components/GovernanceView';
import { ResidentPortalView } from './components/ResidentPortalView';
import { HelpCenterView } from './components/HelpCenterView';
import { SettingsView } from './components/SettingsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AssetDossierDrawer } from './components/AssetDossierDrawer';
import { WorkOrderDrawer } from './components/WorkOrderDrawer';

const PRIMARY_NAV_ITEMS: { id: BoardNavTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today Action Center', shortLabel: 'Today', icon: LayoutDashboard },
  { id: 'map', label: 'Building Map & Assets', shortLabel: 'Map', icon: Map },
  { id: 'inspections', label: 'Inspections & Work Orders', shortLabel: 'Work', icon: ClipboardCheck },
  { id: 'vendors', label: 'Vendors & Contracts', shortLabel: 'Vendors', icon: Users },
  { id: 'financials', label: 'Assessments & Financials', shortLabel: 'Money', icon: DollarSign },
  { id: 'governance', label: 'Governance & Audit', shortLabel: 'Board', icon: Gavel },
];

const UTILITY_NAV_ITEMS: { id: BoardNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'help', label: 'Help & Operations Guide', icon: BookOpen },
  { id: 'settings', label: 'Settings & PWA Install', icon: Settings },
];

const ALL_NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...UTILITY_NAV_ITEMS];

const ROLE_OPTIONS: UserRole[] = [
  'president',
  'treasurer',
  'secretary',
  'board_member',
  'resident',
  'vendor',
  'auditor',
];

function getInitials(name: string): string {
  const cleaned = name.replace(/\s*\(.*?\)\s*/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function CondoCoreShell() {
  const {
    state,
    activeRole,
    actor,
    setActiveRole,
    activeTab,
    setActiveTab,
    setShowOnboardingWizard,
    toasts,
    dismissToast,
  } = useCondoCore();

  const isOnline = useOnlineStatus();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isResident = activeRole === 'resident';
  const currentNavLabel = isResident
    ? `Resident Portal · Unit ${actor.unitNumber}`
    : ALL_NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Today Action Center';

  const openAlertsCount =
    state.invoices.filter((i) => i.status === 'received' || i.status === 'first_approval').length +
    state.workOrders.filter((w) => w.unreadByBoard).length;

  const getRoleOptionLabel = (r: UserRole) => {
    const bm = state.boardMembers.find((m) => m.role === r);
    if (bm) return `${bm.title} — ${bm.name}`;
    if (r === 'resident') {
      const u = state.units.find((un) => un.unitNumber === '402') || state.units[0];
      if (u) return `Resident (Unit ${u.unitNumber}) — ${u.ownerName}`;
    }
    return `${ROLE_ACTORS[r].title} — ${ROLE_ACTORS[r].name.split(' (')[0]}`;
  };

  return (
    <div className="min-h-screen lg:h-dvh lg:overflow-hidden bg-[#F4F5F7] text-[#111318] flex">
      {/* Desktop Obsidian Architectural Command Rail (Board / Vendor / Auditor Roles Only) */}
      {!isResident && (
        <aside className="hidden lg:flex lg:flex-col lg:w-[264px] lg:fixed lg:inset-y-0 bg-[#111318] text-white border-r border-white/[0.08] z-30">
          {/* Brand Header */}
          <div className="h-[64px] px-5 flex items-center justify-between border-b border-white/[0.08] shrink-0">
            <CondoCoreLogo variant="lockup" size="sm" theme="dark" showTagline />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#F0C05A] shrink-0"
              aria-hidden="true"
            />
          </div>

          {/* Association Identity Plate */}
          <div className="mx-3.5 mt-4 mb-2 px-3.5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0">
            <div className="text-[13px] font-display font-semibold text-white truncate">
              {state.settings.name}
            </div>
            <div className="flex items-center justify-between text-xs text-[#9BA1AE] mt-1.5">
              <span className="tabular-nums font-medium">{state.settings.unitCount} Units</span>
              <button
                type="button"
                onClick={() => setShowOnboardingWizard(true)}
                className="inline-flex items-center gap-1 text-[#93B4FD] hover:text-white font-semibold transition-colors"
              >
                <Plus className="w-3 h-3" />
                New Building
              </button>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="flex-1 px-3 py-2.5 space-y-1 overflow-y-auto" aria-label="Board modules">
            <div className="px-3 pb-1.5 text-[11px] font-display font-semibold tracking-wide text-[#7E8596]">
              Operations
            </div>
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1C4ED8] text-white shadow-[0_4px_14px_-4px_rgba(28,78,216,0.55),inset_0_1px_0_rgba(255,255,255,0.2)]'
                      : 'text-[#A6ACB9] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#777E8E]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'today' && openAlertsCount > 0 && (
                    <span
                      className={`font-mono text-[11px] font-semibold tabular-nums ${
                        isActive ? 'text-[#F0C05A]' : 'text-[#F87171]'
                      }`}
                    >
                      {openAlertsCount}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-5 mt-4 border-t border-white/[0.08] space-y-1">
              <div className="px-3 pb-1.5 text-[11px] font-display font-semibold tracking-wide text-[#7E8596]">
                Workspace &amp; Guide
              </div>
              {UTILITY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#1C4ED8] text-white shadow-[0_4px_14px_-4px_rgba(28,78,216,0.55),inset_0_1px_0_rgba(255,255,255,0.2)]'
                        : 'text-[#A6ACB9] hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#777E8E]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer Actor Summary */}
          <div className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#1C4ED8]/20 text-[#93B4FD] font-display text-xs font-bold flex items-center justify-center shrink-0 border border-[#3B6CF5]/35">
              {getInitials(actor.name)}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-display font-semibold text-white truncate">{actor.name}</div>
              <div className="text-xs text-[#9BA1AE] truncate">
                {actor.title}
                {actor.unitNumber ? ` · Unit ${actor.unitNumber}` : ''}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile Obsidian Navigation Drawer */}
      {!isResident && mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#111318]/60 backdrop-blur-xs flex"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] bg-[#111318] text-white h-full border-r border-white/[0.08] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-5 flex items-center justify-between border-b border-white/[0.08]">
              <CondoCoreLogo variant="lockup" size="sm" theme="dark" />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-2 text-[#8E95A5] hover:text-white"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3.5 bg-white/[0.04] border-b border-white/[0.08] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-display font-semibold text-white truncate">{state.settings.name}</div>
                <div className="text-xs text-[#8E95A5] tabular-nums">{state.settings.unitCount} Units</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  setShowOnboardingWizard(true);
                }}
                className="text-xs font-semibold text-[#93B4FD] hover:underline shrink-0"
              >
                New Building
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {ALL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium rounded-xl min-h-[42px] transition-colors ${
                      isActive
                        ? 'bg-[#1C4ED8] text-white'
                        : 'text-[#A6ACB9] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#777E8E]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Shell — Locked height on Desktop so module headers/filters stay fixed while tables & cards scroll */}
      <div className={`flex-1 flex flex-col min-w-0 lg:h-dvh lg:overflow-hidden ${!isResident ? 'lg:pl-[264px]' : ''}`}>
        {/* Clean Glassmorphic Single-Row Top Bar */}
        <header className="sticky top-0 z-20 h-13 sm:h-[64px] shrink-0 bg-white/85 backdrop-blur-md border-b border-black/[0.06] px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isResident ? (
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-1.5 text-[#525866] hover:text-[#111318]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              <CondoCoreLogo variant="lockup" size="xs" className="shrink-0" />
            )}

            <div className="flex items-center gap-2 text-[13px] text-[#525866] min-w-0">
              <span className="hidden sm:inline font-medium truncate">{state.settings.name}</span>
              <span aria-hidden="true" className="hidden sm:inline text-[#1C4ED8] font-semibold">/</span>
              <span className="font-display font-semibold text-[#111318] truncate">{currentNavLabel}</span>
            </div>
          </div>

          {/* Instant Role Switcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            <label htmlFor="role-switcher" className="hidden md:inline text-xs font-medium text-[#525866] whitespace-nowrap">
              Acting Role
            </label>
            <select
              id="role-switcher"
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              className="px-3 py-1.5 text-xs font-medium bg-[#F8F9FB] border border-black/[0.1] rounded-xl text-[#111318] shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:border-[#1C4ED8] hover:border-[#1C4ED8]/50 transition-colors max-w-[170px] sm:max-w-[270px]"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {getRoleOptionLabel(r)}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Offline Continuity Strip (Only visible when device loses connectivity) */}
        {!isOnline && (
          <div className="shrink-0 bg-[#FFFBEB] border-b border-[#F59E0B]/30 px-4 sm:px-8 py-2 flex items-center gap-2 text-xs text-[#92400E]">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              Offline Mode Active — Local building records, maps, and checklists remain available. Changes save locally on this device.
            </span>
          </div>
        )}

        {/* Active Role Guard Notice for Read-Only Auditor or Vendor */}
        {(activeRole === 'auditor' || activeRole === 'vendor') && (
          <div className="shrink-0 bg-[#EEF3FF] border-b border-[#C7D7FE] px-4 sm:px-8 py-2 text-xs text-[#1E3A8A]">
            {activeRole === 'auditor'
              ? 'Read-Only Auditor Mode — Full access to financial ledgers, invoices, decisions, and immutable audit log; write controls disabled.'
              : `Vendor Mode (${actor.name}) — Confidential board pricing notes and internal assessments are hidden; you can log work order findings and invoices.`}
          </div>
        )}

        {/* Viewport Workspace — On desktop, fills remaining viewport height so module headers/filters stay fixed */}
        <main className={`flex-1 min-h-0 flex flex-col px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1520px] w-full mx-auto lg:overflow-hidden ${!isResident ? 'pb-20 lg:pb-6' : ''}`}>
          {isResident ? (
            <div className="flex-1 min-h-0 lg:overflow-y-auto pr-0.5">
              <ResidentPortalView />
            </div>
          ) : (
            <>
              {activeTab === 'today' && <TodayDashboard />}
              {activeTab === 'map' && <BuildingMapView />}
              {activeTab === 'inspections' && <InspectionsMaintenanceView />}
              {activeTab === 'vendors' && <VendorsView />}
              {activeTab === 'financials' && <FinancialsView />}
              {activeTab === 'governance' && <GovernanceView />}
              {activeTab === 'help' && <HelpCenterView />}
              {activeTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Compact Mobile Bottom Navigation Bar (Board Roles Only, 54px high) */}
      {!isResident && (
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E6E4DE] safe-pb no-print"
        >
          <div className="grid grid-cols-5 h-[54px]">
            {[
              { id: 'today' as BoardNavTab, label: 'Today', icon: LayoutDashboard },
              { id: 'map' as BoardNavTab, label: 'Map', icon: Map },
              { id: 'inspections' as BoardNavTab, label: 'Work', icon: ClipboardCheck },
              { id: 'financials' as BoardNavTab, label: 'Money', icon: DollarSign },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-[#1C4ED8]' : 'text-[#525763]'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 inset-x-4 h-[2.5px] bg-[#1C4ED8]"
                    />
                  )}
                  <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.25]' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                ['vendors', 'governance', 'help', 'settings'].includes(activeTab)
                  ? 'text-[#1C4ED8]'
                  : 'text-[#525763]'
              }`}
            >
              {['vendors', 'governance', 'help', 'settings'].includes(activeTab) && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-4 h-[2.5px] bg-[#1C4ED8]"
                />
              )}
              <MoreHorizontal className="w-4 h-4" />
              <span>More</span>
            </button>
          </div>
        </nav>
      )}

      {/* Global Onboarding Wizard */}
      <OnboardingWizard />

      {/* Global Cross-Linked Entity Drawers (Never mount internal board drawers in Resident mode) */}
      {!isResident && (
        <>
          <AssetDossierDrawer />
          <WorkOrderDrawer />
        </>
      )}

      {/* Confirmation Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-5 right-3 sm:right-5 z-50 flex flex-col gap-2 max-w-sm no-print">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="bg-[#121316] text-white px-4 py-3 rounded-lg shadow-2xl border border-[#2C3140] flex items-start justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#3B6CF5] shrink-0" aria-hidden="true" />
                  <span>{t.title}</span>
                </div>
                {t.detail && <div className="text-[#A6ACB9] mt-0.5 pl-3.5">{t.detail}</div>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-[#8E95A5] hover:text-white shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CondoCoreProvider>
      <CondoCoreShell />
    </CondoCoreProvider>
  );
}
