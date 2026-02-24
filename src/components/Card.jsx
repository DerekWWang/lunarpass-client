import React from 'react';
import './Card.css';

export const Card = ({ profile, backgroundUrl, swipeStatus, enteringFrom, style }) => {
    let animationClass = '';
    if (swipeStatus) {
        animationClass = `swipe-${swipeStatus}`;
    } else if (enteringFrom) {
        animationClass = `enter-${enteringFrom}`;
    }

    const [imageSrc, setImageSrc] = React.useState(profile.url || profile.image);

    const handleImageError = () => {
        if (imageSrc !== profile.image) {
            setImageSrc(profile.image);
        }
    };

    React.useEffect(() => {
        setImageSrc(profile.url || profile.image);
    }, [profile]);

    return (
        <div
            className={`card-container ${animationClass}`}
            style={style}
        >
            <div className="card">
                {backgroundUrl && (
                    <div
                        className="card-bg"
                        style={{ backgroundImage: `url(${backgroundUrl})` }}
                    />
                )}
                <div className="card-image-container">
                    <img
                        src={imageSrc}
                        alt={profile.name}
                        className="card-image"
                        onError={handleImageError}
                        draggable="false"
                    />
                </div>
                <div className="card-content">
                    <div className="card-header">
                        <h2>{profile.name}</h2>
                        <span className="card-age">{profile.age}</span>
                    </div>
                    <p className="card-bio">{profile.bio}</p>
                </div>
            </div>
        </div>
    );
};
