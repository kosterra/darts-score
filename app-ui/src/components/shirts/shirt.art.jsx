import { t } from '../../utils/i18n';
import { resolveClubLogo } from '../../utils/image.utils';

/**
 * The shirts of the players, drawn: the club shirt from the front (the
 * club's colour, its name on the chest, as amateurs in a league wear it), a
 * shirt of one's own from the back with the nickname, as the pros walk on.
 * The designs come from the server (utils/shirts.js) by their id.
 */

// the accent colours of a club (as in the theme), for its shirt; none chosen: Legmate green
const CLUB_SHIRT_COLORS = { green: '#528b6e', red: '#b4473e', blue: '#3a76a8', gold: '#a7802a', purple: '#7d5aa8' };
const GOLD = '#d9b44a';
const CLUB_SECOND = '#f2f2f2';

// the patterns of a club shirt, from the front, in its second colour (clipped to the shirt)
const ClubPattern = ({ pattern, second }) => {
    switch (pattern) {
        case 'stripes':
            return <g fill={second}><rect x="33" y="40" width="5" height="72" /><rect x="82" y="40" width="5" height="72" /></g>;
        case 'vertical':
            return <g fill={second}>{[30, 44, 58, 72, 86].map(x => <rect key={x} x={x} y="0" width="6" height="120" />)}</g>;
        case 'hoops':
            return <g fill={second}>{[44, 66, 88].map(y => <rect key={y} x="0" y={y} width="120" height="10" />)}</g>;
        case 'halves':
            return <rect x="60" y="0" width="60" height="120" fill={second} />;
        case 'sash':
            return <path d="M28 40 L44 40 L92 112 L76 112 Z" fill={second} />;
        case 'chevrons':
            return <g fill="none" stroke={second} strokeWidth="5">{[66, 82].map(y => <path key={y} d={`M28 ${y - 12} L60 ${y} L92 ${y - 12}`} />)}</g>;
        default:
            return null;
    }
};

// the shirt: body with short sleeves, the neck open at the top
const BODY = 'M40 13 L50 9 Q60 15 70 9 L80 13 L106 27 L97 48 L87 43 L87 109 Q60 113 33 109 L33 43 L23 48 L14 27 Z';
const SLEEVES = 'M40 13 L33 43 L23 48 L14 27 Z M80 13 L87 43 L97 48 L106 27 Z';

// light or dark writing, whichever reads on a colour
const inkOn = (hex) => {
    const value = parseInt(String(hex).replace('#', ''), 16);
    const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1d2126' : '#f4f4f2';
};

// a little darker, for seams and trim
const darker = (hex, by = 0.22) => {
    const value = parseInt(String(hex).replace('#', ''), 16);
    const channel = (shift) => Math.round(((value >> shift) & 255) * (1 - by));
    return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
};

// a row of flame tongues from a base line: [width, height of the tip] each, curving up and leaning a little
const tongues = (x, base, flames) => {
    const valley = base - 10;
    let path = `M${x} ${base} L${x} ${valley}`;
    let at = x;
    for (const [width, tip] of flames) {
        path += ` C${at + width * 0.05} ${valley - 14} ${at + width * 0.35} ${tip + 16} ${at + width * 0.62} ${tip}`;
        path += ` C${at + width * 0.55} ${tip + 14} ${at + width * 0.9} ${valley - 10} ${at + width} ${valley}`;
        at += width;
    }
    return `${path} L${at} ${base} Z`;
};

