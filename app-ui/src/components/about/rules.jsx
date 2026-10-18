import { MdSportsCricket } from "react-icons/md";
import { FaBullseye, FaKeyboard } from "react-icons/fa6";
import { BiTargetLock } from "react-icons/bi";
import { PiClockCountdownBold } from "react-icons/pi";

/**
 * How the game modes work and how darts are entered, as shown on the About page.
 */
const RULES = [
    {
        title: 'Entering darts',
        icon: FaKeyboard,
        body: (
            <>
                <p>Tap the dartboard, or type each dart into the three fields and send the visit.</p>
                <ul>
                    <li><strong>S</strong>, <strong>D</strong> or <strong>T</strong> plus the number: single, double or treble. “T20” scores 60, “D16” scores 32.</li>
                    <li><strong>S25</strong> is the outer bull (25), <strong>D25</strong> the bullseye (50).</li>
                    <li><strong>0</strong> for a dart that missed the board.</li>
                </ul>
                <p className="m-0">A mistake? The undo button takes the last visit back.</p>
            </>
        ),
    },
    {
        title: 'X01',
        icon: FaBullseye,
        body: (
            <>
                <p>Everyone starts on the same score, from 101 to 1001, and counts down to exactly zero. The first to reach zero wins the leg.</p>
                <ul>
                    <li><strong>Starting in:</strong> straight in counts every dart; double in starts counting with a double; master in with a double or treble.</li>
                    <li><strong>Checkout:</strong> straight out finishes with any dart; double out needs a double for the last dart; master out a double or treble.</li>
                    <li><strong>Bust:</strong> going below zero, or leaving a score you cannot finish, keeps your score from before the visit.</li>
                    <li><strong>Sets and legs:</strong> play “best of” or “first to” a number of legs, optionally in several sets.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Cricket',
        icon: MdSportsCricket,
        body: (
            <>
                <p>Only 15 to 20 and the bull count. Three hits close a number: a single counts once, a double twice, a treble three times.</p>
                <ul>
                    <li>Once you have closed a number, further hits on it score points while an opponent still has it open.</li>
                    <li>You win when you have closed every number and have at least as many points as everyone else.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Elimination',
        icon: BiTargetLock,
        body: (
            <>
                <p>Everyone counts up from zero towards the target score, for example 301. The first to hit it exactly wins.</p>
                <ul>
                    <li><strong>Eliminate:</strong> land exactly on an opponent’s score and they drop back to zero.</li>
                    <li><strong>In and out modes</strong> work as in X01: double or master in to start, double or master out to finish.</li>
                    <li><strong>Bust:</strong> going over the target keeps your score from before the visit.</li>
                </ul>
            </>
        ),
    },
    {
        title: 'Around the Clock',
        icon: PiClockCountdownBold,
        body: (
            <>
                <p>A training: hit 1 to 20 in order, then the bull. Play it in one of two ways:</p>
                <ul>
                    <li><strong>Against the clock:</strong> start the stopwatch, play, and stop it with your last hit. The fastest time wins.</li>
                    <li><strong>Fewest darts:</strong> tap Hit or Miss for every dart. Up to four players take turns of three darts; the fewest darts win, 21 is perfect.</li>
                </ul>
                <ul>
                    <li><strong>Single, Double or Triple:</strong> only that ring counts. Single mode ends on the outer bull, Double and Triple on the bullseye.</li>
                    <li><strong>All:</strong> any ring counts, and you finish on either bull.</li>
                </ul>
                <p className="m-0">Every mode keeps its own best time and its own fewest darts, and beating them is celebrated.</p>
            </>
        ),
    },
];

export default RULES;
