/* Hustle City Slots — Casino Classics machine definition (strips + paytable).
   Joshua's symbol set (2026-11-21): chrome DOLLAR SIGN top/jackpot (DL, electric
   green), SEVEN (SV), HORSESHOE (HS), CHERRY (CH, electric red), chrome BELL (BL)
   + BAR (B1) low fillers, WILD (WD), SCATTER (SC), WIN x2 (X2) / WIN x3 (X3)
   line multipliers. NO blank stops — every strip position is a real symbol.
   v2.2 (2026-11-21): BONUS (BN, garage door) added — one each on reels 1/2/4/5,
   replacing a BAR filler. 3+ BONUS anywhere on a PAID spin opens the
   PICK-A-GARAGE bonus (see `bonus` below). Paytable retuned (x0.95 scale) so the
   bonus EV lives inside the machine math: theoretical total RTP 94.61% incl.
   bonus share 8.89% (exact enumeration; Monte Carlo verified — see sim/rtp.js).
   SCATTER positions/counts unchanged, free-spin trigger still 1 in 37.6.
   (c) 2026 J-Dawgs Industries. */
'use strict';

const CLASSICS = {
  id: 'classics',
  name: 'Hustle City Slots — Casino Classics',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  /* PICK-A-GARAGE bonus: 9 trunks, 8 prizes + 1 SCOTTY (bust). Prizes and the
     completion bonus are multiples of the TOTAL bet of the triggering spin.
     Random-pick EV = (sum of prizes)/2 + completion/9 = 7.42x total bet. */
  bonus: { prizes: [0.5, 0.5, 1, 1, 1.5, 2, 3, 4], completion: 6 },
  paytable: {
    DL: { 3: 33, 4: 119, 5: 2375 },
    WD: { 3: 19, 4: 67, 5: 475 },
    SV: { 3: 11, 4: 43, 5: 285 },
    HS: { 3: 7, 4: 24, 5: 95 },
    CH: { 2: 2, 3: 2, 4: 6, 5: 24 },
    BL: { 3: 3, 4: 10, 5: 38 },
    B1: { 3: 2, 4: 6, 5: 24 }
  },
  strips: [
    ['B1', 'B1', 'CH', 'HS', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'X2', 'SC', 'DL', 'SV', 'BL', 'SV', 'BN', 'BL', 'CH', 'CH'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'DL', 'B1', 'BL', 'BL', 'BN', 'X3', 'CH', 'SV', 'CH', 'HS', 'WD', 'BL', 'HS', 'B1'],
    ['B1', 'SV', 'HS', 'B1', 'SV', 'DL', 'BL', 'X2', 'SC', 'CH', 'BL', 'B1', 'BL', 'B1', 'WD', 'B1', 'BL', 'HS', 'CH', 'CH'],
    ['BL', 'HS', 'WD', 'BL', 'DL', 'B1', 'SV', 'CH', 'BL', 'CH', 'SV', 'B1', 'CH', 'BN', 'BL', 'CH', 'HS', 'WD', 'SC', 'B1'],
    ['BL', 'CH', 'BL', 'SV', 'B1', 'WD', 'HS', 'SV', 'B1', 'CH', 'X2', 'CH', 'HS', 'BL', 'CH', 'SC', 'BN', 'B1', 'DL', 'BL']
  ]
};

const machinesApi = { CLASSICS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
