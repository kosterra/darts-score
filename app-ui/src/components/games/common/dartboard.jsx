import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Dart from './dart.shape';

// the magnifier: its size on screen and how much it enlarges
const LOUPE_SIZE = 128;
const LOUPE_ZOOM = 2.6;

// a field as players say it
const labelOf = (field) => !field || field === '0' ? 'Miss' : field === 'D25' ? 'Bull' : field === 'S25' ? '25' : field;

// the board itself: every field with its id ("T20", "D25", "0" outside)
const BoardShapes = () => (
    <>
    <g transform="translate(210, 210) scale(1, -1)">
        {/* beyond the black ring is off the board: it counts for nothing */}
        <circle
            className="out"
            cx="0"
            cy="0"
            r="9999"
            pointerEvents="none">
        </circle>
        <circle id="0"
            className="item zero"
            cx="0"
            cy="0"
            r="210"
            label="0"
            value="0">
        </circle>
        <circle id="0"
            className="item filler"
            cx="0"
            cy="0"
            r="170">
        </circle>
        <circle id="S25"
            className="item single-bull"
            cx="0"
            cy="0"
            r="41">
        </circle>
        <circle id="D25"
            className="item double-bull"
            cx="0"
            cy="0"
            r="16">
        </circle>
        <path d="M 83.95350895058671,13.296929528419623 A 85 85 0 0 0 83.95350895058671,-13.296929528419623 L 40.49522196440065,-6.413813066649466 A 41 41 0 0 1 40.49522196440065,6.413813066649466 Z"
            id="S6"
            className="item odd single">
        </path>
        <path d="M 105.68265244367974,16.738487759304704 A 107 107 0 0 0 105.68265244367974,-16.738487759304704 L 83.95350895058671,-13.296929528419623 A 85 85 0 0 1 83.95350895058671,13.296929528419623 Z"
            id="T6"
            className="item odd triple">
        </path>
        <path d="M 148.15325108927067,23.46516975603463 A 150 150 0 0 0 148.15325108927067,-23.46516975603463 L 105.68265244367974,-16.738487759304704 A 107 107 0 0 1 105.68265244367974,16.738487759304704 Z"
            id="S6"
            className="item odd single">
        </path>
        <path d="M 167.90701790117342,26.593859056839246 A 170 170 0 0 0 167.90701790117342,-26.593859056839246 L 148.15325108927067,-23.46516975603463 A 150 150 0 0 1 148.15325108927067,23.46516975603463 Z"
            id="D6"
            className="item odd double">
        </path>
        <path d="M 75.73555455601127,38.589192477861474 A 85 85 0 0 0 83.95350895058671,13.296929528419623 L 40.49522196440065,6.413813066649466 A 41 41 0 0 1 36.531267491723085,18.613610489321417 Z"
            id="S13"
            className="item even single">
        </path>
        <path d="M 95.33769808815536,48.5769834721315 A 107 107 0 0 0 105.68265244367974,16.738487759304704 L 83.95350895058671,13.296929528419623 A 85 85 0 0 1 75.73555455601127,38.589192477861474 Z"
            id="T13"
            className="item even triple">
        </path>
        <path d="M 133.6509786282552,68.09857496093201 A 150 150 0 0 0 148.15325108927067,23.46516975603463 L 105.68265244367974,16.738487759304704 A 107 107 0 0 1 95.33769808815536,48.5769834721315 Z"
            id="S13"
            className="item even single">
        </path>
        <path d="M 151.47110911202253,77.17838495572295 A 170 170 0 0 0 167.90701790117342,26.593859056839246 L 148.15325108927067,23.46516975603463 A 150 150 0 0 1 133.6509786282552,68.09857496093201 Z"
            id="D13"
            className="item even double">
        </path>
        <path d="M 60.10407640085654,60.104076400856535 A 85 85 0 0 0 75.73555455601127,38.589192477861474 L 36.531267491723085,18.613610489321417 A 41 41 0 0 1 28.99137802864845,28.991378028648445 Z"
            id="S4"
            className="item odd single">
        </path>
        <path d="M 75.66042558696059,75.66042558696059 A 107 107 0 0 0 95.33769808815536,48.5769834721315 L 75.73555455601127,38.589192477861474 A 85 85 0 0 1 60.10407640085654,60.104076400856535 Z"
            id="T4"
            className="item odd triple">
        </path>
        <path d="M 106.06601717798213,106.06601717798212 A 150 150 0 0 0 133.6509786282552,68.09857496093201 L 95.33769808815536,48.5769834721315 A 107 107 0 0 1 75.66042558696059,75.66042558696059 Z"
            id="S4"
            className="item odd single">
        </path>
        <path d="M 120.20815280171308,120.20815280171307 A 170 170 0 0 0 151.47110911202253,77.17838495572295 L 133.6509786282552,68.09857496093201 A 150 150 0 0 1 106.06601717798213,106.06601717798212 Z"
            id="D4"
            className="item odd double">
        </path>
        <path d="M 38.58919247786148,75.73555455601127 A 85 85 0 0 0 60.10407640085654,60.104076400856535 L 28.99137802864845,28.991378028648445 A 41 41 0 0 1 18.61361048932142,36.53126749172308 Z"
            id="S18"
            className="item even single">
        </path>
        <path d="M 48.576983472131516,95.33769808815535 A 107 107 0 0 0 75.66042558696059,75.66042558696059 L 60.10407640085654,60.104076400856535 A 85 85 0 0 1 38.58919247786148,75.73555455601127 Z"
            id="T18"
            className="item even triple">
        </path>
        <path d="M 68.09857496093203,133.65097862825516 A 150 150 0 0 0 106.06601717798213,106.06601717798212 L 75.66042558696059,75.66042558696059 A 107 107 0 0 1 48.576983472131516,95.33769808815535 Z"
            id="S18"
            className="item even single">
        </path>
        <path d="M 77.17838495572296,151.47110911202253 A 170 170 0 0 0 120.20815280171308,120.20815280171307 L 106.06601717798213,106.06601717798212 A 150 150 0 0 1 68.09857496093203,133.65097862825516 Z"
            id="D18"
            className="item even double">
        </path>
        <path d="M 13.296929528419628,83.95350895058671 A 85 85 0 0 0 38.58919247786148,75.73555455601127 L 18.61361048932142,36.53126749172308 A 41 41 0 0 1 6.4138130666494675,40.49522196440065 Z"
            id="S1"
            className="item odd single">
        </path>
        <path d="M 16.738487759304707,105.68265244367974 A 107 107 0 0 0 48.576983472131516,95.33769808815535 L 38.58919247786148,75.73555455601127 A 85 85 0 0 1 13.296929528419628,83.95350895058671 Z"
            id="T1"
            className="item odd triple">
        </path>
        <path d="M 23.465169756034637,148.15325108927067 A 150 150 0 0 0 68.09857496093203,133.65097862825516 L 48.576983472131516,95.33769808815535 A 107 107 0 0 1 16.738487759304707,105.68265244367974 Z"
            id="S1"
            className="item odd single">
        </path>
        <path d="M 26.593859056839257,167.90701790117342 A 170 170 0 0 0 77.17838495572296,151.47110911202253 L 68.09857496093203,133.65097862825516 A 150 150 0 0 1 23.465169756034637,148.15325108927067 Z"
            id="D1"
            className="item odd double">
        </path>
        <path d="M -13.29692952841962,83.95350895058671 A 85 85 0 0 0 13.296929528419628,83.95350895058671 L 6.4138130666494675,40.49522196440065 A 41 41 0 0 1 -6.413813066649463,40.49522196440065 Z"
            id="S20"
            className="item even single">
        </path>
        <path d="M -16.738487759304697,105.68265244367974 A 107 107 0 0 0 16.738487759304707,105.68265244367974 L 13.296929528419628,83.95350895058671 A 85 85 0 0 1 -13.29692952841962,83.95350895058671 Z"
            id="T20"
            className="item even triple">
        </path>
        <path d="M -23.465169756034623,148.15325108927067 A 150 150 0 0 0 23.465169756034637,148.15325108927067 L 16.738487759304707,105.68265244367974 A 107 107 0 0 1 -16.738487759304697,105.68265244367974 Z"
            id="S20"
            className="item even single">
        </path>
        <path d="M -26.59385905683924,167.90701790117342 A 170 170 0 0 0 26.593859056839257,167.90701790117342 L 23.465169756034637,148.15325108927067 A 150 150 0 0 1 -23.465169756034623,148.15325108927067 Z"
            id="D20"
            className="item even double">
        </path>
        <path d="M -38.589192477861474,75.73555455601127 A 85 85 0 0 0 -13.29692952841962,83.95350895058671 L -6.413813066649463,40.49522196440065 A 41 41 0 0 1 -18.613610489321417,36.531267491723085 Z"
            id="S5"
            className="item odd single">
        </path>
        <path d="M -48.5769834721315,95.33769808815536 A 107 107 0 0 0 -16.738487759304697,105.68265244367974 L -13.29692952841962,83.95350895058671 A 85 85 0 0 1 -38.589192477861474,75.73555455601127 Z"
            id="T5"
            className="item odd triple">
        </path>
        <path d="M -68.09857496093201,133.6509786282552 A 150 150 0 0 0 -23.465169756034623,148.15325108927067 L -16.738487759304697,105.68265244367974 A 107 107 0 0 1 -48.5769834721315,95.33769808815536 Z"
            id="S5"
            className="item odd single">
        </path>
        <path d="M -77.17838495572295,151.47110911202253 A 170 170 0 0 0 -26.59385905683924,167.90701790117342 L -23.465169756034623,148.15325108927067 A 150 150 0 0 1 -68.09857496093201,133.6509786282552 Z"
            id="D5"
            className="item odd double">
        </path>
        <path d="M -60.104076400856535,60.10407640085654 A 85 85 0 0 0 -38.589192477861474,75.73555455601127 L -18.613610489321417,36.531267491723085 A 41 41 0 0 1 -28.991378028648445,28.99137802864845 Z"
            id="S12"
            className="item even single">
        </path>
        <path d="M -75.66042558696059,75.66042558696059 A 107 107 0 0 0 -48.5769834721315,95.33769808815536 L -38.589192477861474,75.73555455601127 A 85 85 0 0 1 -60.104076400856535,60.10407640085654 Z"
            id="T12"
            className="item even triple">
        </path>
        <path d="M -106.06601717798212,106.06601717798213 A 150 150 0 0 0 -68.09857496093201,133.6509786282552 L -48.5769834721315,95.33769808815536 A 107 107 0 0 1 -75.66042558696059,75.66042558696059 Z"
            id="S12"
            className="item even single">
        </path>
        <path d="M -120.20815280171307,120.20815280171308 A 170 170 0 0 0 -77.17838495572295,151.47110911202253 L -68.09857496093201,133.6509786282552 A 150 150 0 0 1 -106.06601717798212,106.06601717798213 Z"
            id="D12"
            className="item even double">
        </path>
        <path d="M -75.73555455601127,38.58919247786148 A 85 85 0 0 0 -60.104076400856535,60.10407640085654 L -28.991378028648445,28.99137802864845 A 41 41 0 0 1 -36.53126749172308,18.61361048932142 Z"
            id="S9"
            className="item odd single">
        </path>
        <path d="M -95.33769808815535,48.576983472131516 A 107 107 0 0 0 -75.66042558696059,75.66042558696059 L -60.104076400856535,60.10407640085654 A 85 85 0 0 1 -75.73555455601127,38.58919247786148 Z"
            id="T9"
            className="item odd triple">
        </path>
        <path d="M -133.65097862825516,68.09857496093203 A 150 150 0 0 0 -106.06601717798212,106.06601717798213 L -75.66042558696059,75.66042558696059 A 107 107 0 0 1 -95.33769808815535,48.576983472131516 Z"
            id="S9"
            className="item odd single">
        </path>
        <path d="M -151.47110911202253,77.17838495572296 A 170 170 0 0 0 -120.20815280171307,120.20815280171308 L -106.06601717798212,106.06601717798213 A 150 150 0 0 1 -133.65097862825516,68.09857496093203 Z"
            id="D9"
            className="item odd double">
        </path>
        <path d="M -83.9535089505867,13.296929528419634 A 85 85 0 0 0 -75.73555455601127,38.58919247786148 L -36.53126749172308,18.61361048932142 A 41 41 0 0 1 -40.49522196440064,6.41381306664947 Z"
            id="S14"
            className="item even single">
        </path>
        <path d="M -105.68265244367973,16.738487759304714 A 107 107 0 0 0 -95.33769808815535,48.576983472131516 L -75.73555455601127,38.58919247786148 A 85 85 0 0 1 -83.9535089505867,13.296929528419634 Z"
            id="T14"
            className="item even triple">
        </path>
        <path d="M -148.15325108927064,23.465169756034648 A 150 150 0 0 0 -133.65097862825516,68.09857496093203 L -95.33769808815535,48.576983472131516 A 107 107 0 0 1 -105.68265244367973,16.738487759304714 Z"
            id="S14"
            className="item even single">
        </path>
        <path d="M -167.9070179011734,26.593859056839268 A 170 170 0 0 0 -151.47110911202253,77.17838495572296 L -133.65097862825516,68.09857496093203 A 150 150 0 0 1 -148.15325108927064,23.465169756034648 Z"
            id="D14"
            className="item even double">
        </path>
        <path d="M -83.95350895058671,-13.296929528419613 A 85 85 0 0 0 -83.9535089505867,13.296929528419634 L -40.49522196440064,6.41381306664947 A 41 41 0 0 1 -40.49522196440065,-6.41381306664946 Z"
            id="S11"
            className="item odd single">
        </path>
        <path d="M -105.68265244367974,-16.73848775930469 A 107 107 0 0 0 -105.68265244367973,16.738487759304714 L -83.9535089505867,13.296929528419634 A 85 85 0 0 1 -83.95350895058671,-13.296929528419613 Z"
            id="T11"
            className="item odd triple">
        </path>
        <path d="M -148.15325108927067,-23.46516975603461 A 150 150 0 0 0 -148.15325108927064,23.465169756034648 L -105.68265244367973,16.738487759304714 A 107 107 0 0 1 -105.68265244367974,-16.73848775930469 Z"
            id="S11"
            className="item odd single">
        </path>
        <path d="M -167.90701790117342,-26.593859056839225 A 170 170 0 0 0 -167.9070179011734,26.593859056839268 L -148.15325108927064,23.465169756034648 A 150 150 0 0 1 -148.15325108927067,-23.46516975603461 Z"
            id="D11"
            className="item odd double">
        </path>
        <path d="M -75.73555455601127,-38.58919247786147 A 85 85 0 0 0 -83.95350895058671,-13.296929528419613 L -40.49522196440065,-6.41381306664946 A 41 41 0 0 1 -36.531267491723085,-18.613610489321413 Z"
            id="S8"
            className="item even single">
        </path>
        <path d="M -95.33769808815536,-48.576983472131495 A 107 107 0 0 0 -105.68265244367974,-16.73848775930469 L -83.95350895058671,-13.296929528419613 A 85 85 0 0 1 -75.73555455601127,-38.58919247786147 Z"
            id="T8"
            className="item even triple">
        </path>
        <path d="M -133.6509786282552,-68.098574960932 A 150 150 0 0 0 -148.15325108927067,-23.46516975603461 L -105.68265244367974,-16.73848775930469 A 107 107 0 0 1 -95.33769808815536,-48.576983472131495 Z"
            id="S8"
            className="item even single">
        </path>
        <path d="M -151.47110911202253,-77.17838495572293 A 170 170 0 0 0 -167.90701790117342,-26.593859056839225 L -148.15325108927067,-23.46516975603461 A 150 150 0 0 1 -133.6509786282552,-68.098574960932 Z"
            id="D8"
            className="item even double">
        </path>
        <path d="M -60.104076400856556,-60.104076400856535 A 85 85 0 0 0 -75.73555455601127,-38.58919247786147 L -36.531267491723085,-18.613610489321413 A 41 41 0 0 1 -28.991378028648455,-28.991378028648445 Z"
            id="S16"
            className="item odd single">
        </path>
        <path d="M -75.6604255869606,-75.66042558696059 A 107 107 0 0 0 -95.33769808815536,-48.576983472131495 L -75.73555455601127,-38.58919247786147 A 85 85 0 0 1 -60.104076400856556,-60.104076400856535 Z"
            id="T16"
            className="item odd triple">
        </path>
        <path d="M -106.06601717798215,-106.06601717798212 A 150 150 0 0 0 -133.6509786282552,-68.098574960932 L -95.33769808815536,-48.576983472131495 A 107 107 0 0 1 -75.6604255869606,-75.66042558696059 Z"
            id="S16"
            className="item odd single">
        </path>
        <path d="M -120.20815280171311,-120.20815280171307 A 170 170 0 0 0 -151.47110911202253,-77.17838495572293 L -133.6509786282552,-68.098574960932 A 150 150 0 0 1 -106.06601717798215,-106.06601717798212 Z"
            id="D16"
            className="item odd double">
        </path>
        <path d="M -38.58919247786149,-75.73555455601127 A 85 85 0 0 0 -60.104076400856556,-60.104076400856535 L -28.991378028648455,-28.991378028648445 A 41 41 0 0 1 -18.613610489321424,-36.53126749172308 Z"
            id="S7"
            className="item even single">
        </path>
        <path d="M -48.57698347213152,-95.33769808815535 A 107 107 0 0 0 -75.6604255869606,-75.66042558696059 L -60.104076400856556,-60.104076400856535 A 85 85 0 0 1 -38.58919247786149,-75.73555455601127 Z"
            id="T7"
            className="item even triple">
        </path>
        <path d="M -68.09857496093204,-133.65097862825516 A 150 150 0 0 0 -106.06601717798215,-106.06601717798212 L -75.6604255869606,-75.66042558696059 A 107 107 0 0 1 -48.57698347213152,-95.33769808815535 Z"
            id="S7"
            className="item even single">
        </path>
        <path d="M -77.17838495572298,-151.47110911202253 A 170 170 0 0 0 -120.20815280171311,-120.20815280171307 L -106.06601717798215,-106.06601717798212 A 150 150 0 0 1 -68.09857496093204,-133.65097862825516 Z"
            id="D7"
            className="item even double">
        </path>
        <path d="M -13.296929528419637,-83.9535089505867 A 85 85 0 0 0 -38.58919247786149,-75.73555455601127 L -18.613610489321424,-36.53126749172308 A 41 41 0 0 1 -6.413813066649473,-40.49522196440064 Z"
            id="S19"
            className="item odd single">
        </path>
        <path d="M -16.73848775930472,-105.68265244367973 A 107 107 0 0 0 -48.57698347213152,-95.33769808815535 L -38.58919247786149,-75.73555455601127 A 85 85 0 0 1 -13.296929528419637,-83.9535089505867 Z"
            id="T19"
            className="item odd triple">
        </path>
        <path d="M -23.465169756034655,-148.15325108927064 A 150 150 0 0 0 -68.09857496093204,-133.65097862825516 L -48.57698347213152,-95.33769808815535 A 107 107 0 0 1 -16.73848775930472,-105.68265244367973 Z"
            id="S19"
            className="item odd single">
        </path>
        <path d="M -26.593859056839275,-167.9070179011734 A 170 170 0 0 0 -77.17838495572298,-151.47110911202253 L -68.09857496093204,-133.65097862825516 A 150 150 0 0 1 -23.465169756034655,-148.15325108927064 Z"
            id="D19"
            className="item odd double">
        </path>
        <path d="M 13.296929528419607,-83.95350895058671 A 85 85 0 0 0 -13.296929528419637,-83.9535089505867 L -6.413813066649473,-40.49522196440064 A 41 41 0 0 1 6.413813066649458,-40.49522196440065 Z"
            id="S3"
            className="item even single">
        </path>
        <path d="M 16.738487759304682,-105.68265244367974 A 107 107 0 0 0 -16.73848775930472,-105.68265244367973 L -13.296929528419637,-83.9535089505867 A 85 85 0 0 1 13.296929528419607,-83.95350895058671 Z"
            id="T3"
            className="item even triple">
        </path>
        <path d="M 23.4651697560346,-148.15325108927067 A 150 150 0 0 0 -23.465169756034655,-148.15325108927064 L -16.73848775930472,-105.68265244367973 A 107 107 0 0 1 16.738487759304682,-105.68265244367974 Z"
            id="S3"
            className="item even single">
        </path>
        <path d="M 26.593859056839214,-167.90701790117342 A 170 170 0 0 0 -26.593859056839275,-167.9070179011734 L -23.465169756034655,-148.15325108927064 A 150 150 0 0 1 23.4651697560346,-148.15325108927067 Z"
            id="D3"
            className="item even double">
        </path>
        <path d="M 38.58919247786147,-75.73555455601128 A 85 85 0 0 0 13.296929528419607,-83.95350895058671 L 6.413813066649458,-40.49522196440065 A 41 41 0 0 1 18.613610489321413,-36.531267491723085 Z"
            id="S17"
            className="item odd single">
        </path>
        <path d="M 48.57698347213149,-95.33769808815538 A 107 107 0 0 0 16.738487759304682,-105.68265244367974 L 13.296929528419607,-83.95350895058671 A 85 85 0 0 1 38.58919247786147,-75.73555455601128 Z"
            id="T17"
            className="item odd triple">
        </path>
        <path d="M 68.098574960932,-133.6509786282552 A 150 150 0 0 0 23.4651697560346,-148.15325108927067 L 16.738487759304682,-105.68265244367974 A 107 107 0 0 1 48.57698347213149,-95.33769808815538 Z"
            id="S17"
            className="item odd single">
        </path>
        <path d="M 77.17838495572293,-151.47110911202256 A 170 170 0 0 0 26.593859056839214,-167.90701790117342 L 23.4651697560346,-148.15325108927067 A 150 150 0 0 1 68.098574960932,-133.6509786282552 Z"
            id="D17"
            className="item odd double">
        </path>
        <path d="M 60.10407640085653,-60.104076400856556 A 85 85 0 0 0 38.58919247786147,-75.73555455601128 L 18.613610489321413,-36.531267491723085 A 41 41 0 0 1 28.99137802864844,-28.991378028648455 Z"
            id="S2"
            className="item even single">
        </path>
        <path d="M 75.66042558696057,-75.6604255869606 A 107 107 0 0 0 48.57698347213149,-95.33769808815538 L 38.58919247786147,-75.73555455601128 A 85 85 0 0 1 60.10407640085653,-60.104076400856556 Z"
            id="T2"
            className="item even triple">
        </path>
        <path d="M 106.0660171779821,-106.06601717798215 A 150 150 0 0 0 68.098574960932,-133.6509786282552 L 48.57698347213149,-95.33769808815538 A 107 107 0 0 1 75.66042558696057,-75.6604255869606 Z"
            id="S2"
            className="item even single">
        </path>
        <path d="M 120.20815280171306,-120.20815280171311 A 170 170 0 0 0 77.17838495572293,-151.47110911202256 L 68.098574960932,-133.6509786282552 A 150 150 0 0 1 106.0660171779821,-106.06601717798215 Z"
            id="D2"
            className="item even double">
        </path>
        <path d="M 75.73555455601127,-38.589192477861495 A 85 85 0 0 0 60.10407640085653,-60.104076400856556 L 28.99137802864844,-28.991378028648455 A 41 41 0 0 1 36.53126749172308,-18.613610489321427 Z"
            id="S15"
            className="item odd single">
        </path>
        <path d="M 95.33769808815535,-48.57698347213152 A 107 107 0 0 0 75.66042558696057,-75.6604255869606 L 60.10407640085653,-60.104076400856556 A 85 85 0 0 1 75.73555455601127,-38.589192477861495 Z"
            id="T15"
            className="item odd triple">
        </path>
        <path d="M 133.65097862825516,-68.09857496093204 A 150 150 0 0 0 106.0660171779821,-106.06601717798215 L 75.66042558696057,-75.6604255869606 A 107 107 0 0 1 95.33769808815535,-48.57698347213152 Z"
            id="S15"
            className="item odd single">
        </path>
        <path d="M 151.47110911202253,-77.17838495572299 A 170 170 0 0 0 120.20815280171306,-120.20815280171311 L 106.0660171779821,-106.06601717798215 A 150 150 0 0 1 133.65097862825516,-68.09857496093204 Z"
            id="D15"
            className="item odd double">
        </path>
        <path d="M 83.9535089505867,-13.296929528419644 A 85 85 0 0 0 75.73555455601127,-38.589192477861495 L 36.53126749172308,-18.613610489321427 A 41 41 0 0 1 40.49522196440064,-6.4138130666494755 Z"
            id="S10"
            className="item even single">
        </path>
        <path d="M 105.68265244367973,-16.73848775930473 A 107 107 0 0 0 95.33769808815535,-48.57698347213152 L 75.73555455601127,-38.589192477861495 A 85 85 0 0 1 83.9535089505867,-13.296929528419644 Z"
            id="T10"
            className="item even triple">
        </path>
        <path d="M 148.15325108927064,-23.46516975603467 A 150 150 0 0 0 133.65097862825516,-68.09857496093204 L 95.33769808815535,-48.57698347213152 A 107 107 0 0 1 105.68265244367973,-16.73848775930473 Z"
            id="S10"
            className="item even single">
        </path>
        <path d="M 167.9070179011734,-26.59385905683929 A 170 170 0 0 0 151.47110911202253,-77.17838495572299 L 133.65097862825516,-68.09857496093204 A 150 150 0 0 1 148.15325108927064,-23.46516975603467 Z"
            id="D10"
            className="item even double">
        </path>
    </g>

    <g transform="translate(210, 210)">
        <text id="0" className="number" x="189" y="8">6</text>
        <text id="0" className="number" x="180" y="-48">13</text>
        <text id="0" className="number" x="155" y="-102">4</text>
        <text id="0" className="number" x="115" y="-145">18</text>
        <text id="0" className="number" x="58" y="-172">1</text>
        <text id="0" className="number" x="0" y="-182">20</text>
        <text id="0" className="number" x="-60" y="-174">5</text>
        <text id="0" className="number" x="-118" y="-145">12</text>
        <text id="0" className="number" x="-155" y="-105">9</text>
        <text id="0" className="number" x="-183" y="-52">14</text>
        <text id="0" className="number" x="-190" y="8">11</text>
        <text id="0" className="number" x="-180" y="66">8</text>
        <text id="0" className="number" x="-157" y="118">16</text>
        <text id="0" className="number" x="-112" y="160">7</text>
        <text id="0" className="number" x="-60" y="188">19</text>
        <text id="0" className="number" x="0" y="198">3</text>
        <text id="0" className="number" x="58" y="188">17</text>
        <text id="0" className="number" x="112" y="160">2</text>
        <text id="0" className="number" x="157" y="118">15</text>
        <text id="0" className="number" x="180" y="66">10</text>
    </g>
    </>
);

