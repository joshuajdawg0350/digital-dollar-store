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
   (c) 2026 J-Dawgs Industries. */
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
    GP: { 3: 31, 4: 111, 5: 2209 },
    WD: { 3: 18, 4: 62, 5: 442 },
    SP: { 3: 10, 4: 40, 5: 265 },
    CP: { 3: 7, 4: 22, 5: 88 },
    BO: { 2: 2, 3: 2, 4: 6, 5: 22 },
    BA: { 3: 3, 4: 9, 5: 35 },
    PW: { 3: 2, 4: 6, 5: 22 }
  },
  strips: [
    ['PW', 'PW', 'BO', 'CP', 'BO', 'CP', 'PW', 'BA', 'BA', 'WD', 'X2', 'SC', 'GP', 'SP', 'BA', 'SP', 'PW', 'BA', 'BO', 'BO'],
    ['PW', 'SC', 'BO', 'WH', 'BO', 'PW', 'GP', 'PW', 'BA', 'BA', 'BN', 'X3', 'WH', 'SP', 'BO', 'CP', 'WD', 'BO', 'CP', 'PW'],
    ['PW', 'SP', 'CP', 'PW', 'SP', 'GP', 'BA', 'X2', 'SC', 'BO', 'BO', 'PW', 'BA', 'PW', 'WD', 'PW', 'BA', 'CP', 'WH', 'BO', 'BN'],
    ['WH', 'CP', 'WD', 'BA', 'GP', 'PW', 'SP', 'BO', 'WH', 'BO', 'SP', 'PW', 'BO', 'BN', 'BA', 'BO', 'CP', 'WD', 'SC', 'PW'],
    ['BA', 'BO', 'BA', 'SP', 'PW', 'WD', 'CP', 'SP', 'PW', 'BO', 'X2', 'BO', 'CP', 'BA', 'BO', 'SC', 'BN', 'PW', 'GP', 'BA']
  ]
};

const machinesApi = { PEARLS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
