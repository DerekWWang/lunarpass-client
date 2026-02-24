import React, { useState, useEffect, useRef } from 'react';
import './FinaleReel.css';

export const FinaleReel = ({ profiles, history, characterGroups, onReset, onDone }) => {
    const [phase, setPhase] = useState('beam');
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    const reelContentRef = useRef(null);
    const scrollPosRef = useRef(0);
    const speedRef = useRef(1);

    useEffect(() => {
        if (phase === 'beam') {
            const timer = setTimeout(() => setPhase('reel'), 3800);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    useEffect(() => {
        if (phase !== 'reel') return;
        const el = reelContentRef.current;
        if (!el) return;

        const BASE_SPEED = 100;
        let lastTime = null;
        let rafId;

        const animate = (time) => {
            if (!lastTime) lastTime = time;
            const delta = (time - lastTime) / 1000;
            lastTime = time;

            const speed = BASE_SPEED * speedRef.current;
            scrollPosRef.current += speed * delta;
            el.style.transform = `translateY(calc(100vh - ${scrollPosRef.current}px))`;

            const totalScroll = el.scrollHeight + window.innerHeight;
            if (scrollPosRef.current < totalScroll) {
                rafId = requestAnimationFrame(animate);
            } else {
                setPhase('end');
            }
        };

        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [phase]);

    const handleClick = () => {
        if (phase === 'reel') {
            speedRef.current *= 2;
            setSpeedMultiplier(speedRef.current);
        }
    };

    const reelProfiles = profiles.filter(p => history[p.id]);
    const grouped = {};
    reelProfiles.forEach(p => {
        if (!grouped[p.group]) grouped[p.group] = [];
        grouped[p.group].push(p);
    });

    return (
        <div className={`finale-overlay phase-${phase}`} onClick={handleClick}>
            {phase === 'beam' && (
                <div className="beam-container">
                    <div className="beam" />
                </div>
            )}

            {phase === 'reel' && (
                <>
                    <div className="reel-fade reel-fade-top" />
                    <div className="reel-fade reel-fade-bottom" />

                    <div className="reel-content" ref={reelContentRef} style={{ transform: 'translateY(100vh)' }}>
                        <div className="reel-spacer" />
                        {Object.entries(grouped).map(([groupKey, groupProfiles]) => (
                            <div key={groupKey} className="reel-group">
                                <div className="reel-group-header">
                                    <span className="reel-divider-line" />
                                    <span className="reel-group-name">
                                        {characterGroups[groupKey]?.name || groupKey}
                                    </span>
                                    <span className="reel-divider-line" />
                                </div>
                                {groupProfiles.map(p => (
                                    <div key={p.id} className="reel-entry">
                                        <div className="reel-name">{p.name}</div>
                                        <div className={`reel-decision ${history[p.id] === 'smash' ? 'decision-smash' : 'decision-pass'}`}>
                                            {history[p.id] === 'smash' ? 'SMASH' : 'PASS'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div className="reel-spacer" />
                    </div>

                    <div className="speed-indicator">
                        {speedMultiplier > 1 ? `${'▶'.repeat(Math.min(Math.log2(speedMultiplier) + 1, 5))} ${speedMultiplier}× · click to go faster` : '▶ click to speed up'}
                    </div>
                </>
            )}

            {phase === 'end' && (
                <div className="finale-end">
                    <div className="finale-fin">Fin</div>
                    <div className="finale-buttons">
                        <button
                            className="btn-finale btn-finale-reset"
                            onClick={(e) => { e.stopPropagation(); onReset(); }}
                        >
                            Reset History
                        </button>
                        <button
                            className="btn-finale btn-finale-done"
                            onClick={(e) => { e.stopPropagation(); onDone(); }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
