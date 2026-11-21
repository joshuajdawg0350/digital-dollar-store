/* Hustle City Slots — Casino Classics machine definition (strips + paytable).
   Joshua's symbol set (2026-11-21): chrome DOLLAR SIGN top/jackpot (DL), SEVEN (SV),
   HORSESHOE (HS), CHERRY (CH), chrome BELL (BL) + BAR (B1) low fillers,
   WILD (WD), SCATTER (SC), XX = blank stop.
   Strips/paytable carried over unchanged from the math-proven v1 build:
   theoretical RTP 94.58% (exact enumeration; Monte Carlo verified). (c) 2026 J-Dawgs Industries. */
'use strict';

const CLASSICS = {
  id: 'classics',
  name: 'Hustle City Slots — Casino Classics',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  paytable: {
    DL: { 3: 50, 4: 200, 5: 5000 },
    WD: { 3: 40, 4: 150, 5: 1000 },
    SV: { 3: 25, 4: 100, 5: 500 },
    HS: { 3: 15, 4: 60, 5: 180 },
    CH: { 2: 2, 3: 4, 4: 12, 5: 60 },
    BL: { 3: 6, 4: 25, 5: 120 },
    B1: { 3: 3, 4: 15, 5: 80 }
  },
  strips: [
    ['B1', 'XX', 'CH', 'HS', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'XX', 'SC', 'DL', 'SV', 'XX', 'SV', 'B1', 'BL', 'CH', 'XX'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'DL', 'B1', 'BL', 'XX', 'XX', 'XX', 'CH', 'SV', 'XX', 'HS', 'WD', 'BL', 'HS', 'XX'],
    ['B1', 'SV', 'HS', 'XX', 'SV', 'DL', 'BL', 'XX', 'SC', 'CH', 'BL', 'B1', 'XX', 'XX', 'WD', 'B1', 'BL', 'HS', 'CH', 'CH'],
    ['XX', 'HS', 'XX', 'BL', 'DL', 'XX', 'SV', 'CH', 'BL', 'CH', 'SV', 'B1', 'CH', 'B1', 'BL', 'XX', 'HS', 'WD', 'SC', 'B1'],
    ['BL', 'CH', 'BL', 'SV', 'B1', 'WD', 'HS', 'SV', 'XX', 'CH', 'XX', 'CH', 'HS', 'XX', 'XX', 'SC', 'B1', 'B1', 'DL', 'BL']
  ]
};

const machinesApi = { CLASSICS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
