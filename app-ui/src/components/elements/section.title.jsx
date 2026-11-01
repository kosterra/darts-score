import SaveStatus from './save.status';
import { mergeSaves } from '../../utils/use.auto.save';

/**
 * A section's title with how its saving goes at the end of its line
 * (settings save as you go, see useAutoSave): saves are the states of the
 * section's saves, shown as one. Parts that save themselves report theirs
 * with onStatus.
 */
const SectionTitle = ({ id, className = 'mb-3', saves = [], children }) => (
    // a long status (what went wrong) goes under the title rather than squeezing it
    <div className={`d-flex flex-wrap align-items-center column-gap-3 row-gap-1 ${className}`}>
        <p id={id} className="game-setup-section-title mb-0" style={{ flex: '1 0 auto' }}>{children}</p>
        <SaveStatus {...mergeSaves(...saves)} />
    </div>
);

export default SectionTitle;
