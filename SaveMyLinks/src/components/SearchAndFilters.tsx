import { useState } from 'react';
import { Search, Filter, X, Star, SortAsc, SortDesc } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';

export function SearchAndFilters() {
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    sortBy,
    setSortBy,
    showStarredOnly,
    setShowStarredOnly,
    showRecentsOnly,
    setShowRecentsOnly,
    tags,
    clearAllFilters
  } = useApp();
  
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleTag = (tag: string) => {
    setSelectedTags(
      selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag]
    );
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || showStarredOnly || showRecentsOnly || sortBy !== 'newest';

  return (
    <div className="card-dark rounded-xl shadow-sm border overflow-hidden transition-colors duration-200 ease-in-out">
      <div className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 mb-6">
          <div className="relative flex-1 min-h-[48px]">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                navigate(location.pathname, { replace: true });
              }}
              className="w-full pl-14 pr-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted min-h-[48px] text-base"
              placeholder="Search links, notes, or tags..."
            />
            <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-12 h-full bg-input border-y border-l border-input-border rounded-l-lg pointer-events-none">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-secondary min-h-[44px] flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="btn btn-secondary min-h-[44px] flex items-center gap-2"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-6 pt-4 border-t border-input-border space-y-4">
            {/* Sort Options */}
            <div>
              <label className="block text-base font-medium font-sans text-main mb-2">
                Sort by
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'newest', label: 'Newest First', icon: SortDesc },
                  { value: 'oldest', label: 'Oldest First', icon: SortAsc },
                  { value: 'starred', label: 'Starred First', icon: Star }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSortBy(value as any)}
                    className={`px-3 py-2 rounded-full text-sm font-medium body-sm transition-colors flex items-center gap-2 border ${
                      sortBy === value
                        ? 'bg-chip text-chip border-chip-border'
                        : 'bg-chip-muted text-chip-muted border-chip-border hover:bg-card-hover'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center mt-4">
              <label className="block text-base font-medium font-sans text-main mb-2 mr-4">
                Quick Filters
              </label>
              <button
                onClick={() => setShowStarredOnly(!showStarredOnly)}
                className={`px-3 py-2 rounded-full text-sm font-medium body-sm transition-colors flex items-center gap-2 border ${
                  showStarredOnly
                    ? 'bg-chip text-chip border-chip-border'
                    : 'bg-chip-muted text-chip-muted border-chip-border hover:bg-card-hover'
                }`}
              >
                <Star className="w-4 h-4" />
                Starred Only
              </button>
              <button
                onClick={() => setShowRecentsOnly(!showRecentsOnly)}
                className={`ml-2 px-3 py-2 rounded-full text-sm font-medium body-sm transition-colors flex items-center gap-2 border ${
                  showRecentsOnly
                    ? 'bg-chip text-chip border-chip-border'
                    : 'bg-chip-muted text-chip-muted border-chip-border hover:bg-card-hover'
                }`}
              >
                <SortDesc className="w-4 h-4" />
                Recents Only
              </button>
            </div>

            {/* Tag Filters */}
            {tags.length > 0 && (
              <div>
                <label className="block text-base font-medium font-sans text-main mb-2">
                  Filter by Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-2 rounded-full text-sm font-medium body-sm transition-colors border ${
                        selectedTags.includes(tag)
                          ? 'bg-chip text-chip border-chip-border'
                          : 'bg-chip-muted text-chip-muted border-chip-border hover:bg-card-hover'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}