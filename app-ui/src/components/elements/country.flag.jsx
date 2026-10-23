import { FLAGS, countryName } from '../../utils/countries';

/**
 * The flag of a country, as tall as the text next to it, with the country's
 * name on hover. Nothing without a country.
 */
const CountryFlag = ({ code, className = '' }) => {
    const url = code && FLAGS[code.toUpperCase()];
    if (!url) return null;
    const name = countryName(code.toUpperCase());
    return <img src={url} alt={name} title={name} className={`country-flag ${className}`} loading="lazy" />;
};

export default CountryFlag;
