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
   (c) 2026 J-Dawgs Industries LLC.
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
   25.5%; average line win per hit 22.9 credits at 1/line.
   FETCH RETUNE (2026-11-21, Joshua picked bonus concept #2 "Fetch!"):
   a FOURTH feature joins — free spins, Puppy Houses and the wheel all
   stay. Strips lengthened once more by +2 regular stops per strip
   (26/26/27/27/27; every special keeps its exact count and window
   coverage), carving Fetch its share so the combined frequency holds
   Joshua's 1-in-35 instead of stacking on top. FETCH trigger is the
   concept's own: 3+ RED BALLS (BA) anywhere on a paid spin. BA is a
   common line symbol by design (pays 5/16/35), so 3+ balls land on
   59.3% of spins — far too often to open the game outright; the award
   is WEIGHTED (fetch.weight 0.0096), the standard real-machine way a
   common symbol gates a bonus, landing Fetch itself 1 in 175.8.
   Inside: pot ladder 1x/2x/3x/5x/8x per good throw, 3 balls, butterfly
   drop chance 0.1725 per throw loses only the UNBANKED pot (banked is
   always safe); banking all three balls at the full 8x adds the 15x
   PERFECT GAME bonus — perfect game = 3x8 + 15 = 39x, the concept's
   headline. EV is policy-dependent by design (press-your-luck):
   Monte Carlo 200k games per policy, cross-checked analytic — bank
   at >=3x: 5.10x; bank at >=5x (reference): 7.03x; ride every ball
   to 8x: 10.19x (perfect game lands 5.8% of such plays). NEW EXACT
   RATES: free spins 1 in 83.1, Fetch 1 in 175.8, Puppy Houses 1 in
   193.4, wheel 1 in 175.5 — ALL FEATURES COMBINED 1 in 35.0. New
   totals: line RTP 76.30%, base game 93.95%, TOTAL theoretical RTP
   109.57% (Monte Carlo 109.35% over 300k paid spins) — still
   deliberately hot under the owner's feel ruling above.
   BONUS PACE RETUNE (2026-11-22 00:36 CT, Joshua: "Make it easier to
   hit a bonus on my mom's"): one regular stop per strip comes back out
   (lengths 25/25/26/26/26; specials' counts and window coverage again
   unchanged) and the Fetch weight moves 0.0096 -> 0.0099. FREQUENCY
   ONLY — every bonus keeps its own EV (houses 7.42x, wheel 13.67x,
   Fetch 7.03x reference). Before (the build Pam had): free spins
   1 in 83.1, Fetch 1 in 175.8, Puppy Houses 1 in 193.4, wheel 1 in
   175.5, combined 1 in 35.0. After: free spins 1 in 74.6, Fetch 1 in
   162.0, Puppy Houses 1 in 173.1, wheel 1 in 156.5 — ALL FEATURES
   COMBINED 1 in 31.5, past Joshua's 1-in-32 floor for the other
   machines, with the three pick/press games clustered together so
   they all show up in a session. Monte Carlo (300k paid spins)
   agrees: 4,020 FS sessions, 1,727 house rounds, 1,933 wheel rounds,
   1,840 Fetch rounds. New totals: line RTP 77.19%, base game 97.30%,
   TOTAL theoretical RTP 114.65% (MC 114.67%) — hotter because the
   bonuses fire more often, per the owner's standing feel ruling.
   1-IN-20 RETUNE (2026-11-22, Joshua's order for Pam: "change my
   mom's game to about one in every 20 spins is a bonus" with RTP held
   at ~98%): four regular stops per strip removed (lengths
   21/21/22/22/22; every special — SC/BN/WH/WD/X2/X3 — keeps its exact
   count and window coverage) and the Fetch weight 0.0099 -> 0.0165.
   Feature VALUES rebalanced down to hold the total, because the
   features now fire ~1.6x as often: scatter pays {2,8,40} -> {1,5,25},
   free spins {7,10,15} -> {3,5,7}, puppy-house prizes
   [0.5,0.5,1,1,1.5,2,3,4] + completion 6 -> [0.25,0.25,0.5,0.5,0.75,1,
   1.25,2] + completion 3.5 (EV 7.42x -> 3.64x), wheel wedges scaled
   (EV 13.67x -> 6.25x; tiers now GRAND 22 / MAJOR 14 / MINOR 7 /
   MINI 3), Fetch ladder [1,2,3,5,8] -> [0.5,1,1.5,2.5,4] and perfect
   bonus 15 -> 8 (EV 7.03x -> 3.52x). THE LINE PAYTABLE IS UNTOUCHED;
   line RTP moved 77.19% -> 71.28% only because the removed stops
   change the symbol mix. Before: free spins 1 in 74.6, houses 1 in
   173.1, wheel 1 in 156.5, Fetch 1 in 162.0, ALL FEATURES COMBINED
   1 in 31.5, TOTAL 114.65%. After: free spins 1 in 46.4, houses 1 in
   106.2, wheel 1 in 94.1, Fetch 1 in 119.3, ALL FEATURES COMBINED
   1 in 20.0, TOTAL theoretical RTP 97.83% (Monte Carlo 97.55% over
   300k paid spins) — inside the 98% +/-0.5 band, at Joshua's order;
   the hot-machine feel rulings above are superseded for this machine
   by this order. NO dollar-door symbols on this machine (Joshua,
   2026-11-22 12:51 CT: Pearl's Paws is OUT of the dollar door — her
   own paw/bone triggers above are the only bonus entries). */
'use strict';

const PEARLS = {
  id: 'pearls',
  name: "Pearl's Paws and Buster's Bones",
  scatterPay: { 3: 1, 4: 5, 5: 25 },
  scatterSpins: { 3: 3, 4: 5, 5: 7 },
  /* PICK A PUPPY HOUSE bonus: 9 dog houses, 8 prizes + 1 BIG AL (bust, candidate #2).
     Prizes and the completion bonus are multiples of the TOTAL bet of the
     triggering spin. Random-pick EV = (sum of prizes)/2 + completion/9
     = 3.64x total bet (1-in-20 retune 2026-11-22 — see header). */
  bonus: { prizes: [0.25, 0.25, 0.5, 0.5, 0.75, 1, 1.25, 2], completion: 3.5 },
  /* BONUS WHEEL (added 2026-11-21 at Joshua's order — "do the wheel too"):
     WHEEL tokens ride reels 2, 3 and 4 only (2/1/2 per strip, spaced so a
     window can hold at most one per reel); when all three middle windows
     show one, the wheel opens. Wedges pay x total bet; the 22x GRAND wedge carries BIG AL himself
     (Joshua, 2026-11-21 19:32 CT) and EVERY wedge pays — no dud (19:33 CT). Four tiered jackpots:
     MINI 3x, MINOR 7x, MAJOR 14x, GRAND 22x (scaled in the 1-in-20 retune
     2026-11-22 — see header). EV = 75/12 = 6.25x bet. */
  wheel: [22, 2, 7, 3, 14, 5, 3, 6, 3, 1, 7, 2],
  wheelTiers: { 22: 'GRAND', 14: 'MAJOR', 7: 'MINOR', 3: 'MINI' },
  /* FETCH! (2026-11-21, Joshua's pick #2 from the second bonus board):
     trigger 3+ red balls (BA) anywhere on a paid spin, WEIGHTED award —
     BA is a common line symbol, so 3+ balls land on ~51% of spins and the
     weight is what lands the feature itself at ~1/119 (see header). Pot
     ladder is x total bet per successful throw; drop = butterfly chance
     per throw (loses only the unbanked pot); banking all 3 balls at the
     full 4x adds perfectBonus — perfect game = 3x4 + 8 = 20x (ladder and
     perfect bonus scaled in the 1-in-20 retune 2026-11-22). */
  fetch: { ladder: [0.5, 1, 1.5, 2.5, 4], balls: 3, perfectBonus: 8, drop: 0.1725, weight: 0.0165 },
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
    ['PW', 'PW', 'BO', 'PW', 'BO', 'CP', 'PW', 'BA', 'BA', 'WD', 'X2', 'SC', 'GP', 'BA', 'BA', 'SP', 'PW', 'BO', 'BO', 'CP', 'PW'],
    ['PW', 'SC', 'BO', 'WH', 'BO', 'PW', 'GP', 'PW', 'BA', 'BA', 'BN', 'X3', 'WH', 'BO', 'BO', 'BO', 'CP', 'WD', 'BA', 'BO', 'PW'],
    ['PW', 'PW', 'CP', 'PW', 'SP', 'GP', 'BA', 'X2', 'SC', 'BO', 'BO', 'PW', 'BA', 'PW', 'WD', 'PW', 'BA', 'WH', 'BO', 'BN', 'PW', 'PW'],
    ['WH', 'CP', 'WD', 'BA', 'GP', 'PW', 'BO', 'BO', 'WH', 'BO', 'SP', 'PW', 'BO', 'BN', 'BA', 'BA', 'WD', 'SC', 'BO', 'CP', 'BA', 'BO'],
    ['BA', 'BO', 'BA', 'PW', 'WD', 'CP', 'SP', 'PW', 'BO', 'X2', 'BO', 'BA', 'BO', 'BO', 'SC', 'BN', 'PW', 'GP', 'BA', 'BO', 'BA', 'BO']
  ]
};

const machinesApi = { PEARLS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
