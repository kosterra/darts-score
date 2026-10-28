/**
 * Pictures to share: a card in the look of the app (a dark board green, the
 * logo, a big moment and its figures), drawn on a canvas and handed to the
 * share menu of the phone, or saved as a PNG where there is none. The same
 * colours in every theme, so a shared card always looks like Legmate.
 *
 * card: { eyebrow, title, subtitle, hero: { value, label }, figures: [{ value, label }], footer }
 */

import { LOGO } from './logo';

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = { background: '#191c1b', glow: '#2b4a3c', text: '#f4f1ea', subtle: '#b9b4a8', faint: '#7f7a70', green: '#7ecca5', gold: '#ffc94d', tile: 'rgba(255, 255, 255, 0.06)' };
const FONT = '"Exo 2", "Segoe UI", sans-serif';

const loadImage = (src) => new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
});

// a line no wider than the card: shortened with an ellipsis
const fit = (context, text, width) => {
    let line = String(text ?? '');
    if (context.measureText(line).width <= width) return line;
    while (line.length > 1 && context.measureText(`${line}…`).width > width) line = line.slice(0, -1);
    return `${line}…`;
};

// the largest font (from size down to min) at which the text fits the width; shortened only below that
const fitFont = (context, text, width, { weight, size, min }) => {
    for (let at = size; at >= min; at -= 2) {
        context.font = `${weight} ${at}px ${FONT}`;
        if (context.measureText(String(text ?? '')).width <= width) return String(text ?? '');
    }
    return fit(context, text, width);
};

const roundedRect = (context, x, y, width, height, radius) => {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
};

/**
 * The card as a canvas. gold: the hero in gold (a win, a record) instead of green.
 */
export const drawShareCard = async (card, { gold = false } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const context = canvas.getContext('2d');
    // the font of the app, once it is there
    try {
        await Promise.all(['400', '600', '800'].map(weight => document.fonts.load(`${weight} 48px "Exo 2"`)));
    } catch {
        // the fallback font then
    }

    // the background: dark, with a glow of board green from the top
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const glow = context.createRadialGradient(WIDTH / 2, 0, 50, WIDTH / 2, 0, HEIGHT);
    glow.addColorStop(0, COLORS.glow);
    glow.addColorStop(1, 'rgba(25, 28, 27, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // the logo and the name of the app
    const logo = await loadImage(LOGO);
    if (logo) context.drawImage(logo, 80, 72, 76, 76);
    context.fillStyle = COLORS.text;
    context.font = `700 44px ${FONT}`;
    context.textBaseline = 'middle';
    context.fillText('Legmate', logo ? 176 : 80, 111);

    // what it is about
    const accent = gold ? COLORS.gold : COLORS.green;
    let y = 270;
    context.textBaseline = 'alphabetic';
    if (card.eyebrow) {
        context.fillStyle = accent;
        context.font = `700 36px ${FONT}`;
        context.fillText(fit(context, card.eyebrow.toUpperCase(), WIDTH - 160), 80, y);
        y += 84;
    }
    context.fillStyle = COLORS.text;
    context.fillText(fitFont(context, card.title, WIDTH - 160, { weight: 800, size: 76, min: 44 }), 80, y);
    y += 62;
    if (card.subtitle) {
        context.fillStyle = COLORS.subtle;
        context.font = `400 38px ${FONT}`;
        context.fillText(fit(context, card.subtitle, WIDTH - 160), 80, y);
    }

    // the big moment
    if (card.hero) {
        context.textAlign = 'center';
        context.fillStyle = accent;
        context.fillText(fitFont(context, card.hero.value, WIDTH - 160, { weight: 800, size: 230, min: 110 }), WIDTH / 2, 680);
        context.fillStyle = COLORS.subtle;
        context.font = `600 42px ${FONT}`;
        context.fillText(fit(context, card.hero.label, WIDTH - 160), WIDTH / 2, 750);
        context.textAlign = 'left';
    }

    // the figures, up to six in two rows of tiles
    const figures = (card.figures ?? []).slice(0, 6);
    const columns = figures.length > 4 ? 3 : Math.max(1, Math.min(figures.length, 2));
    const gap = 24;
    const tileWidth = (WIDTH - 160 - gap * (columns - 1)) / columns;
    const tileHeight = 170;
    figures.forEach((figure, index) => {
        const x = 80 + (index % columns) * (tileWidth + gap);
        const top = 830 + Math.floor(index / columns) * (tileHeight + gap);
        context.fillStyle = COLORS.tile;
        roundedRect(context, x, top, tileWidth, tileHeight, 22);
        context.fill();
        context.fillStyle = COLORS.text;
        context.fillText(fitFont(context, figure.value, tileWidth - 48, { weight: 800, size: 64, min: 34 }), x + 24, top + 88);
        context.fillStyle = COLORS.subtle;
        context.font = `400 30px ${FONT}`;
        context.fillText(fit(context, figure.label, tileWidth - 48), x + 24, top + 136);
    });

    // where it comes from
    context.fillStyle = COLORS.faint;
    context.font = `400 30px ${FONT}`;
    context.fillText(fit(context, card.footer ?? window.location.host, WIDTH - 160), 80, HEIGHT - 70);
    return canvas;
};

/**
 * Shares the card: the share menu of the phone with the picture, or the
 * picture saved. → 'shared' | 'saved' | 'cancelled'
 */
export const shareCard = async (card, { filename = 'legmate.png', text = '', gold = false } = {}) => {
    const canvas = await drawShareCard(card, { gold });
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file], text });
            return 'shared';
        } catch (error) {
            if (error?.name === 'AbortError') return 'cancelled';
        }
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    return 'saved';
};
