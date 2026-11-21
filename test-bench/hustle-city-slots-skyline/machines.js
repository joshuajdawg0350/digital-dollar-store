/* Hustle City Slots — Midnight Skyline machine definition (strips + paytable).
   Grown-up rebuild 2026-11-21 (v1 was junked for hand-drawn art; every symbol
   here is generated rendered art — see assets-src). Symbol set: VAULT DOOR (VT,
   top/jackpot), SKYSCRAPER (SK), FULL MOON (MN), TAXI (TX, pays from 2),
   LASER (LM), SEARCHLIGHT (SL) low fillers, WILD (WD), SCATTER (SC),
   WIN x2 (X2) / WIN x3 (X3) line multipliers, BONUS DICE (BN).
   NO blank stops — every strip position is a real symbol.
   Strip geometry mirrors Casino Classics v2.1 (same position pattern, proven
   base) with exactly one SEARCHLIGHT per reel swapped for a BONUS die,
   so 3+ BONUS dice can land anywhere (1 per reel, max 5).
   RETUNE 2026-11-21 (Joshua's machine standards): reels 2 and 4 carry one
   extra SEARCHLIGHT stop (21 stops), which sets the BONUS trigger to
   1 in 39.6 spins on average — Joshua's "1 in every 40" standard — and the
   paytable was rebalanced to Joshua's settled TOTAL RTP of 98%
   (theoretical 98.04%; see sim/rtp.js).
   BONUS — DICE ROLL (push your luck): 3+ BN starts it. Pot starts at
   bonusStart[count] x betPerLine (4 dice = 30, 5 dice = 60). Each roll of two
   dice adds its total x 3 x betPerLine credits to the pot; rolling a 7 BUSTS
   the pot to zero. Player may BANK the pot after any safe roll. Modeled
   strategy for the RTP math: bank as soon as the pot reaches 100 x betPerLine
   (5x total bet). Tuned 2026-11-21 (taxi 3-of-a-kind 2->3 base lift + the
   dice unit): theoretical RTP 94.77%, Monte Carlo verified — see sim/rtp.js.
   Superseded same day by the 98% retune above (paytable only; dice unit,
   starting pots and strips' BONUS layout unchanged in spirit — the two
   lengthened strips are what moved the trigger to 1 in 39.6).
   (c) 2026 J-Dawgs Industries. */
'use strict';

const SKYLINE = {
  id: 'skyline',
  name: 'Hustle City Slots — Midnight Skyline',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  bonusStart: { 3: 0, 4: 30, 5: 60 },
  diceUnit: 3, /* credits per dice point, x betPerLine */
  paytable: {
    VT: { 3: 35, 4: 125, 5: 2500 },
    WD: { 3: 21, 4: 78, 5: 500 },
    SK: { 3: 13, 4: 49, 5: 300 },
    MN: { 3: 8, 4: 27, 5: 105 },
    TX: { 2: 2, 3: 4, 4: 8, 5: 29 },
    LM: { 3: 4, 4: 11, 5: 45 },
    SL: { 3: 3, 4: 7, 5: 29 }
  },
  strips: [
    ['SL', 'SL', 'TX', 'MN', 'TX', 'MN', 'SL', 'LM', 'LM', 'WD', 'X2', 'SC', 'VT', 'SK', 'LM', 'SK', 'BN', 'LM', 'TX', 'TX'],
    ['SL', 'SC', 'TX', 'LM', 'TX', 'SL', 'SL', 'VT', 'SL', 'LM', 'LM', 'BN', 'X3', 'TX', 'SK', 'TX', 'MN', 'WD', 'LM', 'MN', 'SL'],
    ['SL', 'SK', 'MN', 'SL', 'SK', 'VT', 'LM', 'X2', 'SC', 'TX', 'LM', 'BN', 'LM', 'SL', 'WD', 'SL', 'LM', 'MN', 'TX', 'TX'],
    ['LM', 'MN', 'WD', 'LM', 'VT', 'SL', 'SL', 'SK', 'TX', 'LM', 'TX', 'SK', 'SL', 'TX', 'BN', 'LM', 'TX', 'MN', 'WD', 'SC', 'SL'],
    ['LM', 'TX', 'LM', 'SK', 'SL', 'WD', 'MN', 'SK', 'SL', 'TX', 'X2', 'TX', 'MN', 'LM', 'TX', 'SC', 'BN', 'SL', 'VT', 'LM']
  ]
};

const machinesApi = { SKYLINE };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
