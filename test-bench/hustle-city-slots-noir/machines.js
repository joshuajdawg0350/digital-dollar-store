/* Film Noir (WORKING TITLE — Joshua names it finally at review) — machine
   definition (strips + paytable). Built 2026-11-21 at Joshua's order: Poker
   Luxe took symbol Option 8 (Skulls & Dollars), and Option 6 — Film Noir —
   becomes a fifth machine of its own ("whichever one you don't use build
   another one out of the other number", 2026-11-21 19:09 CT).
   This is the Casino Classics platform cloned 1:1 — SAME strips (symbol for
   symbol in the same positions), SAME paytable numbers, SAME scatter pays /
   free spins, SAME pick-bonus math. Only the faces changed, cut from the
   Option 6 board (~/workspace/hustle-city-slots-luxe/symbol-candidates/
   option-6.png):
     DL chrome dollar  -> AC Ace of Spades (deep red — the set's one color)
     SV seven          -> KG King (silver, crowned)
     HS horseshoe      -> DM Diamond
     CH cherry         -> QN Queen (pays from 2, like the cherry did)
     BL bell           -> JK Jack
     B1 BAR            -> CP Poker Chips (black-and-white stack)
     WD / X2 / X3      -> silver coin medallions (WILD, WIN x2, WIN x3)
     SC scatter        -> silver starburst SCATTER
     BN bonus          -> silver coin BONUS (opens THE CASE FILES)
   Because the strips and paytable are position-for-position identical to
   Casino Classics v2.3, the theoretical RTP is the same 98.02% (lines
   48.20% + scatter pay 6.70% + free spins 23.90% + bonus 19.22%); the
   bonus fires ~1 in 38.6 paid spins and free spins at the same rate
   (Joshua's ~1-in-40 bonus standard). Verified independently on THIS
   config in sim/rtp.js (exact enumeration + Monte Carlo).
   THE CASE FILES bonus: 9 sealed case files, 8 hold evidence prizes + 1
   holds THE SNITCH (bust). Prizes and the completion bonus are multiples
   of the TOTAL bet of the triggering spin — identical to Pick-a-Garage:
   random-pick EV = (sum of prizes)/2 + completion/9 = 7.42x total bet.
   Banked prizes are kept when The Snitch ends the round.
   (c) 2026 J-Dawgs Industries. */
'use strict';

const NOIR = {
  id: 'noir',
  name: 'Film Noir',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  /* THE CASE FILES bonus: 9 case files, 8 evidence prizes + 1 THE SNITCH
     (bust). Prizes and the completion bonus are multiples of the TOTAL bet
     of the triggering spin. Random-pick EV = (sum of prizes)/2 +
     completion/9 = 7.42x total bet. */
  bonus: { prizes: [0.5, 0.5, 1, 1, 1.5, 2, 3, 4], completion: 6 },
  paytable: {
    AC: { 3: 31, 4: 111, 5: 2209 },
    WD: { 3: 18, 4: 62, 5: 442 },
    KG: { 3: 10, 4: 40, 5: 265 },
    DM: { 3: 7, 4: 22, 5: 88 },
    QN: { 2: 2, 3: 2, 4: 6, 5: 22 },
    JK: { 3: 3, 4: 9, 5: 35 },
    CP: { 3: 2, 4: 6, 5: 22 }
  },
  strips: [
    ['CP', 'CP', 'QN', 'DM', 'QN', 'DM', 'CP', 'JK', 'JK', 'WD', 'X2', 'SC', 'AC', 'KG', 'JK', 'KG', 'BN', 'JK', 'QN', 'QN'],
    ['CP', 'SC', 'QN', 'JK', 'QN', 'CP', 'AC', 'CP', 'JK', 'JK', 'BN', 'X3', 'QN', 'KG', 'QN', 'DM', 'WD', 'JK', 'DM', 'CP'],
    ['CP', 'KG', 'DM', 'CP', 'KG', 'AC', 'JK', 'X2', 'SC', 'QN', 'JK', 'CP', 'JK', 'CP', 'WD', 'CP', 'JK', 'DM', 'QN', 'QN', 'BN'],
    ['JK', 'DM', 'WD', 'JK', 'AC', 'CP', 'KG', 'QN', 'JK', 'QN', 'KG', 'CP', 'QN', 'BN', 'JK', 'QN', 'DM', 'WD', 'SC', 'CP'],
    ['JK', 'QN', 'JK', 'KG', 'CP', 'WD', 'DM', 'KG', 'CP', 'QN', 'X2', 'QN', 'DM', 'JK', 'QN', 'SC', 'BN', 'CP', 'AC', 'JK']
  ]
};

const machinesApi = { NOIR };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
