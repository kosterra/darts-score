/**
 * The rules of a game or training, one point each.
 */
const RulesList = ({ rules = [] }) => (
    <ul className="rules-list">
        {rules.map((rule, index) => <li key={index}>{rule}</li>)}
    </ul>
);

export default RulesList;
