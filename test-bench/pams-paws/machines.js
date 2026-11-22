/* Pearl's Paws and Buster's Bones — machine definition (strips + paytable).
   Built 2026-11-21 at Joshua's order for his mom Pam ("start my mama's slot
   machine… everything ours the same way except call it Pearl's Paws and put
   little puppy paw prints and little dog bones and little puppy heads and
   wilds and times two and times three and a bonus game"). Name settled by
   Joshua 2026-11-21 18:08 CT: "Pearl's Paws" (NOT Pam's Paws).
   This is the Casino Classics platform cloned 1:1 — SAME strips (symbol for
   symbol in the same positions), SAME paytable numbers, SAME scatter pays /
   free spins, SAME pick-bonus math. Only the faces changed:
     DL chrome dollar  -> GP Brown Yorkie (top symbol)
     SV seven          -> SP White Shih Tzu
     HS horseshoe      -> CP Shih Tzu Puppy (topknot + silver bow)
     CH cherry         -> BO Bone (pays from 2, like the cherry did)
     BL bell           -> BA Ball
     B1 BAR            -> PW Paw Print
     WD / X2 / X3      -> paw-print medallions (WILD, WIN x2, WIN x3)
     SC scatter        -> chrome paw SCATTER
     BN bonus          -> dog house (opens PICK A PUPPY HOUSE)
   Because the strips and paytable are position-for-position identical to
   Casino Classics v2.3, the theoretical RTP is the same 98.02% (lines
   48.20% + scatter pay 6.70% + free spins 23.90% + bonus 19.22%); the
   bonus fires ~1 in 38.6 paid spins and free spins at the same rate
   (Joshua's ~1-in-40 bonus standard). Verified independently on THIS
   config in sim/rtp.js (exact enumeration + Monte Carlo).
   PICK A PUPPY HOUSE bonus: 9 dog houses, 8 prizes + 1 BIG AL (bust, candidate #2).
   Prizes and the completion bonus are multiples of the TOTAL bet of the
   triggering spin — identical to Pick-a-Garage: random-pick EV =
   (sum of prizes)/2 + completion/9 = 7.42x total bet. Banked prizes are
   kept when Big Al ends the round.
   (c) 2026 J-Dawgs Industries.
   PAYOUT REBALANCE (2026-11-21, Joshua's ruling from real play: "They need
   to pay out better on individual spins") — BASE GAME ONLY: 3/4-of-a-kind
   pays x1.75, pairs x1.5 (5-of-a-kind untouched), reel weights shifted
   toward the low symbols (WD/SC/BN/WH/X2/X3 keep their exact stops, so
   the free-spin, Buster's Bones and wheel geometry is unchanged: FS
   1 in 38.6, houses 1 in 86.4 EV 7.42x, wheel 1 in 77.8 EV 13.67x — all
   as settled; the "identical to Classics" note above is now historical).
   Measured after: line RTP 73.87%, base-game share 116.38%, TOTAL
   theoretical RTP 142.54% (Monte Carlo 141.64% over 200k paid spins) —
   deliberately above the old 98% design point; these are play credits and
   the owner's feel ruling governs. Net-positive base spins 13.1% -> 26.1%;
   average line win per hit 16.5 -> 25.4 credits at 1/line.
   FEATURE RETUNE (2026-11-21 21:47 CT, Joshua's ruling: "one in 35 spins
   to be one of the random bonuses — free spins or a bonus"): strips
   lengthened with regular symbols only (24/24/25/25/25 stops; every
   special keeps its count, position and window coverage), superseding
   the 'geometry unchanged' line above for FREQUENCIES only — houses
   prizes/EV (7.42x) and the wheel table/EV (13.67x) untouched. Exact:
   free spins 1 in 66.7, puppy houses 1 in 154.3, bonus wheel 1 in
   138.9 (bonus games combined 1 in 73.4), ALL FEATURES COMBINED
   1 in 35.0. Final measured base game after both passes: line RTP
   72.43%, base-game share 94.12%, TOTAL theoretical RTP 108.77%
   (Monte Carlo 108.53% over 200k paid spins); net-positive base spins
   25.5%; average line win per hit 22.9 credits at 1/line. */
