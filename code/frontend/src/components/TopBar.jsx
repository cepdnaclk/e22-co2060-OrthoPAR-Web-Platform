import React from 'react';

// SVG Icons
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const TopBar = ({ title, subtitle, onSearch }) => {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
      
      <div className="topbar-right">
        <div className="topbar-search">
          <span className="topbar-search-icon">
            <SearchIcon />
          </span>
          <input 
            type="text" 
            className="topbar-search-input" 
            placeholder="Search Patient ID..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>
        
        <div className="topbar-profile">
          <div className="topbar-avatar">DC</div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;