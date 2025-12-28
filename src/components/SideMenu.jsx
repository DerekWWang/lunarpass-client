import React, { useState } from 'react';
import './SideMenu.css';

export function SideMenu({ characterGroups, enabledGroups, onToggleGroup }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                className="menu-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle Menu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}></div>

            <div className={`side-menu ${isOpen ? 'open' : ''}`}>
                <div className="menu-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
                </div>

                <div className="menu-content">
                    <h3>Character Sets</h3>
                    <div className="group-toggles">
                        {Object.entries(characterGroups).map(([key, info]) => (
                            <label key={key} className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={!!enabledGroups[key]}
                                    onChange={() => onToggleGroup(key)}
                                />
                                <span className="toggle-text">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
