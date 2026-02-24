import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'
import { Card } from './components/Card'
import { SideMenu } from './components/SideMenu'
import { StatsPage } from './components/StatsPage'
import { FinaleReel } from './components/FinaleReel'
import { fetchCharacterStats, submitAllResults } from './lib/db'

const CHARACTER_GROUPS = {
  "limbus": { id: "limbus", name: "Limbus Company", url: "/limbus.json" },
  "leviathan": { id: "leviathan", name: "Leviathan", url: "/leviathan.json" },
  "distortion Detective": { id: "distortiondetective", name: "Distortion Detective", url: "/ddetective.json" },
};

function App() {
  const [allProfiles, setAllProfiles] = useState([]);
  const [bgData, setBgData] = useState(null);
  const [enabledGroups, setEnabledGroups] = useState(() => {
    // Default to all enabled
    return Object.keys(CHARACTER_GROUPS).reduce((acc, key) => ({ ...acc, [key]: true }), {});
  });
  const [index, setIndex] = useState(() => {
    const saved = localStorage.getItem('lunarpass-index');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' | 'right'
  const [lastSwipeDirection, setLastSwipeDirection] = useState(null); // Direction the PREVIOUS card went
  const [tilt, setTilt] = useState(0); // Current card tilt
  // History state initialized from localStorage
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('lunarpass-history');
    return saved ? JSON.parse(saved) : {};
  });
  const [smashShake, setSmashShake] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("You have not made a choice for this city dweller yet.");
  const [showStats, setShowStats] = useState(false);
  const [showFinale, setShowFinale] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const hasSubmitted = useRef(false);

  // Persist history to localStorage
  useEffect(() => {
    localStorage.setItem('lunarpass-history', JSON.stringify(history));
  }, [history]);

  // Persist index to localStorage
  useEffect(() => {
    localStorage.setItem('lunarpass-index', index.toString());
  }, [index]);

  // Derived stats
  const smashCount = Object.values(history).filter(action => action === 'smash').length;
  const passCount = Object.values(history).filter(action => action === 'pass').length;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const bgRes = await fetch('/bga/bg.json');
        const bg = await bgRes.json();
        setBgData(bg);

        const promises = Object.entries(CHARACTER_GROUPS).map(async ([groupKey, groupInfo]) => {
          const res = await fetch(groupInfo.url);
          const data = await res.json();
          return Object.entries(data).map(([id, item]) => ({
            id,
            group: groupKey,
            name: item.name,
            bio: item.flavor_text,
            image: item.image_path.replace('/Users/derekzhu/Code/lunarpass/mooncrawler/downloads', '/media'),
            url: item.url,
            bgart: item.bgart || null,
            is_sus: item.is_sus || false,
            age: null
          }));
        });

        const results = await Promise.all(promises);
        const combined = results.flat();
        setAllProfiles(combined);
        setTilt(Math.random() * 10 - 5);
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    };

    fetchAllData();
  }, []);

  // Filter profiles based on enabled groups
  const profiles = useMemo(() => {
    return allProfiles.filter(p => enabledGroups[p.group]);
  }, [allProfiles, enabledGroups]);

  // Smart Index Resumption
  // When available profiles change (due to group toggle), ensure we are at a valid position.
  // Specifically: "resume" from the first character in the new list that hasn't been acted on yet.
  useEffect(() => {
    if (profiles.length === 0) return;

    // Check if current index is valid or we need to jump
    // We want to find the first index 'i' where profiles[i].id is NOT in history.
    const firstUnplayedIndex = profiles.findIndex(p => !history[p.id]);

    if (firstUnplayedIndex !== -1) {
      // If we found a resume point, jump there.
      // Only update if it's different to prevent loops/jitters, 
      // but strictly we should enforce this to ensure we don't skip or re-show completed ones incorrectly
      // if the list drastically changed.
      setIndex(firstUnplayedIndex);
    } else {
      // All finished? Go to end or keep current if valid.
      // We don't loop here automatically anymore if we want a stats page.
      // If index >= length, we let it stay there to show stats.
    }
    // We deliberately depend on `profiles` (which changes when groups change).
    // We do NOT depend on `index` here to avoid reset loops.
    // We also remove `history` from dependencies so this only runs when the *set* of profiles changes,
    // explicitly for the "Group Toggle" resumption feature.
    // Normal gameplay updates history, which shouldn't trigger this "seek" logic.
  }, [profiles]);

  const getBackgroundUrl = (profile) => {
    if (!bgData || !profile) return null;
    if (profile.bgart) {
      const groupBg = bgData[profile.group];
      if (groupBg && groupBg[profile.bgart]) return groupBg[profile.bgart];
    }
    return bgData.default || null;
  };

  const currentProfile = profiles[index];
  const nextProfile = profiles[(index + 1) % profiles.length];



  const handleSwipe = (direction) => {
    if (swipeDirection || profiles.length === 0 || !currentProfile) return;

    // Sus Check
    if (direction === 'left' && currentProfile.is_sus) {
      setSmashShake(true);
      setTimeout(() => setSmashShake(false), 500); // Duration matches CSS animation
      return;
    }

    // Update history
    setHistory(prev => ({
      ...prev,
      [currentProfile.id]: direction === 'left' ? 'smash' : 'pass'
    }));

    // Fetch community stats for this character
    const userChoice = direction === 'left' ? 'smash' : 'pass';
    const profileName = currentProfile.name;
    const profileId = currentProfile.id;
    fetchCharacterStats(profileId).then(stats => {
      if (stats) {
        setCommunityStats({ name: profileName, userChoice, ...stats });
      }
    });

    const willFinish = index + 1 >= profiles.length;

    setSwipeDirection(direction);

    setTimeout(() => {
      setLastSwipeDirection(direction);
      setIndex((prevIndex) => prevIndex + 1);
      setSwipeDirection(null);
      setTilt(Math.random() * 10 - 5);
      if (willFinish) {
        setCommunityStats(null);
        setShowFinale(true);
      }
    }, 500);
  };

  // Prevent wrapping in handleForward too
  const handleForward = () => {
    if (!currentProfile) return;

    // Check if choice made
    if (history[currentProfile.id]) {
      // Allow forward
      setIndex(prevIndex => prevIndex + 1);
      setSwipeDirection(null);
      setLastSwipeDirection(null);
    } else {
      // Deny forward
      setWarningMessage("You have not made a choice for this city dweller yet.");
      setShowWarning(true);
    }
  };

  const handleToggleGroup = (groupKey) => {
    // If disabling...
    if (enabledGroups[groupKey]) {
      // Check if any history items belong to this group
      // We need to look up which IDs belong to this group.
      // Since `profiles` is filtered, we look at `allProfiles`
      const groupProfileIds = allProfiles
        .filter(p => p.group === groupKey)
        .map(p => p.id);

      const hasHistory = groupProfileIds.some(id => history[id]);

      if (hasHistory) {
        setWarningMessage("You cannot unselect characterset when you have already made choices.");
        setShowWarning(true);
        return;
      }
    }

    setEnabledGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setHistory({});
    localStorage.removeItem('lunarpass-history');

    setIndex(0);
    localStorage.removeItem('lunarpass-index');

    setSwipeDirection(null);
    setLastSwipeDirection(null);
    hasSubmitted.current = false;
    setCommunityStats(null);
    setShowResetConfirm(false);
  };

  // Submit all results to the DB when the finale starts
  useEffect(() => {
    if (!showFinale || hasSubmitted.current) return;
    hasSubmitted.current = true;
    submitAllResults(history);
  }, [showFinale]);

  useEffect(() => {
    if (profiles.length === 0) return;

    const PRELOAD_COUNT = 3;
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const nextIndex = (index + i) % profiles.length;
      const profile = profiles[nextIndex];
      if (profile) {
        const urlToCheck = profile.url || profile.image;
        if (urlToCheck) {
          const img = new Image();
          img.src = urlToCheck;
        }
        const bgUrl = getBackgroundUrl(profile);
        if (bgUrl) {
          const bgImg = new Image();
          bgImg.src = bgUrl;
        }
      }
    }
  }, [index, profiles, bgData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('right');
      } else if (e.key === 'ArrowDown') {
        // Backtracking
        setIndex(prevIndex => Math.max(0, prevIndex - 1));
        setSwipeDirection(null);
        setLastSwipeDirection(null);
      } else if (e.key === 'ArrowUp') {
        handleForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swipeDirection, profiles.length, handleSwipe, handleForward]);

  if (profiles.length === 0) {
    return <div className="app-container"><div className="loading">Loading profiles...</div></div>;
  }

  const handleFinaleReset = () => {
    setHistory({});
    localStorage.removeItem('lunarpass-history');
    setIndex(0);
    localStorage.removeItem('lunarpass-index');
    setSwipeDirection(null);
    setLastSwipeDirection(null);
    setShowFinale(false);
    hasSubmitted.current = false;
    setCommunityStats(null);
  };

  if (index >= profiles.length) {
    if (showFinale) {
      return (
        <FinaleReel
          profiles={profiles}
          history={history}
          characterGroups={CHARACTER_GROUPS}
          onReset={handleFinaleReset}
          onDone={() => { setShowFinale(false); setIndex(0); }}
        />
      );
    }
    return <StatsPage history={history} allProfiles={allProfiles} onRestart={handleReset} />;
  }

  // Pass CSS variable for tilt to be used in animations
  const cardStyle = {
    '--tilt': `${tilt}deg`
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button
          className="btn-menu"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Open Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1>moonpass</h1>
        <button className="btn-stats" onClick={() => setShowStats(true)} aria-label="View Stats">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="18" y="3" width="4" height="18" rx="1"></rect>
            <rect x="10" y="9" width="4" height="12" rx="1"></rect>
            <rect x="2" y="14" width="4" height="7" rx="1"></rect>
          </svg>
        </button>
      </header>

      <SideMenu
        characterGroups={CHARACTER_GROUPS}
        enabledGroups={enabledGroups}
        onToggleGroup={handleToggleGroup}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
      <div className="card-stack">
        <Card
          key={currentProfile.id}
          profile={currentProfile}
          backgroundUrl={getBackgroundUrl(currentProfile)}
          swipeStatus={swipeDirection}
          enteringFrom={lastSwipeDirection}
          style={cardStyle}
        />

        {/* Next card placeholder */}
        {nextProfile && (
          <div className="card-placeholder"></div>
        )}
      </div>

      <div className="progress-indicator">
        City Dweller {index + 1} of {profiles.length}
      </div>

      <div className="controls">
        <button
          onClick={() => handleSwipe('left')}
          className={`btn btn-smash ${history[currentProfile?.id] === 'smash' ? 'active-choice' : ''} ${smashShake ? 'shake' : ''}`}
        >
          <span className="btn-label">Smash</span>
          <span className="btn-count">{smashCount}</span>
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className={`btn btn-pass ${history[currentProfile?.id] === 'pass' ? 'active-choice' : ''}`}
        >
          <span className="btn-label">Pass</span>
          <span className="btn-count">{passCount}</span>
        </button>
      </div>

      {communityStats && (() => {
        const total = communityStats.smashes + communityStats.passes;
        const smashPct = total > 0 ? Math.round((communityStats.smashes / total) * 100) : 0;
        const passPct = total > 0 ? 100 - smashPct : 0;
        const agreePct = communityStats.userChoice === 'smash' ? smashPct : passPct;
        return (
          <div className="community-stats">
            <p className="community-stats-title">
              What others chose for <strong>{communityStats.name}</strong>
            </p>
            <div className="community-stats-row">
              <div className="community-bar pass-bar" style={{ flex: passPct || 1 }}></div>
              <div className={`community-agree ${communityStats.userChoice === 'smash' ? 'agree-smash' : 'agree-pass'}`}>
                <span className="community-agree-pct">{agreePct}%</span>
                <span className="community-agree-label">agreed</span>
              </div>
              <div className="community-bar smash-bar" style={{ flex: smashPct || 1 }}></div>
            </div>
            <div className="community-counts">
              <span className="count-pass">{communityStats.passes} Passed</span>
              <span className="count-smash">{communityStats.smashes} Smashed</span>
            </div>
          </div>
        );
      })()}

      <button onClick={handleReset} className="btn-reset">
        Reset History
      </button>

      <div className="instruction">
        <div><kbd>&larr;</kbd> Smash</div>
        <div><kbd>&rarr;</kbd> Pass</div>
        <div><kbd>&darr;</kbd><kbd>&uarr;</kbd> Navigate</div>
      </div>

      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Hold on!</h3>
            <p>{warningMessage}</p>
            <button onClick={() => setShowWarning(false)} className="btn-close-modal">Okay</button>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Reset History?</h3>
            <p>Are you sure you want to reset all your choices? This cannot be undone.</p>
            <div className="modal-buttons">
              <button onClick={() => setShowResetConfirm(false)} className="btn-modal-cancel">Cancel</button>
              <button onClick={confirmReset} className="btn-modal-confirm">Reset</button>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <StatsPage
          history={history}
          allProfiles={allProfiles}
          onRestart={handleReset}
          onClose={() => setShowStats(false)}
        />
      )}

    </div>
  )
}

export default App