'use strict';

const PEARLS = {
  id: 'pearls',
  name: "Pearl's Paws and Buster's Bones",
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  /* PICK A PUPPY HOUSE bonus: 9 dog houses, 8 prizes + 1 BIG AL (bust, candidate #2).
     Prizes and the completion bonus are multiples of the TOTAL bet of the
     triggering spin. Random-pick EV = (sum of prizes)/2 + completion/9
     = 7.42x total bet. */
  bonus: { prizes: [0.5, 0.5, 1, 1, 1.5, 2, 3, 4], completion: 6 },
  /* BONUS WHEEL (added 2026-11-21 at Joshua's order — "do the wheel too"):
     WHEEL tokens ride reels 2, 3 and 4 only (2/1/2 per strip, spaced so a
     window can hold at most one per reel); when all three middle windows
     show one, the wheel opens. Wedges pay x total bet; the 50x GRAND wedge carries BIG AL himself
     (Joshua, 2026-11-21 19:32 CT) and EVERY wedge pays — no dud (19:33 CT). Four tiered jackpots (Joshua, 2026-11-21 18:56 CT):
     MINI 8x, MINOR 15x, MAJOR 30x, GRAND 50x. EV = 164/12 = 13.67x bet
     (hotter than a plain wheel because the WHEEL tokens themselves cost
     base-game line RTP — the retune holds the machine total at 98%). */
  wheel: [50, 5, 15, 7, 30, 11, 6, 13, 8, 2, 14, 3],
  wheelTiers: { 50: 'GRAND', 30: 'MAJOR', 15: 'MINOR', 8: 'MINI' },
  paytable: {
    GP: { 3: 54, 4: 194, 5: 2209 },
    WD: { 3: 32, 4: 109, 5: 442 },
    SP: { 3: 18, 4: 70, 5: 265 },
    CP: { 3: 12, 4: 39, 5: 88 },
    BO: { 2: 3, 3: 4, 4: 11, 5: 22 },
    BA: { 3: 5, 4: 16, 5: 35 },
    PW: { 3: 4, 4: 11, 5: 22 }
  },
  strips: [
    ['PW', 'PW', 'BO', 'PW', 'BO', 'CP', 'PW', 'BA', 'BA', 'WD', 'X2', 'SC', 'GP', 'BA', 'BA', 'SP', 'PW', 'BA', 'BO', 'BO', 'BO', 'CP', 'PW', 'BA'],
    ['PW', 'SC', 'BO', 'WH', 'BO', 'PW', 'GP', 'PW', 'BA', 'BA', 'BN', 'X3', 'WH', 'BO', 'BO', 'CP', 'WD', 'BO', 'BA', 'PW', 'BO', 'BA', 'PW', 'BO'],
    ['PW', 'PW', 'CP', 'PW', 'SP', 'GP', 'BA', 'X2', 'SC', 'BO', 'BO', 'PW', 'BA', 'PW', 'WD', 'PW', 'BA', 'BA', 'WH', 'BO', 'BN', 'PW', 'BO', 'BA', 'PW'],
    ['WH', 'CP', 'WD', 'BA', 'GP', 'PW', 'BO', 'BO', 'WH', 'BO', 'SP', 'PW', 'BO', 'BN', 'BA', 'BO', 'BA', 'WD', 'SC', 'PW', 'BO', 'CP', 'BA', 'PW', 'BO'],
    ['BA', 'BO', 'BA', 'BO', 'PW', 'WD', 'CP', 'SP', 'PW', 'BO', 'X2', 'BO', 'BA', 'BA', 'BO', 'SC', 'BN', 'PW', 'GP', 'BA', 'BA', 'BO', 'PW', 'BA', 'BO']
  ]
};

const machinesApi = { PEARLS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