// what each design lays on the body, in its accent colour (all clipped to the shirt)
const Pattern = ({ design, accent }) => {
    switch (design) {
        case 'flames':
            return (
                <g>
                    <path d={tongues(20, 116, [[14, 66], [14, 52], [14, 60], [14, 48], [14, 58], [14, 64]])} fill={accent} />
                    <path d={tongues(26, 116, [[12, 88], [12, 78], [12, 86], [12, 76], [12, 84], [12, 90]])} fill={GOLD} opacity="0.9" />
                </g>
            );
        case 'lightning':
            return (
                <g fill={accent}>
                    <path d="M28 52 L46 40 L42 55 L60 47 L36 70 L41 57 Z" />
                    <path d="M62 78 L84 64 L79 81 L99 72 L70 98 L75 84 Z" />
                    <path d="M44 100 L54 93 L52 101 L62 97 L48 110 L50 103 Z" opacity="0.8" />
                </g>
            );
        case 'chevrons':
            return (
                <g fill="none" stroke={accent} strokeWidth="5">
                    {[58, 72, 86, 100].map(y => <path key={y} d={`M28 ${y - 12} L60 ${y} L92 ${y - 12}`} />)}
                </g>
            );
        case 'waves':
            return (
                <g fill="none" stroke={accent} strokeWidth="4.5">
                    {[62, 76, 90, 104].map(y => <path key={y} d={`M20 ${y} q10 -7 20 0 t20 0 t20 0 t20 0 t20 0`} />)}
                </g>
            );
        case 'stripes':
            return (
                <g fill={accent}>
                    <rect x="33" y="40" width="6" height="72" />
                    <rect x="81" y="40" width="6" height="72" />
                    <rect x="41" y="40" width="2.5" height="72" opacity="0.7" />
                    <rect x="76.5" y="40" width="2.5" height="72" opacity="0.7" />
                    <path d="M14 27 L20 24 L28 44 L23 48 Z M106 27 L100 24 L92 44 L97 48 Z" />
                </g>
            );
        case 'checker':
            return (
                <g fill={accent}>
                    {Array.from({ length: 6 }, (_, row) => Array.from({ length: 12 }, (_, col) => ((row + col) % 2 === 0
                        ? <rect key={`${row}-${col}`} x={24 + col * 6} y={92 + row * 6} width="6" height="6" />
                        : null)))}
                    <path d="M14 27 L23 22 L32 42 L23 48 Z M106 27 L97 22 L88 42 L97 48 Z" opacity="0.9" />
                </g>
            );
        case 'splash':
            return (
                <g>
                    <circle cx="44" cy="70" r="13" fill={accent} />
                    <circle cx="58" cy="62" r="6" fill={accent} />
                    <circle cx="80" cy="94" r="11" fill={GOLD} opacity="0.9" />
                    <circle cx="66" cy="100" r="4" fill={accent} />
                    <circle cx="36" cy="96" r="5" fill={GOLD} opacity="0.9" />
                    <circle cx="84" cy="56" r="4" fill={GOLD} opacity="0.9" />
                    <circle cx="30" cy="54" r="3" fill={accent} />
                </g>
            );
        case 'globe':
            return (
                <g fill="none" stroke={accent} strokeWidth="1.6" opacity="0.9">
                    <circle cx="60" cy="78" r="30" />
                    <ellipse cx="60" cy="78" rx="14" ry="30" />
                    <line x1="60" y1="48" x2="60" y2="108" />
                    <line x1="30" y1="78" x2="90" y2="78" />
                    <path d="M33 64 Q60 70 87 64 M33 92 Q60 86 87 92" />
                </g>
            );
        case 'goldTrim':
            return (
                <g>
                    <path d="M33 43 L33 110 L38 110 L38 40 Z M87 43 L87 110 L82 110 L82 40 Z" fill={GOLD} />
                    <path d="M14 27 L18 25 L27 46 L23 48 Z M106 27 L102 25 L93 46 L97 48 Z" fill={GOLD} />
                    <path d="M33 104 Q60 108 87 104 L87 110 Q60 114 33 110 Z" fill={GOLD} />
                    <path d="M44 40 L44 102 M76 40 L76 102" stroke={accent} strokeWidth="1.4" />
                </g>
            );
        case 'laurel':
            return (
                <g fill={GOLD}>
                    {Array.from({ length: 7 }, (_, index) => {
                        const angle = (200 + index * 22) * Math.PI / 180;
                        const [x, y] = [60 + 27 * Math.cos(angle), 74 - 27 * Math.sin(angle)];
                        return <ellipse key={`l${index}`} cx={x} cy={y} rx="2.4" ry="5.5" transform={`rotate(${(-angle * 180 / Math.PI) + 90} ${x} ${y})`} />;
                    })}
                    {Array.from({ length: 7 }, (_, index) => {
                        const angle = (-20 - index * 22) * Math.PI / 180;
                        const [x, y] = [60 + 27 * Math.cos(angle), 74 - 27 * Math.sin(angle)];
                        return <ellipse key={`r${index}`} cx={x} cy={y} rx="2.4" ry="5.5" transform={`rotate(${(-angle * 180 / Math.PI) + 90} ${x} ${y})`} />;
                    })}
                    <rect x="33" y="104" width="54" height="6" fill={accent} />
                </g>
            );
        default:
            return null;
    }
};

