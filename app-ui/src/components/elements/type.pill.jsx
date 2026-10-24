/**
 * A game or training type as a pill: its icon and name, in the type's colour.
 * item: { value, label, icon }
 */
const TypePill = ({ item, className = '' }) => (
    <span className={`type-pill game-type-${item.value} ${className}`}>
        {item.icon && <item.icon aria-hidden="true" />}
        {item.label}
    </span>
);

export default TypePill;
