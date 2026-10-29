import { SettingTitle } from '../game_config/club_rules/club.rules.setup';

/**
 * A setting of a form (a tournament, a league) as a box of a game's setup:
 * the title on top, the field under it, a hint in small faint text below.
 */
const SetupBox = ({ title, hint, children }) => (
    <div className="setup-box">
        <SettingTitle>{title}</SettingTitle>
        <div className="setting-body setup-box-body">
            {children}
            {hint && <span className="text-faint fs-8">{hint}</span>}
        </div>
    </div>
);

export default SetupBox;
