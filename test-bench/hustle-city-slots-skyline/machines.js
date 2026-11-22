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
   (c) 2026 J-Dawgs Industries.
   PAYOUT REBALANCE (2026-11-21, Joshua's ruling from real play: "They need
   to pay out better on individual spins") — BASE GAME ONLY: 3/4-of-a-kind
   pays x1.75, pairs x1.5 (5-of-a-kind untouched), reel weights shifted
   toward the low symbols (WD/SC/BN/X2/X3 keep their exact stops, so the
   free-spin and dice geometry is unchanged: FS 1 in 39.6, dice 1 in 39.6,
   dice RTP share 5.53% under the stated strategy — all as settled).
   Measured after: line RTP 100.11%, base-game share 152.97%, TOTAL
   theoretical RTP 159.74% (Monte Carlo 160.95% over 200k paid spins) —
   deliberately above the old 98% design point; these are play credits and
   the owner's feel ruling governs. Net-positive base spins 16.5% -> 33.0%;
   average line win per hit 20.7 -> 34.3 credits at 1/line.
   FEATURE RETUNE (2026-11-21 21:47 CT, Joshua's ruling: "one in 35 spins
   to be one of the random bonuses — free spins or a bonus"): strips
   lengthened with regular symbols only (25 stops per reel; every special
   keeps its count, position and window coverage), superseding the
   'geometry unchanged' line above for FREQUENCIES only — dice pots,
   unit and strategy math untouched. Exact: free spins 1 in 69.8, dice
   1 in 69.8, COMBINED 1 in 35.0. Final measured base game after both
   passes: line RTP 94.61%, base-game share 120.28%, TOTAL theoretical
   RTP 123.76% (Monte Carlo 124.17% over 200k paid spins); net-positive
   base spins 31.3%; average line win per hit 29.8 credits at 1/line. */
'use strict';

const SKYLINE = {
  id: 'skyline',
  name: 'Hustle City Slots — Midnight Skyline',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  bonusStart: { 3: 0, 4: 30, 5: 60 },
  diceUnit: 3, /* credits per dice point, x betPerLine */
  paytable: {
    VT: { 3: 61, 4: 219, 5: 2500 },
    WD: { 3: 37, 4: 137, 5: 500 },
    SK: { 3: 23, 4: 86, 5: 300 },
    MN: { 3: 14, 4: 47, 5: 105 },
    TX: { 2: 3, 3: 7, 4: 14, 5: 29 },
    LM: { 3: 7, 4: 19, 5: 45 },
    SL: { 3: 5, 4: 12, 5: 29 }
  },
  strips: [
    ['SL', 'SL', 'TX', 'TX', 'TX', 'MN', 'SL', 'LM', 'LM', 'WD', 'X2', 'SC', 'VT', 'SL', 'LM', 'SK', 'BN', 'LM', 'TX', 'TX', 'TX', 'MN', 'SL', 'LM', 'TX'],
    ['SL', 'SC', 'TX', 'LM', 'TX', 'SL', 'SL', 'VT', 'SL', 'LM', 'LM', 'BN', 'X3', 'TX', 'SK', 'TX', 'TX', 'WD', 'LM', 'MN', 'SL', 'LM', 'VT', 'SL', 'TX'],
    ['SL', 'SK', 'MN', 'SL', 'SL', 'VT', 'LM', 'X2', 'SC', 'TX', 'LM', 'BN', 'LM', 'SL', 'WD', 'SL', 'LM', 'TX', 'TX', 'TX', 'SL', 'SK', 'LM', 'TX', 'SL'],
    ['LM', 'MN', 'WD', 'LM', 'VT', 'SL', 'SL', 'SK', 'TX', 'LM', 'TX', 'TX', 'SL', 'TX', 'BN', 'LM', 'TX', 'LM', 'WD', 'SC', 'SL', 'SL', 'MN', 'LM', 'TX'],
    ['LM', 'TX', 'LM', 'SK', 'SL', 'WD', 'MN', 'TX', 'SL', 'TX', 'X2', 'TX', 'LM', 'LM', 'TX', 'SC', 'BN', 'SL', 'VT', 'LM', 'LM', 'TX', 'SL', 'LM', 'TX']
  ]
};

const machinesApi = { SKYLINE };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
