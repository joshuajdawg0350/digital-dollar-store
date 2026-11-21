/* Hustle City Slots — Casino Classics machine definition (strips + paytable).
   Joshua's symbol set (2026-11-21): chrome DOLLAR SIGN top/jackpot (DL, electric
   green), SEVEN (SV), HORSESHOE (HS), CHERRY (CH, electric red), chrome BELL (BL)
   + BAR (B1) low fillers, WILD (WD), SCATTER (SC), WIN x2 (X2) / WIN x3 (X3)
   line multipliers. NO blank stops — every strip position is a real symbol
   (Joshua's order 2026-11-21: "why all the blank spots? add wilds and x2 and
   x3 spots too"). The 21 v1 blank stops were replaced in place: +3 X2 (reels
   1/3/5), +1 X3 (reel 2), +1 WD (reel 4), +16 low fillers. Paytable retuned to
   compensate: theoretical RTP 94.48% (exact enumeration; Monte Carlo verified —
   see sim/rtp.js). SCATTER positions/counts unchanged, so the free-spin
   trigger rate is unchanged (1 in 37.6). (c) 2026 J-Dawgs Industries. */
'use strict';

const CLASSICS = {
  id: 'classics',
  name: 'Hustle City Slots — Casino Classics',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  paytable: {
    DL: { 3: 35, 4: 125, 5: 2500 },
    WD: { 3: 20, 4: 70, 5: 500 },
    SV: { 3: 12, 4: 45, 5: 300 },
    HS: { 3: 7, 4: 25, 5: 100 },
    CH: { 2: 2, 3: 2, 4: 6, 5: 25 },
    BL: { 3: 3, 4: 10, 5: 40 },
    B1: { 3: 2, 4: 6, 5: 25 }
  },
  strips: [
    ['B1', 'B1', 'CH', 'HS', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'X2', 'SC', 'DL', 'SV', 'BL', 'SV', 'B1', 'BL', 'CH', 'CH'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'DL', 'B1', 'BL', 'BL', 'B1', 'X3', 'CH', 'SV', 'CH', 'HS', 'WD', 'BL', 'HS', 'B1'],
    ['B1', 'SV', 'HS', 'B1', 'SV', 'DL', 'BL', 'X2', 'SC', 'CH', 'BL', 'B1', 'BL', 'B1', 'WD', 'B1', 'BL', 'HS', 'CH', 'CH'],
    ['BL', 'HS', 'WD', 'BL', 'DL', 'B1', 'SV', 'CH', 'BL', 'CH', 'SV', 'B1', 'CH', 'B1', 'BL', 'CH', 'HS', 'WD', 'SC', 'B1'],
    ['BL', 'CH', 'BL', 'SV', 'B1', 'WD', 'HS', 'SV', 'B1', 'CH', 'X2', 'CH', 'HS', 'BL', 'CH', 'SC', 'B1', 'B1', 'DL', 'BL']
  ]
};

const machinesApi = { CLASSICS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
