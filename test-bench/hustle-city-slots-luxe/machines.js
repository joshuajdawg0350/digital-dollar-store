/* Hustle City Slots — Poker Luxe machine definition (strips + paytable + wheel).
   Grown-up rebuild 2026-11-21 (the hand-drawn v1 was junked by Joshua).
   Symbol set: ACE OF SPADES top (AC), KING (KG), QUEEN (QN), JACK (JK),
   DIAMOND (DM), POKER CHIPS (CP, pays from 2), CHAMPAGNE (CG), DICE (DK),
   WILD (WD, substitutes for everything except SCATTER), SCATTER (SC, free
   spins), WIN x2 (X2) / WIN x3 (X3) line multipliers, BONUS token (BN).
   NO blank stops — every strip position is a real symbol.
   BONUS WHEEL: a BONUS token sits on reels 2, 3 and 4 only; when all three
   windows show one (3 BN), the Bonus Wheel triggers — one spin of the wheel,
   wedges pay multiples of the total bet. Wheel EV is part of the RTP math
   (see sim/rtp.js). (c) 2026 J-Dawgs Industries. */
'use strict';

const LUXE = {
  id: 'luxe',
  name: 'Hustle City Slots — Poker Luxe',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  bonusAt: 3,
  /* Bonus wheel wedges, in wheel order, as multiples of the TOTAL bet.
     0 = BANKRUPT, 250 = JACKPOT. EV = 431/12 ≈ 35.92x total bet. */
  wheel: [250, 5, 40, 0, 20, 3, 50, 8, 15, 5, 25, 10],
  paytable: {
    AC: { 3: 35, 4: 110, 5: 2000 },
    WD: { 3: 20, 4: 65, 5: 450 },
    KG: { 3: 12, 4: 50, 5: 300 },
    DM: { 3: 8, 4: 25, 5: 120 },
    QN: { 3: 5, 4: 14, 5: 55 },
    CG: { 3: 4, 4: 11, 5: 45 },
    JK: { 3: 3, 4: 9, 5: 35 },
    DK: { 3: 3, 4: 8, 5: 30 },
    CP: { 2: 2, 3: 3, 4: 8, 5: 28 }
  },
  strips: [
    ['JK', 'CP', 'DM', 'CP', 'CG', 'KG', 'JK', 'CG', 'CP', 'WD', 'X2', 'SC', 'AC', 'KG', 'CG', 'QN', 'JK', 'DK', 'CP', 'DM'],
    ['JK', 'SC', 'CP', 'CG', 'CP', 'JK', 'AC', 'QN', 'CG', 'QN', 'JK', 'X3', 'CP', 'KG', 'CP', 'DM', 'WD', 'CG', 'DM', 'BN'],
    ['JK', 'KG', 'DM', 'JK', 'KG', 'AC', 'CG', 'X2', 'SC', 'CP', 'CG', 'QN', 'CG', 'JK', 'WD', 'DK', 'CP', 'DM', 'CP', 'BN'],
    ['CG', 'DM', 'WD', 'X2', 'AC', 'JK', 'KG', 'CP', 'CG', 'CP', 'KG', 'QN', 'CP', 'JK', 'CG', 'QN', 'DM', 'WD', 'SC', 'BN'],
    ['QN', 'CP', 'CG', 'KG', 'JK', 'WD', 'DM', 'KG', 'JK', 'CP', 'X2', 'CP', 'DM', 'CG', 'CP', 'SC', 'JK', 'DK', 'AC', 'CG']
  ]
};

const machinesApi = { LUXE };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