// how long a dart flies before it sticks (the CSS animation takes as long)
const FLIGHT_MS = 320;

/**
 * The dartboard to tap: handleClick(field, point) with the field that was hit
 * (e.g. "T20") and where, in the board's own coordinates. markers: points of
 * darts to show on the board, the last one pulsing: { x, y, dart }. withDarts:
 * a dart flies to each of them and sticks, and the field lights up when it
 * lands (also for darts that were not tapped, e.g. the bot's), with the
 * flight { color, shape, design, barrel }. Without it the field lights up at once.
 *
 * The field hit lights up and the phone vibrates briefly. With a finger, a
 * magnifier above it shows the field underneath while it is held; the dart is
 * entered when the finger is lifted (outside the board: nothing).
 */
const DartBoard = (props) => {
    const {
        handleClick,
        markers = [],
        withDarts = false,
        flight = { color: '#4aa8ff', pattern: 'plain' }
    } = props;

    const svgRef = useRef(null);
    // { left, top, viewBox, field } while a finger is on the board
    const [loupe, setLoupe] = useState(null);
    const touching = useRef(false);
    // the click browsers send after a touch was already handled
    const ignoreClickUntil = useRef(0);

    // a point on the screen in the coordinates of the board's viewBox
    const toBoard = (clientX, clientY) => {
        const svg = svgRef.current;
        const matrix = svg?.getScreenCTM?.();
        if (!matrix) return null;
        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const { x, y } = point.matrixTransform(matrix.inverse());
        return { x, y };
    };

    // the field under a point on the screen ("0" on the black ring), null off the board
    const fieldAt = (clientX, clientY) => {
        const element = document.elementFromPoint(clientX, clientY);
        return element && element !== svgRef.current && svgRef.current?.contains(element) && element.id ? element.id : null;
    };

    const flash = (field) => {
        if (!field || field === '0') return;
        const element = svgRef.current?.querySelector(`[id="${field}"]`);
        if (!element) return;
        element.classList.remove('is-flash');
        // restart the animation when the same field is hit again
        void element.getBoundingClientRect();
        element.classList.add('is-flash');
        setTimeout(() => element.classList.remove('is-flash'), 500);
    };

    // when a dart was tapped last: its field lit up already
    const tappedAt = useRef(0);
    const select = (field, point) => {
        navigator.vibrate?.(12);
        // with darts the field lights up when the dart lands
        if (!withDarts) {
            flash(field);
            tappedAt.current = Date.now();
        }
        handleClick(field, point);
    };

    // a new dart: its field lights up when it sticks, or at once without darts
    // (a dart that was not tapped, e.g. the bot's)
    const darts = markers.filter(Boolean);
    const shownCount = useRef(0);
    useEffect(() => {
        const added = darts.length > shownCount.current ? darts.at(-1) : null;
        shownCount.current = darts.length;
        if (!added?.dart) return undefined;
        if (!withDarts) {
            if (Date.now() - tappedAt.current > 500) flash(added.dart);
            return undefined;
        }
        const timer = setTimeout(() => flash(added.dart), FLIGHT_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [withDarts, darts.length]);

    const showLoupe = (clientX, clientY) => {
        const svg = svgRef.current;
        const point = toBoard(clientX, clientY);
        if (!svg || !point) return;
        const rect = svg.getBoundingClientRect();
        const unitsPerPixel = 420 / Math.min(rect.width, rect.height);
        const span = LOUPE_SIZE / LOUPE_ZOOM * unitsPerPixel;
        // above the finger, below it near the top of the screen
        const above = clientY - LOUPE_SIZE - 48;
        setLoupe({
            left: Math.min(Math.max(8, clientX - LOUPE_SIZE / 2), window.innerWidth - LOUPE_SIZE - 8),
            top: above > 8 ? above : clientY + 48,
            viewBox: `${point.x - span / 2} ${point.y - span / 2} ${span} ${span}`,
            field: fieldAt(clientX, clientY),
        });
    };

    const onPointerDown = (event) => {
        if (event.pointerType !== 'touch') return;
        touching.current = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        showLoupe(event.clientX, event.clientY);
    };

    const onPointerMove = (event) => {
        if (touching.current) showLoupe(event.clientX, event.clientY);
    };

    const onPointerUp = (event) => {
        if (!touching.current) return;
        touching.current = false;
        ignoreClickUntil.current = Date.now() + 600;
        const field = fieldAt(event.clientX, event.clientY);
        setLoupe(null);
        if (field !== null) select(field, toBoard(event.clientX, event.clientY));
    };

    const onPointerCancel = () => {
        touching.current = false;
        setLoupe(null);
    };

    const onClick = (event) => {
        if (Date.now() < ignoreClickUntil.current) return;
        // beside the board (the corners of its square) nothing happens
        if (!event.target.id) return;
        select(event.target.id, toBoard(event.clientX, event.clientY));
    };

    const shown = markers.map((marker, index) => marker && { ...marker, index }).filter(Boolean);
    const last = shown.at(-1);

    return (
        <>
        <svg ref={svgRef}
            viewBox="0 0 420 420"
            className="dartboard-img"
            pointerEvents="all"
            cursor='pointer'
            onClick={onClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}>

            <BoardShapes />


            {/* where the darts of this visit landed */}
            <g className="dart-markers" pointerEvents="none" aria-hidden="true">
                {shown.map(marker => (
                    <g key={marker.index} transform={`translate(${marker.x}, ${marker.y})`} className={withDarts ? 'has-dart' : ''}>
                        {/* where it hit: with a dart, once it has landed */}
                        <g className="dart-hit">
                            {marker === last && <circle className="dart-marker-pulse" r="5" />}
                            <circle className={`dart-marker ${marker === last ? 'is-last' : ''}`} r="3.5" />
                        </g>
                        {/* the flight, and the dart turning with it round its tip */}
                        {withDarts && <g className="dart-fly"><g className="dart-tilt"><Dart color={flight.color} shape={flight.shape} design={flight.design} barrel={flight.barrel} /></g></g>}
                    </g>
                ))}
            </g>
        </svg>

        {loupe && createPortal(
            <div className="dartboard-loupe" style={{ left: loupe.left, top: loupe.top, width: LOUPE_SIZE }} aria-hidden="true">
                <svg viewBox={loupe.viewBox} className="dartboard-img dartboard-loupe-board" style={{ width: LOUPE_SIZE, height: LOUPE_SIZE }}>
                    <BoardShapes />
                </svg>
                <span className="dartboard-loupe-cross" />
                <span className="dartboard-loupe-label">{loupe.field === null ? 'Off the board' : labelOf(loupe.field)}</span>
            </div>,
            document.body
        )}
        </>
    )
}

export default DartBoard
