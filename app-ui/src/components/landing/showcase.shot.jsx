// the screenshots of the start page, made by scripts/showcase from demo data
const SRC = (name) => `/showcase/${name}.webp`;

/**
 * A screenshot of the app in a plain browser window. eager: the first one
 * on the page, loaded right away; the others load as they come into view.
 */
export const ShowcaseShot = ({ name, alt, eager = false }) => (
    <figure className="showcase-shot m-0">
        <div className="showcase-shot-bar" aria-hidden="true"><span /><span /><span /></div>
        <img src={SRC(name)} alt={alt} width="1440" height="900" loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </figure>
);

/**
 * A screenshot of the app on a phone, laid over the corner of a window.
 */
export const PhoneShot = ({ name, alt }) => (
    <figure className="showcase-phone m-0">
        <img src={SRC(name)} alt={alt} width="390" height="844" loading="lazy" decoding="async" />
    </figure>
);
