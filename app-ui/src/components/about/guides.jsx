import { Link } from 'react-router-dom';
import { FaUserPen, FaPeopleGroup, FaBullseye, FaChartLine, FaMedal, FaBell, FaUserPlus, FaSliders, FaScaleBalanced, FaTableCellsLarge, FaArrowRightArrowLeft, FaKey, FaGlobe } from 'react-icons/fa6';
import { GiDart } from 'react-icons/gi';
import { PiClockCountdownBold } from 'react-icons/pi';
import { t } from '../../utils/i18n';

/**
 * The manuals on the About page: what every player can do, and what the
 * admins of a club look after. Each topic: { title, icon, body }.
 */
export const PLAYER_GUIDE = [
    {
        title: t('Your account and your clubs'),
        icon: FaPeopleGroup,
        body: (
            <>
                <p>{t('An account can belong to several clubs. The club you work in is shown at the top of the menu; tap it to switch to another one, or open')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>.</p>
                <ul>
                    <li>{t('Everything under')}{' '}<strong>{t('Club')}</strong>{' '}{t('in the menu belongs to the selected club: its players, games, trainings and badges.')}</li>
                    <li>{t('A club admin gives you a login for your player in their club. Then you can start games and trainings on your own and see the club like everyone else; only admins change it.')}</li>
                    <li>{t('Or you join a club yourself: under')}{' '}<strong>{t('Join a club')}</strong>{' '}{t('on')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>{' '}{t('are the clubs that take new members. An')}{' '}<em>{t('open')}</em>{' '}{t('club you join at once; where the')}{' '}<em>{t('admins accept')}</em>{' '}{t('you ask (with a few words if you like) and are told their answer through the notifications. You can take a request back while it waits; after a declined one you can ask again a week later. You play there with the player you already have elsewhere, with your statistics, badges and flights; without one you choose a nickname.')}</li>
                    <li>{t('Without an account, a')}{' '}<strong>{t('quick game')}</strong>{' '}{t('on the public start page tries Oche out: X01 (301 or 501, Double or Straight Out, 1, 3 or 5 legs) or Cricket (Standard or Cut-throat) for one to four players who only need a name, with the statistics of the game at the end. It stays on that device for 30 days and counts for no club.')}</li>
                    <li>{t('Anyone can create a club of their own under')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>{' '}{t('and becomes its admin. Global admins, who look after the whole app, belong to no club.')}</li>
                    <li>{t('Oche also runs as an app: install it from the card on the start page or the dashboard, or under Profile → Account → Oche as an app (on Android: Chrome\'s menu, then Install app; on an iPhone or iPad: Share, then Add to Home Screen). Opened from its icon it runs full screen, without the address bar.')}</li>
                    <li>{t('A login lasts five hours (the installation can set another length). Ten minutes before the end a countdown asks whether to stay logged in; after logging in again you are back on the page you were on, e.g. the game being played.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Playing a game'),
        icon: FaBullseye,
        body: (
            <>
                <p>{t('Choose X01, Cricket, Elimination or Around the Clock under')}{' '}<strong>{t('Let\'s play darts')}</strong>{t(', or under More games Shanghai, Killer, Halve-It, Golf and Tactics. The rules of each are under')}{' '}<Link to="#rules">{t('How to play')}</Link>.</p>
                <ul>
                    <li>{t('Tap the players: those who played lately come first, and a guest who is not in the club is one tap away. Drag them into the throwing order, shuffle it or let the winner of the bull-off start.')}</li>
                    <li>{t('Pick the settings; the start button says what will be played. In X01 a handicap gives players of different strength their own starting score and in/out mode, with a suggestion from their recent average, level and age.')}</li>
                    <li><strong>{t('Rules')}</strong>{' '}{t('in the title of the setup and in the header of the game opens the rules of the game right there, with the house rules this game is played with first.')}</li>
                    <li>{t('Your club may have its own rules: what a game starts with, the formats of the club (first among the quick formats), and settings it locked, shown with Club rule. Pin your favourite formats with their star: they come first, on every device.')}</li>
                    <li><strong>{t('Friendly game')}</strong>{t(': it counts for your own statistics, XP and badges, but not for the club\'s leaderboards, records and Hall of Shame. Mark it in the setup, or start one of the club\'s friendly formats.')}</li>
                    <li>{t('During the game enter the darts on the board or the keypad and send the visit. Undo takes the last visit back. The tips above the board show the way out or what to aim at. On the board of X01, Cricket and Elimination a dart flies to the field you tap, if you left the dart animation on in your profile; the setup can switch it on or off for everyone.')}</li>
                    <li>{t('When the game is won its statistics open: the result, the moments of the game and charts. The confetti and the gold of the winner go by themselves, the badges just earned are marked as new, and Play again starts the next game. Every game is saved after each visit, so a game left running can be continued from')}{' '}<strong>{t('Games')}</strong>{' '}{t('or the dashboard.')}</li>
                    <li>{t('A game that should not count, e.g. one entered by mistake: ask to delete it with the flag in its row under')}{' '}<strong>{t('Games')}</strong>{t('. The other players are asked to agree; when every player has a login and all agree, it is deleted, otherwise a club admin decides. You are told how it ended.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Training'),
        icon: PiClockCountdownBold,
        body: (
            <>
                <p>{t('Under')}{' '}<strong>{t('Training')}</strong>{' '}{t('there are Around the Clock, X01 against the bot and, under More trainings, Bob\'s 27, 121 Checkout, Random checkouts, Scoring, Doubles around the board and Catch 40.')}</p>
                <p><strong>{t('X01 against the bot')}</strong>{' '}{t('plays like a game against a bot: a fixed one (Easy, Normal, Hard or Pro), or one as strong as you, worked out from your statistics (your recent form or your X01 average and your checkout rate), also a bit easier or harder than you. Choose the player, the format and who starts as in X01. The bot throws its darts by itself; trainings count for no game statistics, badges or levels, but earn flight points.')}</p>
                <p><strong>{t('Around the Clock')}</strong>{t(': choose the players, the training (against the clock or with the fewest darts) and the mode, then start.')}</p>
                <ul>
                    <li>{t('Against the clock the stopwatch shows your personal best and whether you are ahead of it; stop it with the last hit and save the time.')}</li>
                    <li>{t('With the fewest darts tap Hit or Miss for every dart; several players take turns.')}</li>
                    <li>{t('After saving you stay in the training for the next attempt; the scoreboard shows where the attempt landed. Settings goes back to the setup.')}</li>
                </ul>
                <p><strong>{t('More trainings')}</strong>{t(': every attempt is saved when it is over, with the scoreboard of the club (everyone\'s best and the latest), and a new personal best is celebrated. Every kind has badges of its own, and the checkout trainings (Catch 40, 121 Checkout, Random checkouts) show the way out as in X01, with your own doubles first; the rules of each are under')}{' '}<Link to="#rules">{t('How to play')}</Link>.</p>
                <p className="m-0"><strong>{t('Club → Trainings')}</strong>{' '}{t('lists the trainings of every kind, with the result;')}{' '}<strong>{t('Mine')}</strong>{' '}{t('shows only yours, and your own you can delete there. Under Profile → Player,')}{' '}<em>{t('Show my trainings to the club')}</em>{' '}{t('decides whether the other players see them (in the list and on the scoreboard); the club admins always do.')}</p>
            </>
        ),
    },
    {
        title: t('Statistics and comparing'),
        icon: FaChartLine,
        body: (
            <>
                <ul>
                    <li><strong>{t('My statistics')}</strong>{t(', right below Dashboard, opens your own statistics in the club with one click, with your head to head beside your latest games: the opponent you played most and least, your best record and your toughest opponent, each straight to the comparison; the')}{' '}<strong>{t('You')}</strong>{' '}{t('widget on the dashboard shows your level, average and form. On your profile you choose what opens after logging in: the club (your default club, or the one you used last) and its dashboard or your statistics.')}</li>
                    <li><strong>{t('Players')}</strong>{' '}{t('opens each player\'s profile: key figures, level, their set of darts, latest games, their trainings with the bests of each kind, charts, badges and the flights and barrels they collected, with filters for the club, the game type, the period and the last games.')}</li>
                    <li><strong>{t('Club → Games, Trainings, Players and Badges')}</strong>{' '}{t('start with an overview of the club: how many lately, who plays, trains or collects most (with a search in a big club), the popular games and trainings, the best win rates, the club records of every training, the highest levels, the birthdays coming up, the club\'s own badges with its goals, and the Hall of Shame with who holds each badge. Every player leads to their statistics; the list stays below and filters by type with one field (a whole group, e.g. More games, with a click on its title).')}</li>
                    <li><strong>{t('Player comparison')}</strong>{' '}{t('puts two to four players against each other. Head to head shows their games together in any of the nine games: the score of wins, legs and sets, who is on a streak, the last results, who beats whom, the differences in a few words, the highlights of their duels and, for X01, the charts in tabs. Side by side compares each player\'s own figures from all their games, also when they never met. The club rating (worked out from every game in the club except friendly ones) gives the chances for the next game. Quick picks, "Compare with you" on a player\'s statistics and "Compare these players" under a game lead there, and Copy link shares the comparison.')}</li>
                    <li>{t('The')}{' '}<strong>{t('dashboard')}</strong>{' '}{t('shows the club at a glance: leaderboards, the latest games, records, the Hall of Shame and the club\'s goals, in widgets the club arranges.')}{' '}<strong>{t('Edit dashboard')}</strong>{' '}{t('arranges your own: drag the widgets by their bar (or move them with the arrow keys), choose their width, remove them, or add others below; only you see it, and "Use the club\'s" brings the club\'s back.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Levels and badges'),
        icon: FaMedal,
        body: (
            <p className="m-0">
                {t('Every player has a level from Rookie to Legend, made of XP for playing, winning, badges and skill, and the 3-dart average has its own level from Beginner to Elite: see')}{' '}<Link to="#levels">{t('Levels')}</Link>{t('. Badges are earned automatically in games and trainings; all of them are listed under')}{' '}<Link to="#badges">{t('Badges')}</Link>{t(', and your own collection is on your profile and under')}{' '}<Link to="/badges">{t('Club → Badges')}</Link>{t('. The levels also open flights and barrels to unlock with flight points: what each level opens, and how the points are earned, is under')}{' '}<Link to="#levels">{t('Levels')}</Link>.{' '}{t('The club earns badges together too: club badges, shields for what all its members play (the 1,000th game, the first 180, eight players on one evening, …), each with who made it happen, and goals its admins set. They add no XP; everyone hears about a new one.')}
            </p>
        ),
    },
    {
        title: t('Your profile, clubs and notifications'),
        icon: FaBell,
        body: (
            <>
                <p>{t('Tap your name at the bottom of the menu: it opens Profile, My clubs, Notifications and Log out. The number on your avatar counts the notifications you have not read.')}</p>
                <ul>
                    <li><strong>{t('Profile → Account:')}</strong>{' '}{t('your name (also the name of your player), email, password, the language of the app and of your mails, the date format, and what opens after logging in: your default club, and its dashboard or your statistics.')}</li>
                    <li><strong>{t('Profile → Account → Display:')}</strong>{' '}{t('the language, the date format, the theme (dark, light, like the device, pure black for OLED screens, or high contrast), the accent colour (your own, or your club\'s) and the background (the dartboard photo, blurred, or plain), with your account on every device. Good figures stay green whatever the colour.')}</li>
                    <li><strong>{t('Delete account:')}</strong>{' '}{t('at the end of Profile → Account, with your password. Your players stay in their clubs under an anonymous name, so the games and statistics of the others stay whole. The only admin of a club adds another admin or deletes the club first.')}</li>
                    <li><strong>{t('Logged in and usage:')}</strong>{' '}{t('Admin → Logged in lists every account that is logged in, with its devices, when they were last used and when the login ends; end a session there when a device was lost or should not be logged in. Admin → Usage shows the active users, logins, games, trainings and new accounts and clubs per week; the report comes by mail on Mondays (Profile → Notifications).')}</li>
                    <li><strong>{t('Mail server:')}</strong>{' '}{t('under System settings how the installation sends mails (server, port, encryption, login and sender, from its environment) and a test mail to any address in any language. When it fails, it says what to check, with the answer of the mail server.')}</li>
                    <li><strong>{t('Two-step login:')}</strong>{' '}{t('under Profile → Account → Security, after the password Oche also asks for a code of an authenticator app on your phone, so a stolen password alone is not enough. You get ten recovery codes for a lost phone, each works once. A device of your own can skip the code for 30 days; Forget trusted devices asks again everywhere.')}</li>
                    <li><strong>{t('Profile → Player:')}</strong>{' '}{t('how you appear in your clubs: nickname, picture (also on your avatar) and country, for all your clubs. The date of birth is set by your club admins; as an adult you can correct it (never to a date under 18, or the Hall of Shame age of your clubs). Here too whether your nickname appears on the public start page, whether the other players see your trainings, and your flights and barrels (see Your darts).')}</li>
                    <li><strong>{t('Profile → Playing:')}</strong>{' '}{t('everything in a game. With your account on every device: the ways out in X01 (for every player, the one at the oche only, or off), board or keypad, sending the visit by itself after the third dart, a keypad for the left hand and quieter celebrations. With your player: the favourite double and main treble the tips aim at (automatic from your games, or set by you), whether you play with a handicap, and the dart animation.')}</li>
                    <li><strong>{t('Profile → Notifications:')}</strong>{' '}{t('what you are told about and how, for each kind: in the app or not, and by mail at once, once a day or once a week (from 7 in the morning; the weekly one on Mondays). Your week by mail on Mondays is there too. Mails about the security of your account always come; every other mail has a link to get no more.')}</li>
                    <li><strong>{t('My clubs:')}</strong>{' '}{t('the clubs you play in or run, to switch between them; your name there opens your statistics and badges.')}</li>
                    <li><strong>{t('Notifications:')}</strong>{' '}{t('your badges, a new level, your records, the Hall of Shame, a game left running, requests to delete a game you played (open it to agree or decline) and how they ended, what fair play did to your games, and what your clubs achieved. Open leads to the game, the request or the badges; mark them as read or remove them.')}</li>
                </ul>
            </>
        ),
    },
];

PLAYER_GUIDE.push({
    title: t('Your darts'),
    icon: GiDart,
    body: (
        <>
            <p>{t('On your')}{' '}<Link to="/profile#player">{t('profile → Player')}</Link>{t(', under')}{' '}<strong>{t('Flights and barrels')}</strong>{t(', you choose the darts you throw with in the app. They show wherever you play:')}</p>
            <ul>
                <li><strong>{t('Dart animation:')}</strong>{' '}{t('on the board of X01, Cricket and Elimination a dart flies to the field you tap and sticks there; switched off (as it is to begin with), the field just lights up. The setup of a game can switch it on or off for everyone.')}</li>
                <li><strong>{t('Flights:')}</strong>{' '}{t('the colour (your colour of the game or one of ten), the shape and the design; and the')}{' '}<strong>{t('barrel')}</strong>{t('. Your flight sits next to your name in the throwing order and the game header, your set of darts on your statistics.')}</li>
                <li><strong>{t('Flight points:')}</strong>{' '}{t('every finished game and training earns points, wins, 180s and checkouts of 100 or more earn extra. Spend them on the shapes, designs and barrels you like; the tiles show the price, in gold once you can pay it.')}</li>
                <li>{t('Many flights also need a player level or an X01 average first, greyed out until then; the master flights belong to the levels (see')}{' '}<Link to="#levels">{t('Levels')}</Link>{t('). The legendary ones cannot be bought: they come with a feat, e.g. a nine-darter.')}</li>
                <li>{t('Next to your badges you see what you collected and the points you have left.')}</li>
            </ul>
        </>
    ),
});

export const ADMIN_GUIDE = [
    {
        title: t('Setting up a club'),
        icon: FaSliders,
        body: (
            <>
                <p>{t('Create a club under')}{' '}<Link to="/my-clubs">{t('My clubs')}</Link>. <strong>{t('Edit club')}</strong>{' '}{t('there opens the page of a club you run, laid out as the profile:')}</p>
                <ul>
                    <li><strong>{t('The club:')}</strong>{' '}{t('the logo, the name, a description, the country (its flag shows next to the club\'s name) and the club colour (the accent colour of the app for the members who did not choose their own), saved with Save.')}</li>
                    <li><strong>{t('Admins:')}</strong>{' '}{t('share the club with other admins by their email. Every admin can do everything in the club; a club always keeps one.')}</li>
                    <li><strong>{t('Public page:')}</strong>{' '}{t('whether the club appears on the public start page, with its running games and its results.')}</li>
                    <li><strong>{t('New members:')}</strong>{' '}{t('whether people with an account join at once, ask and wait for an admin, or are only added by the admins (see below).')}</li>
                    <li><strong>{t('Hall of Shame:')}</strong>{' '}{t('on or off, and whether children are left out of it (under 16, or another age). A player without a date of birth is always left out of it.')}</li>
                    <li><strong>{t('Club badges and goals:')}</strong>{' '}{t('the badges the club earned together so far, and up to three goals for the whole club (games, 180s, darts, ton-plus visits, high finishes or trainings, until an end date), saved with Save. The goals show on the badges page and in a dashboard widget; the members hear when a club badge is earned or a goal is reached.')}</li>
                    <li>{t('These settings are saved as soon as they change. At the bottom the club can be deleted, once its players are removed.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Game rules of the club'),
        icon: FaBullseye,
        body: (
            <>
                <p>{t('Under')}{' '}<Link to="/my-clubs">{t('Edit club')}</Link>{' '}<strong>{t('→ Game rules')}</strong>{' '}{t('the club sets its own rules. They are saved as you go; a running game keeps the rules it started with.')}</p>
                <ul>
                    <li><strong>{t('The games:')}</strong>{' '}{t('switch off those the club does not play: they leave the menu and More games. For each game choose what it starts with, narrow the choices the setups offer (e.g. only 301, 501 and 701), and lock a setting for every game: the setups show it as Club rule, and a game against it is refused.')}</li>
                    <li><strong>{t('House rules:')}</strong>{' '}{t('in X01 who starts the next leg (the loser of the leg, with two players), a round limit after which the fewest points left win the leg, and the outer bull as 50; in Cricket a round limit; a Shanghai that only scores; Killer by any hit on the number and a safe own double; the club\'s own Halve-It targets.')}</li>
                    <li><strong>{t('The club\'s formats:')}</strong>{' '}{t('named setups, e.g. Club night, first among the quick formats; a friendly one marks its games as friendly. The app\'s own formats can stay or go.')}</li>
                    <li><strong>{t('Friendly games:')}</strong>{' '}{t('whether players may mark a game as friendly in the setup, or only the club\'s friendly formats are. They stay out of the leaderboards, records, best win rates and the Hall of Shame.')}</li>
                    <li><strong>{t('Handicap and ways out:')}</strong>{' '}{t('a handicap in X01 off, set by hand or with suggestions, and the most points the starting scores may differ by; and whether X01 shows the ways out (some leagues play without). Players may choose to always play without a handicap, on their profile.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Players and their logins'),
        icon: FaUserPlus,
        body: (
            <>
                <p>{t('Add the club\'s players under')}{' '}<strong>{t('Club → Players')}</strong>{t(': a nickname, the name, a picture and the date of birth (for the handicap suggestion and the Hall of Shame: a player without one is never in it). The edit button opens a page of the player: their details, whether their nickname is public, their login, and their ways out and darts.')}</p>
                <ul>
                    <li><strong>{t('Login:')}</strong>{' '}{t('give a player a login with their email, so they can start games and trainings on their own. With mail set up they get a mail to choose their password; otherwise set an initial password and pass it on.')}</li>
                    <li>{t('A player with a login keeps their name (from their account), nickname and picture up to date themselves; you still set the date of birth, which adults may correct (never to a child\'s). Removing the login hands everything back to you.')}</li>
                    <li>{t('You can add yourself as a player of a club you manage, under My clubs, to be picked for games like anyone else.')}</li>
                    <li>{t('A nickname only appears on the public start page when it is set to public. A player with a login decides this themselves, on their profile; for the players without one you decide, on their page.')}</li>
                    <li><strong>{t('Without a login:')}</strong>{' '}{t('a player who agrees can still get their badges, level and records once a day and their week on Mondays by mail: add their address under Mails without a login on their page. It is only for these mails, never shown to other players, and every mail has a link to get no more.')}</li>
                    <li><strong>{t('A login of their own, with a link:')}</strong>{' '}{t('on the same page, a link with a QR code to show at the club night, print or pass on. Whoever opens it creates a login, or logs in, and takes over the player with all games, statistics and badges. It works for 30 days. A login given and not used after a week is reported to you, and Send the invitation again sends a new link.')}</li>
                    <li>{t('For a player without a login you also choose their country and their darts on their page, and unlock flights and barrels with their flight points.')}</li>
                    <li><strong>{t('To complete')}</strong>{' '}{t('above the list of the players names the members still without a date of birth or a login; each name opens their page at the right place.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Several clubs'),
        icon: FaArrowRightArrowLeft,
        body: (
            <>
                <p>{t('A player can be a member of several clubs, with one profile and the badges from every club. Admins of more than one club move a player to another of their clubs, add them to a second one or remove them from a club, under Clubs on the player\'s edit page (the edit button in Club → Players).')}</p>
                <ul>
                    <li>{t('Moving takes the history along: games in which every player left the old club for the same new club move with them, and so do the trainings of a player who now plays in one club only.')}</li>
                    <li>{t('Games with a player still in the old club stay there. Removing a player from a club keeps their games in it.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Games, trainings and the dashboard'),
        icon: FaTableCellsLarge,
        body: (
            <ul className="m-0">
                <li><strong>{t('Club → Games')}</strong>{' '}{t('and')}{' '}<strong>{t('Trainings')}</strong>{' '}{t('list everything played, with filters (Around the Clock and X01 against the bot together); admins delete single games or several at once, together with the badges earned in them, and see the trainings players keep to themselves. Players delete their own trainings.')}</li>
                <li>{t('A player can ask to delete a game they played (the flag in its row). The other players are asked to agree; when every player has a login and all agree, it goes by itself, otherwise you decide: open the request from the notification or the flag, then delete the game or keep it, with a note for the players.')}{' '}<strong>{t('Deletion asked')}</strong>{' '}{t('shows the games waiting.')}</li>
                <li>{t('The admins are told through the notifications when a player asks to delete a game, and when another admin deletes or repairs a game for fair play.')}</li>
                <li><strong>{t('Edit dashboard')}</strong>{' '}{t('arranges the club\'s dashboard right on the page (switch to "The club\'s dashboard"): widgets dragged into place, a third to the full width, removed or added. Everyone sees it, unless they arranged their own; "Default widgets" starts over.')}</li>
            </ul>
        ),
    },
    {
        title: t('Fair play'),
        icon: FaScaleBalanced,
        body: (
            <>
                <p><strong>{t('Club → Fair play')}</strong>{' '}{t('checks every game and training. The count next to it shows what is waiting, red while something impossible is.')}</p>
                <ul>
                    <li><strong>{t('Impossible:')}</strong>{' '}{t('data that cannot come from darts thrown at a board, e.g. Around the Clock in a few seconds or a dart that is not on the board. Delete it, with the badges earned in it, or mark it as a false alarm with the reason.')}</li>
                    <li><strong>{t('Data errors:')}</strong>{' '}{t('wrong but no cheat, e.g. a score left that does not add up. Repair rebuilds the scores left of an X01 game from its darts when every leg still ends the same way.')}</li>
                    <li><strong>{t('Suspicious:')}</strong>{' '}{t('possible but worth a look, e.g. a world-class time, an opponent who never threw, or a player who moved their own date of birth later. Mark it as fine or keep it on the watch list; a date of birth can be restored.')}</li>
                    <li><strong>{t('Across games:')}</strong>{' '}{t('players of one login against each other, the same win against a player who hardly plays otherwise again and again, many tiny games in a short time (padding the club\'s badges and goals) and a player asking to delete mostly the games they lost.')}</li>
                    <li>{t('Every game and training is checked, the newer games and trainings and X01 against the bot too; their results are worked out from the darts, so a result the darts do not give is impossible.')}</li>
                    <li>{t('Details show what was thrown, with the visit at fault marked, before you decide. The players with a login and the other admins are told when a game is deleted or repaired.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Passwords and accounts'),
        icon: FaKey,
        body: (
            <p className="m-0">
                {t('Players who forgot their password reset it from the login page by email, when mail is set up. Without mail, or when their email address does not work, the global admins of the installation help: they correct the email, set a new password or create a link to choose one. Changing their own name, email or password is up to the players, on their profile.')}{' '}{t('A new password never skips the code of two-step login. Without phone and recovery codes, a global admin resets two-step login under Users.')}
            </p>
        ),
    },
    {
        title: t('For global admins'),
        icon: FaGlobe,
        body: (
            <>
                <p>{t('Global admins look after the whole installation and belong to no club. Their menu has the lists of all clubs:')}</p>
                <ul>
                    <li><strong>{t('Clubs, users and players:')}</strong>{' '}{t('every club, every account (to block it, correct an email, set a password or create a link to choose one) and every player, filtered by club.')}</li>
                    <li><strong>{t('Games and trainings')}</strong>{' '}{t('of the clubs chosen, and')}{' '}<strong>{t('Fair play')}</strong>{' '}{t('across all clubs, each entry with its club.')}</li>
                    <li><strong>{t('Quick games:')}</strong>{' '}{t('the games played on the public start page without an account (X01 or Cricket, the players only names), with how many were started and finished per day. They count for no club and are deleted after 30 days; delete them earlier, one or many, e.g. when someone fills the list with nonsense.')}</li>
                    <li><strong>{t('At a glance:')}</strong>{' '}{t('above the lists of games, quick games, trainings, users, players and clubs, the whole installation: the last 30 days and 12 weeks, the clubs playing most or the largest (a click shows the club in the list), games left running for over a week, the formats of the quick games, the roles and languages of the users with the accounts never used, unused for half a year or without a club, and the quiet and newest clubs.')}</li>
                    <li><strong>{t('Alerts and error log:')}</strong>{' '}{t('unusual activity, e.g. many accounts, games or quick games created at once, many failed logins or password resets, web addresses in names, club texts or requests to join, a new admin who removes the others, much deleted in a short time, a young club earning club badges in a burst or a club with many impossible games; and the errors of the app.')}</li>
                    <li><strong>{t('Privacy and imprint:')}</strong>{' '}{t('under System settings who runs the installation (name, address, contact email, and more such as the hosting): shown on the privacy page, linked in the footer of the public pages and on About. Fill it in before making the installation public.')}</li>
                    <li><strong>{t('Two-step login:')}</strong>{' '}{t('under System settings off, optional (the default), required for the admins (club admins and global admins) or for everyone, with days to set it up: until then a reminder shows, after that the login asks to set it up first. Requiring it needs it on for your own account first. A lost phone: Users → Edit → Reset two-step login, which raises an alert; ADMIN_RESET_MFA=<email> resets it for a global admin at the next start.')}</li>
                    <li><strong>{t('System settings:')}</strong>{' '}{t('how long a login lasts (1 to 24 hours, five by default), the banner shown to everyone, whether the start page shows the numbers of the installation (clubs, players, games), hidden until they speak for it, and the')}{' '}<strong>{t('mail templates')}</strong>{t(': the subject, text and button of every mail the app sends (password reset, admin added or invited, player login added or invited), with placeholders such as')}{' '}{t('{{firstname}}')}{' '}{t('or')}{' '}{t('{{club}}')}{t(', a preview, a test mail to yourself and the way back to the default.')}</li>
                </ul>
            </>
        ),
    },
    {
        title: t('Your own player'),
        icon: FaUserPen,
        body: (
            <p className="m-0">
                {t('Being an admin does not make you a player. Add yourself as a player of the club under My clubs to play and collect badges and levels yourself.')}
            </p>
        ),
    },
];
