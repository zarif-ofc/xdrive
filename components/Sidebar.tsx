'use client';

import React, { useState, useRef, useEffect } from 'react';
import { StorageMetrics } from '@/lib/storage/router';
import { formatBytes } from '@/lib/utils';
import {
  Plus,
  FolderPlus,
  Upload,
  HardDrive,
  Clock,
  PieChart,
  ChevronDown,
  Cloud,
  Server,
} from 'lucide-react';

interface SidebarProps {
  currentFolderId: string;
  onNavigateRoot: () => void;
  onOpenCreateFolderModal: () => void;
  onTriggerFileUpload: (provider?: 'MEGA' | 'FILEN') => void;
  metrics: StorageMetrics | null;
  activeViewCategory: 'drive' | 'recent' | 'storage';
  setActiveViewCategory: (cat: 'drive' | 'recent' | 'storage') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolderId,
  onNavigateRoot,
  onOpenCreateFolderModal,
  onTriggerFileUpload,
  metrics,
  activeViewCategory,
  setActiveViewCategory,
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNewMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalUsed = metrics?.combined.used || 0;
  const totalLimit = metrics?.combined.total || 26 * 1024 * 1024 * 1024;
  const totalPercent = Math.min(100, Math.round((totalUsed / totalLimit) * 100));

  return (
    <aside className="w-60 bg-[#000000] border-r border-[#18181c] flex flex-col justify-between h-screen select-none shrink-0 p-4">
      <div className="space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-1 cursor-pointer" onClick={() => onNavigateRoot()}>
          <div className="w-8 h-8 rounded-xl bg-[#ff2b38] flex items-center justify-center shadow-lg text-white font-extrabold text-lg">
            X
          </div>
          <div>
            <h1 className="text-white font-bold text-base tracking-wide leading-none">Xdrive</h1>
            <span className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Storage</span>
          </div>
        </div>

        {/* New Action Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#ff2b38] hover:bg-[#ff3b48] text-white rounded-2xl shadow-lg transition-all duration-200 font-semibold group"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-5 h-5" />
              <span className="text-sm font-bold tracking-wide">New</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${isNewMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isNewMenuOpen && (
            <div className="absolute left-0 top-14 w-60 bg-[#0d0d0f] border border-[#222226] rounded-2xl shadow-2xl z-50 py-2 space-y-1 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onOpenCreateFolderModal();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#1a1a1e] transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-[#ff2b38]" />
                New Folder
              </button>

              <hr className="border-[#1c1c20] my-1" />

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onTriggerFileUpload();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-[#1a1a1e] transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                Upload File (Smart Router)
              </button>

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onTriggerFileUpload('MEGA');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#1a1a1e] transition-colors"
              >
                <Cloud className="w-4 h-4 text-[#ff2b38]" />
                Upload to MEGA
              </button>

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onTriggerFileUpload('FILEN');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#1a1a1e] transition-colors"
              >
                <Server className="w-4 h-4 text-[#ff2b38]" />
                Upload to Filen
              </button>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <button
            onClick={() => {
              setActiveViewCategory('drive');
              onNavigateRoot();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeViewCategory === 'drive'
                ? 'bg-[#18181c] text-[#ff2b38]'
                : 'text-zinc-400 hover:bg-[#0d0d0f] hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            My Drive
          </button>

          <button
            onClick={() => setActiveViewCategory('recent')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeViewCategory === 'recent'
                ? 'bg-[#18181c] text-[#ff2b38]'
                : 'text-zinc-400 hover:bg-[#0d0d0f] hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Recent
          </button>

          <button
            onClick={() => setActiveViewCategory('storage')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeViewCategory === 'storage'
                ? 'bg-[#18181c] text-[#ff2b38]'
                : 'text-zinc-400 hover:bg-[#0d0d0f] hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Storage Overview
          </button>
        </nav>
      </div>

      {/* Sidebar Footer Stats */}
      <div className="px-2 py-3 border-t border-[#18181c] text-xs text-zinc-500 flex justify-between items-center">
        <span>{formatBytes(totalUsed)} used</span>
        <span>{totalPercent}%</span>
      </div>
    </aside>
  );
};
