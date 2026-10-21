import { MdSportsCricket } from "react-icons/md";
import { FaBullseye, FaKeyboard } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";
import { PiClockCountdownBold } from "react-icons/pi";

// one part of a game's rules, with a small heading
const Part = ({ title, children }) => (
    <>
        <h3 className="about-rule-part">{title}</h3>
        {children}
    </>
);

/**
 * How darts are entered and the rules of every game, as the app counts them,
 * shown on the About page.
 */
const RULES = [
    {
        title: 'Entering darts',
        icon: FaKeyboard,
        body: (
            <>
                <p>Tap the dartboard, or switch to the keypad and type each dart, then send the visit. A visit has up to three darts; a visit that wins or busts can end earlier. The app remembers whether you use the board or the keypad.</p>
                <ul>
                    <li><strong>S</strong>, <strong>D</strong> or <strong>T</strong> plus the number: single, double or treble. “T20” scores 60, “D16” scores 32.</li>
                    <li><strong>S25</strong> is the outer bull (25), <strong>D25</strong> the bullseye (50).</li>
                    <li><strong>0</strong> for a dart that missed the board or bounced out.</li>
                    <li>On the board: a finger held on it shows the field under it in a magnifier, and the dart counts where the finger is lifted (off the board: nothing).</li>
                    <li>With the dart animation on, a dart flies to the field you tapped and sticks there with your flights and barrel; off, the field just lights up. It is off to begin with: each player switches it on on their player profile; the setup of a game can switch it on or off for everyone.</li>
                </ul>
                <p className="m-0">A mistake? Undo takes the last visit back, also over several players. The game is saved after every visit, so it can be continued later.</p>
            </>
        ),
    },
    {
        title: 'X01',
        icon: FaBullseye,
        body: (
            <>
                <p>The classic: every player starts on the same score and counts down to exactly zero. The first to reach zero wins the leg.</p>
                <Part title="Setting up">
                    <ul>
                        <li><strong>Starting score:</strong> 101, 170, 201, 301, 401, 501, 701 or 1001. 501 is the standard, 301 is shorter.</li>
                        <li><strong>Legs and sets:</strong> “best of” (e.g. best of 5: the first to 3 legs) or “first to” a number of legs, optionally in several sets, each won like a leg. Quick formats set everything with one tap.</li>
                        <li><strong>Handicap:</strong> each player can get their own starting score and in and out mode, e.g. 301 straight out for a child against 501 double out. The suggestion comes from the recent average, level and age.</li>
                    </ul>
                </Part>
                <Part title="Starting and finishing">
                    <ul>
                        <li><strong>Straight in</strong> counts every dart; <strong>double in</strong> starts counting with a double, <strong>master in</strong> with a double or treble. Darts before it score nothing.</li>
                        <li><strong>Straight out</strong> finishes with any dart; <strong>double out</strong> needs a double (or the bullseye) as the last dart, <strong>master out</strong> a double or treble.</li>
                    </ul>
                </Part>
                <Part title="Bust">
                    <p>A visit busts when it goes below zero, leaves 1 with double or master out (nothing finishes 1), or reaches zero with the wrong last dart. The score goes back to what it was before the visit; the darts still count for the averages.</p>
                </Part>
                <Part title="Turns and winning">
                    <ul className="m-0">
                        <li>The player who starts moves on by one every leg, and every set, so nobody always has the first throw.</li>
                        <li>Whoever wins the needed number of legs (or sets) wins the game. The tips show the way out from 170 down, with the player&apos;s favourite double first.</li>
                    </ul>
                </Part>
                <Part title="Against the bot">
                    <ul className="m-0">
                        <li>Under Training, X01 against the bot is a game of X01 for one player: the same rules, from 101 to 701, with in and out modes, legs and sets, and the choice of who starts.</li>
                        <li><strong>The bot:</strong> a fixed one (Easy, Normal, Hard or Pro, about a 30, 45, 60 or 80 average), or one like you, worked out from your recent form or your X01 average and your checkout rate, also a bit easier or harder.</li>
                        <li>It aims like a player, at the way out, a setup shot or the treble, and misses like one: next door, the single, or outside a double. Its darts appear one by one; the board waits while it throws.</li>
                        <li>A training counts for no game statistics, badges or levels, but it earns flight points; the last trainings are listed with the result and both averages.</li>
                    </ul>
                </Part>
            </>
        ),
    },
    {
        title: 'Cricket',
        icon: MdSportsCricket,
        body: (
            <>
                <p>Only 15 to 20 and the bull count. Close all seven before the others, and score on the numbers they still have open.</p>
                <Part title="Closing">
                    <ul>
                        <li>A single is one mark, a double two, a treble three. The outer bull is one mark, the bullseye two.</li>
                        <li>Three marks close a number for you. The numbers can be closed in any order.</li>
                        <li>A number every player has closed is out of play: hits on it count for nothing.</li>
                    </ul>
                </Part>
                <Part title="Variants">
                    <ul>
                        <li><strong>Standard:</strong> marks beyond three score the number for you while an opponent still has it open (a treble 20 on a closed 20 is 60 points). With all numbers closed and the highest score, or a tie, you win.</li>
                        <li><strong>Cut-throat:</strong> those points go to every opponent who still has the number open, so you hurt them instead. With all numbers closed and the lowest score, or a tie, you win.</li>
                        <li><strong>No-score:</strong> only closing counts; the first to close all seven wins.</li>
                    </ul>
                </Part>
                <Part title="Winning">
                    <p className="m-0">The game ends as soon as one player has closed every number and the score is right for the variant. Someone who has closed everything but is behind on points has to keep scoring (or, in cut-throat, wait for the others to catch up).</p>
                </Part>
            </>
        ),
    },
    {
        title: 'Elimination',
        icon: BiTargetLock,
        body: (
            <>
                <p>Everyone counts up from zero towards the target score. The first to hit it exactly wins, and on the way you send others back to the start.</p>
                <Part title="Setting up">
                    <p>Choose the target score (301 is usual) and the in and out modes, which work as in X01: double or master in to start counting, double or master out to finish.</p>
                </Part>
                <Part title="Sending back">
                    <ul>
                        <li>After every dart your score is compared with the others: land exactly on an opponent&apos;s score and they go back to 0. One dart can send back several players at once.</li>
                        <li>A player on 0 cannot be sent back.</li>
                    </ul>
                </Part>
                <Part title="Bust">
                    <p>A visit busts when it goes over the target, leaves 1 with double out, or hits the target with the wrong last dart. Your score stays where it was before the visit, and nobody you landed on during that visit is sent back.</p>
                </Part>
                <Part title="Winning">
                    <p className="m-0">The first to reach the target exactly, with the right last dart for the out mode, wins.</p>
                </Part>
            </>
        ),
    },
    {
        title: 'Around the Clock',
        icon: PiClockCountdownBold,
        body: (
            <>
                <p>Hit 1 to 20 in order, then the bull. As a training on your own (or with others), or as a game against each other.</p>
                <Part title="Modes">
                    <ul>
                        <li><strong>Single, Double or Triple:</strong> only that ring of the target counts. Single ends on the outer bull, Double and Triple on the bullseye.</li>
                        <li><strong>All:</strong> any ring counts, and either bull finishes.</li>
                    </ul>
                </Part>
                <Part title="Training">
                    <ul>
                        <li><strong>Against the clock:</strong> start the stopwatch, play, and stop it with your last hit. The fastest time counts.</li>
                        <li><strong>Fewest darts:</strong> tap Hit or Miss for every dart; 21 darts is perfect. Several players take turns of three darts.</li>
                        <li>Every mode keeps its own best time and its own fewest darts per player, on the training scoreboard; beating them is celebrated.</li>
                    </ul>
                </Part>
                <Part title="Game">
                    <ul className="m-0">
                        <li>Two to four players take turns of three darts. The first to finish wins, but the round is completed, so everybody has had as many turns.</li>
                        <li>Finished in the same round, fewer darts win; the others are placed by how far they got.</li>
                        <li><strong>Skip ahead</strong> (in mode All): a double moves on two numbers and a treble three; the bull still has to be hit. Games do not count for the training scoreboard.</li>
                    </ul>
                </Part>
            </>
        ),
    },
];

export default RULES;