/**
 * One shirt. design: 'club' (from the front, the club's colour and name) or
 * a design of one's own (from the back, with the nickname); color, accent:
 * its two colours; club: { name, accent, logo, shirt } for the club shirt
 * (shirt: { pattern, color, accent, logo } as its admins designed it); uid:
 * unique on the page, for the clip path.
 */
export const ShirtArt = ({ design = 'club', color = '#2b2f36', accent = '#46a758', nickname = '', club = null, uid, small = false }) => {
    const clip = `${uid}-clip`;
    const isClub = design === 'club';
    const clubShirt = club?.shirt ?? {};
    const main = isClub ? (clubShirt.color ?? CLUB_SHIRT_COLORS[club?.accent] ?? CLUB_SHIRT_COLORS.green) : color;
    const logo = isClub && clubShirt.logo && club?.logo ? resolveClubLogo(club.logo) : '';
    const ink = inkOn(main);
    // the name across the chest, or the nickname across the back, narrowed to fit
    // (too small to read next to a name: none)
    const text = small ? '' : (isClub ? (club?.name ?? '') : nickname).toUpperCase();
    const width = Math.min(48, Math.max(12, text.length * (isClub ? 4.6 : 6.4)));
    return (
        <svg viewBox="0 0 120 120" role="img" aria-label={isClub ? t('Club shirt of {{club}}', { club: club?.name ?? '' }) : t('Shirt with {{nickname}} on the back', { nickname })}>
            <defs>
                <clipPath id={clip}><path d={BODY} /></clipPath>
            </defs>
            <path d={BODY} fill={main} />
            <g clipPath={`url(#${clip})`}>
                {!isClub && <Pattern design={design} accent={accent} />}
                {isClub && <ClubPattern pattern={clubShirt.pattern} second={clubShirt.accent ?? CLUB_SECOND} />}
                {/* the sleeves a shade darker, as the seams show them */}
                <path d={SLEEVES} fill="#000" opacity="0.12" />
                {isClub && <path d="M14 27 L18 25 L27 46 L23 48 Z M106 27 L102 25 L93 46 L97 48 Z" fill={darker(main, 0.35)} />}
            </g>
            {isClub
                // the front: a polo collar with buttons
                ? <g>
                    <path d="M50 9 Q60 15 70 9 L66 22 L60 30 L54 22 Z" fill={darker(main, 0.35)} />
                    <path d="M50 9 L46 20 L56 24 Z M70 9 L74 20 L64 24 Z" fill="#f4f4f2" opacity="0.9" />
                    <circle cx="60" cy="33" r="1.2" fill={ink} opacity="0.7" />
                    <circle cx="60" cy="38" r="1.2" fill={ink} opacity="0.7" />
                </g>
                // the back: just the neckband
                : <path d="M50 9 Q60 15 70 9 L70 12 Q60 18 50 12 Z" fill={darker(main, 0.35)} />}
            {/* the club's logo on the chest, left of the buttons as the wearer sees it */}
            {logo && <image href={logo} x="66" y="25" width="12" height="12" preserveAspectRatio="xMidYMid meet" />}
            {text &&
                <text
                    x="60"
                    y={isClub ? 54 : 50}
                    textAnchor="middle"
                    fill={ink}
                    fontSize={isClub ? 7 : 10}
                    fontWeight="800"
                    letterSpacing="0.5"
                    textLength={width}
                    lengthAdjust="spacingAndGlyphs"
                    style={{ fontFamily: 'inherit' }}
                    // on a pattern the name keeps a thin outline, so it reads on both colours
                    stroke={isClub && (clubShirt.pattern ?? 'plain') === 'plain' ? 'none' : darker(main, 0.5)}
                    strokeWidth={isClub && (clubShirt.pattern ?? 'plain') === 'plain' ? 0 : 0.4}
                    paintOrder="stroke"
                >
                    {text}
                </text>}
            <path d={BODY} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
        </svg>
    );
};

export const ShirtPicture = ({ className = '', ...shirt }) => (
    <span className={`shirt-picture ${className}`}>
        <ShirtArt {...shirt} />
    </span>
);
