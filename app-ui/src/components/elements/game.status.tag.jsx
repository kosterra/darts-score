import { Tag } from 'primereact/tag';

/**
 * Whether a game is running or finished, in the same colours everywhere:
 * soft orange for running, soft blue for finished. "label" replaces the word for
 * running games (the public page says "Live").
 */
const GameStatusTag = ({ running, label }) => (
    <Tag
        severity={running ? 'warning' : 'info'}
        value={running ? (label ?? 'Running') : 'Finished'}
    />
);

export default GameStatusTag;
