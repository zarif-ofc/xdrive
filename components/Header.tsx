'use client';

import React from 'react';
import { Search, LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}) => {
  return (
    <header className="h-16 border-b border-drive-border px-6 flex items-center justify-between bg-drive-bg gap-4 shrink-0">
      {/* Search Input Bar */}
      <div className="relative flex-1 max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-drive-muted">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files and folders in Drive..."
          className="w-full bg-drive-surface text-drive-text pl-10 pr-10 py-2.5 rounded-full text-sm placeholder-drive-muted border border-transparent focus:border-drive-accent focus:outline-none transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-drive-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        {/* Sort Selector Dropdown */}
        <div className="flex items-center gap-2 bg-drive-surface px-3 py-1.5 rounded-lg border border-drive-border text-sm text-drive-text">
          <SlidersHorizontal className="w-4 h-4 text-drive-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-drive-text text-sm border-none focus:outline-none cursor-pointer pr-1"
          >
            <option value="name_asc" className="bg-drive-surface text-white">Name (A to Z)</option>
            <option value="name_desc" className="bg-drive-surface text-white">Name (Z to A)</option>
            <option value="date_desc" className="bg-drive-surface text-white">Date (Newest first)</option>
            <option value="date_asc" className="bg-drive-surface text-white">Date (Oldest first)</option>
            <option value="size_desc" className="bg-drive-surface text-white">Size (Largest first)</option>
            <option value="size_asc" className="bg-drive-surface text-white">Size (Smallest first)</option>
            <option value="provider" className="bg-drive-surface text-white">Provider (MEGA / Filen)</option>
          </select>
        </div>

        {/* Grid vs List View Toggle */}
        <div className="flex items-center bg-drive-surface rounded-lg p-1 border border-drive-border">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid' ? 'bg-drive-hover text-drive-accent font-bold' : 'text-drive-muted hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-drive-hover text-drive-accent font-bold' : 'text-drive-muted hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Avatar Pill */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-drive-accent text-white font-bold flex items-center justify-center shadow-md text-sm border border-white/20 ml-2">
          U
        </div>
      </div>
    </header>
  );
};
