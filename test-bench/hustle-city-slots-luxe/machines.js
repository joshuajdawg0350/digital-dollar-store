/* Hustle City Slots — Poker Luxe machine definition (strips + paytable + wheel).
   Grown-up rebuild 2026-11-21 (the hand-drawn v1 was junked by Joshua).
   Symbol set: ACE OF SPADES top (AC), KING (KG), QUEEN (QN), JACK (JK),
   DIAMOND (DM), POKER CHIPS (CP, pays from 2), CHAMPAGNE (CG), DICE (DK),
   WILD (WD, substitutes for everything except SCATTER), SCATTER (SC, free
   spins), WIN x2 (X2) / WIN x3 (X3) line multipliers, BONUS token (BN).
   NO blank stops — every strip position is a real symbol.
   BONUS WHEEL: BONUS tokens ride reels 2, 3 and 4 only (two per strip,
   spaced so at most one can show per window); when all three windows show
   one, the Bonus Wheel triggers — one spin of the wheel, wedges pay
   multiples of the total bet. Trigger probability is exactly
   (6/20)(6/22)(6/20) = 1 in 40.7 spins (Joshua's standard, 2026-11-21:
   a bonus on average 1 in every 40 spins).
   MATH (Joshua's settled target, 2026-11-21): total RTP 98% — exact
   closed form including wheels landed during free spins; verified
   breakdown and Monte Carlo in sim/sim-results.txt.
   (c) 2026 J-Dawgs Industries. */
'use strict';

const LUXE = {
  id: 'luxe',
  name: 'Hustle City Slots — Poker Luxe',
  scatterPay: { 3: 2, 4: 7, 5: 35 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  bonusAt: 3,
  /* Bonus wheel wedges, in wheel order, as multiples of the TOTAL bet.
     0 = BANKRUPT (one wedge), 100 = JACKPOT. EV = 145/12 ≈ 12.08x bet. */
  wheel: [100, 5, 7, 2, 4, 8, 0, 3, 6, 1, 5, 4],
  paytable: {
    AC: { 3: 26, 4: 83, 5: 1500 },
    WD: { 3: 15, 4: 49, 5: 338 },
    KG: { 3: 9, 4: 38, 5: 225 },
    DM: { 3: 6, 4: 19, 5: 90 },
    QN: { 3: 4, 4: 11, 5: 41 },
    CG: { 3: 3, 4: 8, 5: 34 },
    JK: { 3: 2, 4: 7, 5: 26 },
    DK: { 3: 2, 4: 6, 5: 23 },
    CP: { 2: 2, 3: 2, 4: 6, 5: 21 }
  },
  strips: [
    ['JK', 'CP', 'DM', 'CP', 'CG', 'KG', 'JK', 'CG', 'CP', 'WD', 'X2', 'SC', 'AC', 'KG', 'CG', 'QN', 'JK', 'DK', 'CP', 'DM'],
    ['JK', 'SC', 'CP', 'CG', 'CP', 'JK', 'AC', 'QN', 'CG', 'BN', 'JK', 'X3', 'CP', 'KG', 'CP', 'DM', 'WD', 'CG', 'DM', 'BN'],
    ['JK', 'KG', 'DM', 'JK', 'KG', 'AC', 'CG', 'X2', 'BN', 'SC', 'CP', 'CG', 'QN', 'CG', 'JK', 'WD', 'DK', 'CP', 'DM', 'CP', 'BN', 'CP'],
    ['CG', 'DM', 'WD', 'X2', 'AC', 'JK', 'KG', 'CP', 'BN', 'CP', 'KG', 'QN', 'CP', 'JK', 'CG', 'QN', 'DM', 'WD', 'SC', 'BN'],
    ['QN', 'CP', 'CG', 'KG', 'JK', 'WD', 'DM', 'KG', 'JK', 'CP', 'X2', 'CP', 'DM', 'CG', 'CP', 'SC', 'JK', 'DK', 'AC', 'CG']
  ]
};

const machinesApi = { LUXE };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
