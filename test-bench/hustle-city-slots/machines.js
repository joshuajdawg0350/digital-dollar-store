/* Hustle City Slots — Casino Classics machine definition (strips + paytable).
   Joshua's symbol set (2026-11-21): chrome DOLLAR SIGN top/jackpot (DL, electric
   green), SEVEN (SV), HORSESHOE (HS), CHERRY (CH, electric red), chrome BELL (BL)
   + BAR (B1) low fillers, WILD (WD), SCATTER (SC), WIN x2 (X2) / WIN x3 (X3)
   line multipliers. NO blank stops — every strip position is a real symbol.
   v2.2 (2026-11-21): BONUS (BN, garage door) added — one each on reels 1/2/4/5.
   v2.3 (2026-11-21, Joshua's orders): BN now on ALL FIVE reels — reel 3 gained
   a BN appended as a 21st stop (its other 20 stops untouched, so the free-spin
   geometry barely moves) — Pick-a-Garage now fires on ~1 in 38.6 paid spins
   (Joshua's bonus odds standard: ~1 in 40) and free spins fire at the same
   ~1 in 38.6. Garage prizes/completion UNCHANGED from v2.2 (1/2x-4x, 6x clear
   bonus, EV 7.42x total bet); the paytable was scaled x0.93 so the TOTAL
   theoretical RTP lands on Joshua's settled 98%: lines 48.20% + scatter pay
   6.70% + free spins 23.90% + garage 19.22% = 98.02% (exact enumeration;
   Monte Carlo verified — see sim/rtp.js). Max bet grows in tiers with the
   player's balance (see game.js TIERS); RTP is bet-size invariant (every pay
   scales linearly with the bet), so high-tier play returns the same 98%.
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
    DL: { 3: 31, 4: 111, 5: 2209 },
    WD: { 3: 18, 4: 62, 5: 442 },
    SV: { 3: 10, 4: 40, 5: 265 },
    HS: { 3: 7, 4: 22, 5: 88 },
    CH: { 2: 2, 3: 2, 4: 6, 5: 22 },
    BL: { 3: 3, 4: 9, 5: 35 },
    B1: { 3: 2, 4: 6, 5: 22 }
  },
  strips: [
    ['B1', 'B1', 'CH', 'HS', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'X2', 'SC', 'DL', 'SV', 'BL', 'SV', 'BN', 'BL', 'CH', 'CH'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'DL', 'B1', 'BL', 'BL', 'BN', 'X3', 'CH', 'SV', 'CH', 'HS', 'WD', 'BL', 'HS', 'B1'],
    ['B1', 'SV', 'HS', 'B1', 'SV', 'DL', 'BL', 'X2', 'SC', 'CH', 'BL', 'B1', 'BL', 'B1', 'WD', 'B1', 'BL', 'HS', 'CH', 'CH', 'BN'],
    ['BL', 'HS', 'WD', 'BL', 'DL', 'B1', 'SV', 'CH', 'BL', 'CH', 'SV', 'B1', 'CH', 'BN', 'BL', 'CH', 'HS', 'WD', 'SC', 'B1'],
    ['BL', 'CH', 'BL', 'SV', 'B1', 'WD', 'HS', 'SV', 'B1', 'CH', 'X2', 'CH', 'HS', 'BL', 'CH', 'SC', 'BN', 'B1', 'DL', 'BL']
  ]
};

const machinesApi = { CLASSICS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
