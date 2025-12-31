import React, { useState } from 'react';
import '../App.css';

export const StatsPage = ({ history, allProfiles, onRestart, onClose }) => {
    const [expandedCategory, setExpandedCategory] = useState(null);

    const smashes = Object.values(history).filter(h => h === 'smash').length;
    const passes = Object.values(history).filter(h => h === 'pass').length;
    const total = smashes + passes;

    const smashRate = total > 0 ? Math.round((smashes / total) * 100) : 0;

    const getList = (type) => {
        return allProfiles.filter(p => history[p.id] === type);
    };

    const currentList = expandedCategory ? getList(expandedCategory) : [];

    return (
        <div className="modal-overlay">
            <div className="stats-container">
                <h1>Stats</h1>
                <div className="stats-summary">
                    <div
                        className={`stat-item interactive ${expandedCategory === 'smash' ? 'active' : ''}`}
                        onClick={() => setExpandedCategory(expandedCategory === 'smash' ? null : 'smash')}
                    >
                        <span className="stat-value text-smash">{smashes}</span>
                        <span className="stat-label">Smashes</span>
                    </div>
                    <div
                        className={`stat-item interactive ${expandedCategory === 'pass' ? 'active' : ''}`}
                        onClick={() => setExpandedCategory(expandedCategory === 'pass' ? null : 'pass')}
                    >
                        <span className="stat-value text-pass">{passes}</span>
                        <span className="stat-label">Passes</span>
                    </div>
                </div>

                {expandedCategory && (
                    <div className="stats-list">
                        <h3>{expandedCategory === 'smash' ? 'Smashed' : 'Passed'}</h3>
                        <ul>
                            {currentList.map(p => (
                                <li key={p.id}>{p.name}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {!expandedCategory && <p className="smash-rate">Smash Rate: {smashRate}%</p>}

                <div className="stats-actions">
                    {onRestart && (
                        <button onClick={onRestart} className="btn btn-reset-large">
                            Restart
                        </button>
                    )}
                    {onClose && (
                        <button onClick={onClose} className="btn btn-close-modal">
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
