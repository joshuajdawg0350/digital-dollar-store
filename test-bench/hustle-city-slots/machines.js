/* Hustle City Slots — Casino Classics machine definition (strips + paytable).
   Joshua's symbol set (2026-11-21): chrome DOLLAR SIGN top/jackpot (DL, electric
   green), SEVEN (SV), HORSESHOE (HS), CHERRY (CH, electric red), chrome BELL (BL)
   + BAR (B1) low fillers, WILD (WD), SCATTER (SC), WIN x2 (X2) / WIN x3 (X3)
   line multipliers. NO blank stops — every strip position is a real symbol.
   v2.2 (2026-11-21): BONUS (BN, garage door) added — one each on reels 1/2/4/5.
   v2.3 (2026-11-21, Joshua's orders): BN now on ALL FIVE reels — reel 3 gained
   a BN appended as a 21st stop (its other 20 stops untouched, so the free-spin
   geometry barely moves) — Pick-a-Garage now fires on ~1 in 38.6 paid spins
   (Joshua's bonus odds standard: ~1 in 40) and free spins fire at the same
   ~1 in 38.6. Garage prizes/completion UNCHANGED from v2.2 (1/2x-4x, 6x clear
   bonus, EV 7.42x total bet); the paytable was scaled x0.93 so the TOTAL
   theoretical RTP lands on Joshua's settled 98%: lines 48.20% + scatter pay
   6.70% + free spins 23.90% + garage 19.22% = 98.02% (exact enumeration;
   Monte Carlo verified — see sim/rtp.js). Max bet grows in tiers with the
   player's balance (see game.js TIERS); RTP is bet-size invariant (every pay
   scales linearly with the bet), so high-tier play returns the same 98%.
   (c) 2026 J-Dawgs Industries.
   PAYOUT REBALANCE (2026-11-21, Joshua's ruling from real play: "They need
   to pay out better on individual spins") — BASE GAME ONLY: 3/4-of-a-kind
   pays x1.75, pairs x1.5 (5-of-a-kind untouched), reel weights shifted
   toward the low symbols (WD/SC/BN/X2/X3 keep their exact stops, so the
   free-spin and garage geometry is unchanged: FS 1 in 38.6, garage 1 in
   38.6, garage EV 7.42x total bet — all as settled). Measured after:
   line RTP 81.49%, base-game share 127.53%, TOTAL theoretical RTP 146.75%
   (Monte Carlo 146.62% over 200k paid spins) — deliberately above the old
   98% design point; these are play credits and the owner's feel ruling
   governs. Net-positive base spins (return beats the bet) 13.9% -> 26.4%;
   average line win per hit 16.7 -> 26.6 credits at 1/line.
   FEATURE RETUNE (2026-11-21 21:47 CT, Joshua's ruling: "one in 35 spins
   to be one of the random bonuses — free spins or a bonus"): strips
   lengthened with regular symbols only (25 stops per reel; every special
   keeps its count, position and window coverage), superseding the
   'geometry unchanged' line above for FREQUENCIES only — all bonus
   prizes and EVs untouched (garage EV still 7.42x). Exact: free spins
   1 in 69.8, garage 1 in 69.8, COMBINED 1 in 35.0. Final measured base
   game after both passes: line RTP 77.39%, base-game share 99.11%,
   TOTAL theoretical RTP 109.73% (Monte Carlo 109.06% over 200k paid
   spins); net-positive base spins 24.5%; average line win per hit
   22.8 credits at 1/line. */
'use strict';

const CLASSICS = {
  id: 'classics',
  name: 'Hustle City Slots — Casino Classics',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  /* PICK-A-GARAGE bonus: 9 trunks, 8 prizes + 1 SCOTTY (bust). Prizes and the
     completion bonus are multiples of the TOTAL bet of the triggering spin.
     Random-pick EV = (sum of prizes)/2 + completion/9 = 7.42x total bet. */
  bonus: { prizes: [0.5, 0.5, 1, 1, 1.5, 2, 3, 4], completion: 6 },
  paytable: {
    DL: { 3: 54, 4: 194, 5: 2209 },
    WD: { 3: 32, 4: 109, 5: 442 },
    SV: { 3: 18, 4: 70, 5: 265 },
    HS: { 3: 12, 4: 39, 5: 88 },
    CH: { 2: 3, 3: 4, 4: 11, 5: 22 },
    BL: { 3: 5, 4: 16, 5: 35 },
    B1: { 3: 4, 4: 11, 5: 22 }
  },
  strips: [
    ['B1', 'B1', 'CH', 'B1', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'X2', 'SC', 'DL', 'BL', 'BL', 'SV', 'BN', 'BL', 'CH', 'CH', 'BL', 'HS', 'B1', 'CH', 'BL'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'DL', 'B1', 'BL', 'BL', 'BN', 'X3', 'CH', 'SV', 'CH', 'BL', 'WD', 'BL', 'HS', 'B1', 'BL', 'DL', 'B1', 'CH', 'BL'],
    ['B1', 'B1', 'HS', 'B1', 'SV', 'DL', 'BL', 'X2', 'SC', 'CH', 'BL', 'B1', 'BL', 'B1', 'WD', 'B1', 'BL', 'BL', 'CH', 'CH', 'BN', 'B1', 'CH', 'BL', 'B1'],
    ['BL', 'HS', 'WD', 'BL', 'DL', 'B1', 'SV', 'CH', 'BL', 'CH', 'BL', 'B1', 'CH', 'BN', 'BL', 'CH', 'HS', 'WD', 'SC', 'B1', 'BL', 'B1', 'HS', 'CH', 'BL'],
    ['BL', 'CH', 'BL', 'SV', 'B1', 'WD', 'B1', 'SV', 'B1', 'CH', 'X2', 'CH', 'HS', 'BL', 'CH', 'SC', 'BN', 'B1', 'DL', 'BL', 'SV', 'HS', 'BL', 'CH', 'B1']
  ]
};

const machinesApi = { CLASSICS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
