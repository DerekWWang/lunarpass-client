import { useState, useEffect, useMemo } from 'react'
import './App.css'
import { Card } from './components/Card'
import { SideMenu } from './components/SideMenu'

const CHARACTER_GROUPS = {
  "limbus": { id: "limbus", name: "Limbus Company", url: "/limbus.json" },
  "leviathan": { id: "leviathan", name: "Leviathan", url: "/leviathan.json" },
};

function App() {
  const [allProfiles, setAllProfiles] = useState([]);
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

  const characterGroups = {
    "limbus": { id: 3, name: "/limbus.json" },
    "leviathan": { id: 4, name: "/leviathan.json" },
  }

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const promises = Object.entries(CHARACTER_GROUPS).map(async ([groupKey, groupInfo]) => {
          const res = await fetch(groupInfo.url);
          const data = await res.json();
          return Object.entries(data).map(([id, item]) => ({
            id,
            group: groupKey,
            name: item.name,
            bio: item.flavor_text,
            image: item.image_path.replace('/Users/derekzhu/Code/lunarpass/media', '/media'),
            url: item.url,
            age: null
          }));
        });

        const results = await Promise.all(promises);
        // Interleave or combine? Simple concat for now, maybe interleave later if desired.
        // For distinct sets, concat is usually fine, or purely sequential based on load order.
        // Let's flatten.
        const combined = results.flat();
        setAllProfiles(combined);
        // Set initial tilt only once
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
      if (index >= profiles.length) {
        setIndex(0); // or handle "all done"
      }
    }
    // We deliberately depend on `profiles` (which changes when groups change).
    // We do NOT depend on `index` here to avoid reset loops.
  }, [profiles, history]); // Added history dependency so it auto-advances if we somehow manually manipulated it, but mostly for the profile change.

  const currentProfile = profiles[index];
  const nextProfile = profiles[(index + 1) % profiles.length];

  const handleToggleGroup = (groupKey) => {
    setEnabledGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleSwipe = (direction) => {
    if (swipeDirection || profiles.length === 0) return;

    // Update history
    setHistory(prev => ({
      ...prev,
      [currentProfile.id]: direction === 'left' ? 'smash' : 'pass'
    }));

    setSwipeDirection(direction);

    setTimeout(() => {
      setLastSwipeDirection(direction); // Set this so NEXT card knows where to enter FROM
      setIndex((prevIndex) => (prevIndex + 1) % profiles.length);
      setSwipeDirection(null);
      // Generate new random tilt for the incoming card
      setTilt(Math.random() * 10 - 5);
    }, 500);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your history? This cannot be undone.')) {
      setHistory({});
      localStorage.removeItem('lunarpass-history');
      setIndex(0);
      localStorage.removeItem('lunarpass-index');
      setSwipeDirection(null);
      setLastSwipeDirection(null);
    }
  };

  // Preload next few images
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
          console.log(`Preloading image for ${profile.name}`);
        }
      }
    }
  }, [index, profiles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.key === 'ArrowRight') {
        handleSwipe('right');
      } else if (e.key === 'ArrowDown') {
        // Backtracking
        setIndex(prevIndex => (prevIndex - 1 + profiles.length) % profiles.length);
        setSwipeDirection(null);
        setLastSwipeDirection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [swipeDirection, profiles.length]);

  if (profiles.length === 0) {
    return <div className="app-container"><div className="loading">Loading profiles...</div></div>;
  }

  // Pass CSS variable for tilt to be used in animations
  const cardStyle = {
    '--tilt': `${tilt}deg`
  };

  return (
    <div className="app-container">
      <SideMenu
        characterGroups={CHARACTER_GROUPS}
        enabledGroups={enabledGroups}
        onToggleGroup={handleToggleGroup}
      />
      <div className="card-stack">
        <Card
          key={currentProfile.id}
          profile={currentProfile}
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
          className={`btn btn-smash ${history[currentProfile?.id] === 'smash' ? 'active-choice' : ''}`}
        >
          Smash <span>({smashCount})</span>
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className={`btn btn-pass ${history[currentProfile?.id] === 'pass' ? 'active-choice' : ''}`}
        >
          Pass <span>({passCount})</span>
        </button>
      </div>

      <button onClick={handleReset} className="btn-reset">
        Reset History
      </button>

      <p className="instruction">Left Arrow = Smash | Right Arrow = Pass | Down Arrow = Previous</p>
    </div>
  )
}

export default App
