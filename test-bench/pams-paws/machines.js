/* Pearl's Paws — machine definition (strips + paytable).
   Built 2026-11-21 at Joshua's order for his mom Pam ("start my mama's slot
   machine… everything ours the same way except call it Pearl's Paws and put
   little puppy paw prints and little dog bones and little puppy heads and
   wilds and times two and times three and a bonus game"). Name settled by
   Joshua 2026-11-21 18:08 CT: "Pearl's Paws" (NOT Pam's Paws).
   This is the Casino Classics platform cloned 1:1 — SAME strips (symbol for
   symbol in the same positions), SAME paytable numbers, SAME scatter pays /
   free spins, SAME pick-bonus math. Only the faces changed:
     DL chrome dollar  -> GP Golden Puppy (top symbol)
     SV seven          -> SP Spot Puppy (dalmatian)
     HS horseshoe      -> CP Cocoa Puppy (chocolate lab)
     CH cherry         -> BO Bone (pays from 2, like the cherry did)
     BL bell           -> BA Ball
     B1 BAR            -> PW Paw Print
     WD / X2 / X3      -> paw-print medallions (WILD, WIN x2, WIN x3)
     SC scatter        -> golden paw SCATTER
     BN bonus          -> dog house (opens PICK A PUPPY HOUSE)
   Because the strips and paytable are position-for-position identical to
   Casino Classics v2.3, the theoretical RTP is the same 98.02% (lines
   48.20% + scatter pay 6.70% + free spins 23.90% + bonus 19.22%); the
   bonus fires ~1 in 38.6 paid spins and free spins at the same rate
   (Joshua's ~1-in-40 bonus standard). Verified independently on THIS
   config in sim/rtp.js (exact enumeration + Monte Carlo).
   PICK A PUPPY HOUSE bonus: 9 dog houses, 8 prizes + 1 BATH TIME (bust).
   Prizes and the completion bonus are multiples of the TOTAL bet of the
   triggering spin — identical to Pick-a-Garage: random-pick EV =
   (sum of prizes)/2 + completion/9 = 7.42x total bet. Banked prizes are
   kept when Bath Time ends the round.
   (c) 2026 J-Dawgs Industries. */
'use strict';

const PEARLS = {
  id: 'pearls',
  name: "Pearl's Paws",
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  /* PICK A PUPPY HOUSE bonus: 9 dog houses, 8 prizes + 1 BATH TIME (bust).
     Prizes and the completion bonus are multiples of the TOTAL bet of the
     triggering spin. Random-pick EV = (sum of prizes)/2 + completion/9
     = 7.42x total bet. */
  bonus: { prizes: [0.5, 0.5, 1, 1, 1.5, 2, 3, 4], completion: 6 },
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
    ['PW', 'PW', 'BO', 'CP', 'BO', 'CP', 'PW', 'BA', 'BA', 'WD', 'X2', 'SC', 'GP', 'SP', 'BA', 'SP', 'BN', 'BA', 'BO', 'BO'],
    ['PW', 'SC', 'BO', 'BA', 'BO', 'PW', 'GP', 'PW', 'BA', 'BA', 'BN', 'X3', 'BO', 'SP', 'BO', 'CP', 'WD', 'BA', 'CP', 'PW'],
    ['PW', 'SP', 'CP', 'PW', 'SP', 'GP', 'BA', 'X2', 'SC', 'BO', 'BA', 'PW', 'BA', 'PW', 'WD', 'PW', 'BA', 'CP', 'BO', 'BO', 'BN'],
    ['BA', 'CP', 'WD', 'BA', 'GP', 'PW', 'SP', 'BO', 'BA', 'BO', 'SP', 'PW', 'BO', 'BN', 'BA', 'BO', 'CP', 'WD', 'SC', 'PW'],
    ['BA', 'BO', 'BA', 'SP', 'PW', 'WD', 'CP', 'SP', 'PW', 'BO', 'X2', 'BO', 'CP', 'BA', 'BO', 'SC', 'BN', 'PW', 'GP', 'BA']
  ]
};

const machinesApi = { PEARLS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
