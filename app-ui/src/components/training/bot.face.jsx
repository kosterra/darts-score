import { useId } from 'react';

/**
 * The bot's face in a game: the drawing of public/bot.svg (keep the two in
 * step), drawn into the page so it can show a mood:
 * idle      blinks, looks around, its antenna wobbles now and then (as the picture);
 * throwing  looks down at the board, concentrating;
 * happy     smiling eyes and a big smile, a little bounce (a good visit, a leg won);
 * sad       drooping eyes and antenna, a frown (a bust, a leg lost);
 * surprised big eyes and an open mouth (the player threw 180).
 * All of it stands still with reduced motion. The mood comes from
 * utils/use.bot.mood.js.
 */
const BotFace = ({ mood = 'idle', className = '' }) => {
    // gradients of their own for each face on the page
    const id = useId().replace(/:/g, '');
    const eye = mood === 'happy'
        ? <g className="bot-eyes-happy" fill="none" stroke={`url(#${id}-eye)`} strokeWidth="4" strokeLinecap="round">
            <path d="M43 68 Q51 57 59 68" />
            <path d="M69 68 Q77 57 85 68" />
        </g>
        : <g className="bot-look">
            <g className="bot-blink">
                <circle cx="51" cy="65" r="8" fill={`url(#${id}-eye)`} />
                <circle cx="77" cy="65" r="8" fill={`url(#${id}-eye)`} />
                <circle cx="48.5" cy="62" r="2" fill="#ffffff" opacity="0.85" />
                <circle cx="74.5" cy="62" r="2" fill="#ffffff" opacity="0.85" />
            </g>
            {/* sad: heavy lids over the top of the eyes */}
            {mood === 'sad' && <g fill="#253029"><rect x="42" y="55" width="18" height="8" /><rect x="68" y="55" width="18" height="8" /></g>}
        </g>;
    const mouth = {
        happy: <path d="M52 75 Q64 86 76 75" fill="none" stroke="#7ecca5" strokeWidth="2.8" strokeLinecap="round" />,
        sad: <path d="M55 80 Q64 74 73 80" fill="none" stroke="#7ecca5" strokeWidth="2.4" strokeLinecap="round" />,
        surprised: <ellipse cx="64" cy="78" rx="3.5" ry="4" fill="none" stroke="#7ecca5" strokeWidth="2.4" />,
        throwing: <path d="M57 77 L71 77" fill="none" stroke="#7ecca5" strokeWidth="2.4" strokeLinecap="round" />,
    }[mood] ?? <path d="M55 76 Q64 81 73 76" fill="none" stroke="#7ecca5" strokeWidth="2.4" strokeLinecap="round" />;

    return (
        <svg viewBox="0 0 128 128" className={`bot-face is-${mood} ${className}`} aria-hidden="true">
            <defs>
                <radialGradient id={`${id}-bg`} cx="50%" cy="38%" r="70%">
                    <stop offset="0" stopColor="#3b5a4b" />
                    <stop offset="1" stopColor="#1c2a23" />
                </radialGradient>
                <linearGradient id={`${id}-head`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#e3e8ec" />
                    <stop offset="1" stopColor="#aeb8c1" />
                </linearGradient>
                <radialGradient id={`${id}-eye`} cx="50%" cy="45%" r="55%">
                    <stop offset="0" stopColor="#d9fbe9" />
                    <stop offset="0.45" stopColor="#7ecca5" />
                    <stop offset="1" stopColor="#3f8f6a" />
                </radialGradient>
            </defs>
            <rect width="128" height="128" fill={`url(#${id}-bg)`} />
            <g className="bot-body">
                {/* the antenna: a dart standing on its point */}
                <g className="bot-antenna">
                    <line x1="64" y1="40" x2="64" y2="24" stroke="#e9eef2" strokeWidth="2.4" strokeLinecap="round" />
                    <rect x="61.2" y="13" width="5.6" height="13" rx="2.4" fill="#9aa5b1" />
                    <path d="M64 13 L55 3 L60 1 L64 6 L68 1 L73 3 Z" fill="#ec8b80" stroke="#b9645b" strokeWidth="0.8" strokeLinejoin="round" />
                </g>
                <rect x="21" y="58" width="9" height="20" rx="4" fill="#8f9aa4" />
                <rect x="98" y="58" width="9" height="20" rx="4" fill="#8f9aa4" />
                <rect x="28" y="40" width="72" height="58" rx="18" fill={`url(#${id}-head)`} stroke="#7f8a94" strokeWidth="2" />
                <rect x="35" y="49" width="58" height="34" rx="12" fill="#253029" />
                {eye}
                {mouth}
                <g stroke="#7f8a94" strokeWidth="2" strokeLinecap="round">
                    <line x1="56" y1="90" x2="56" y2="94" />
                    <line x1="61.3" y1="90" x2="61.3" y2="94" />
                    <line x1="66.7" y1="90" x2="66.7" y2="94" />
                    <line x1="72" y1="90" x2="72" y2="94" />
                </g>
                <rect x="54" y="98" width="20" height="8" fill="#8f9aa4" />
                <path d="M22 128 Q24 108 44 106 L84 106 Q104 108 106 128 Z" fill={`url(#${id}-head)`} stroke="#7f8a94" strokeWidth="2" />
                <circle cx="64" cy="117" r="4" fill="#ec8b80" />
            </g>
        </svg>
    );
};

export default BotFace;
