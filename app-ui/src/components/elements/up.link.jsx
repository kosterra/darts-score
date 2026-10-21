import { useLocation, useNavigate } from 'react-router-dom';

import { previousPathOf } from '../../utils/navigation.trail';

/**
 * The way up from a page to its parent, above the page: "‹ Players". When
 * the page was opened from the parent it goes back, so the parent is as it
 * was left; otherwise (a link, a reload) it opens the parent.
 */
const UpLink = ({ to, label }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const onClick = (event) => {
        event.preventDefault();
        const previous = previousPathOf(location.key);
        if (previous && previous.split('?')[0] === to.split('?')[0]) navigate(-1);
        else navigate(to);
    };

    return (
        <a href={to} className="up-link" onClick={onClick}>
            <i className="pi pi-angle-left" aria-hidden="true" />
            {label}
        </a>
    );
};

export default UpLink;
