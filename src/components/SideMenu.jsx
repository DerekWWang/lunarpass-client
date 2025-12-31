import React, { useState } from 'react';
import './SideMenu.css';

export function SideMenu({ characterGroups, enabledGroups, onToggleGroup, isOpen, onClose }) {
    return (
        <>
            <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>

            <div className={`side-menu ${isOpen ? 'open' : ''}`}>
                <div className="menu-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
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
