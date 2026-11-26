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
   (c) 2026 J-Dawgs Industries LLC.
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
   22.8 credits at 1/line.
   PAYOUTS +20% (2026-11-21 23:34 CT, Joshua's pick — chosen over "win 20%
   more often", with the option stating plainly that the return goes over
   100%): EVERY payout this machine awards is scaled x1.2 — the whole line
   paytable, the scatter pays (2/8/40 -> 2.4/9.6/48 x total bet) and the
   garage prizes (1/2x-4x -> 0.6x-4.8x, clear bonus 6x -> 7.2x; garage EV
   7.42x -> 8.90x total bet). Hit frequency, feature frequencies (FS 1 in
   69.8, garage 1 in 69.8, combined 1 in 35.0), strips, bet ladder and
   symbols are UNCHANGED — only the size of the pays moved. Scaled pays
   carry at most one decimal and are paid/displayed in whole credits by
   the game's existing win rounding, exactly as the old pays already were
   at fractional line bets. Monte Carlo (sim/rtp.js, 400k paid spins):
   TOTAL RTP 109.63% -> 131.55% (second seed 132.10%); line 77.61% ->
   93.13%, scatter 3.44% -> 4.13%, free spins 17.96% -> 21.55%, garage
   10.63% -> 12.75%. (A whole-credit-per-line rounding of the paytable to
   the 0.8 grid was measured and rejected: rounding the nine half-step
   pays up overshoots to ~135.4%, balancing them underpays to ~128.3% —
   neither is the 20% he picked.) */
'use strict';

const CLASSICS = {
  id: 'classics',
  name: 'Hustle City Slots — Casino Classics',
  scatterPay: { 3: 2.4, 4: 9.6, 5: 48 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  /* DOLLAR DOOR (2026-11-22, Joshua's program-wide ruling): the ONLY way
     into a bonus is 3+ BIG GREEN DOLLAR SIGNS anywhere in the window.
     v2-21 (2026-11-22, Joshua's correction from his own phone): the
     dollars count TOGETHER — DD (medallion) and DL (plain line dollar)
     mixed in any combination. The DD-only split silently ate landings
     like 2 DD + 1 DL (his screenshot: three green dollars, no bonus).
     Retune: six dollar stops became B1 filler (DD r1#0, r2#10, r3#0,
     r5#0; DL r2#6, r5#18) so the combined rate stays at the settled
     1 in 20.2 paid spins (exact enumeration) with DD [1,0,1,1,1] and
     DL [1,1,1,1,0]; base paytable UNCHANGED, scatter geometry
     UNCHANGED (free spins still 1 in 69.8). Behind-the-door prizes
     were re-scaled (garage x~0.54, wheel x~0.54) so the total RTP
     holds at ~131% (exact model 130.9%). */
  doorSymbol: 'DD',
  doorSymbols: ['DD', 'DL'],
  /* PICK-A-GARAGE bonus: 9 trunks, 8 prizes + 1 SCOTTY (bust). Prizes and the
     completion bonus are multiples of the TOTAL bet of the triggering spin.
     Random-pick EV = (sum of prizes)/2 + completion/9 = 8.90x total bet
     (was 7.42x before the 2026-11-21 x1.2 payout scale below). */
  /* DOLLAR DOOR rebalance (2026-11-22): the door fires ~3.5x as often as
     the old BN trigger, so garage prizes + completion were scaled x0.45
     (EV 8.90x -> 3.96x) to hold the machine's total RTP at its pre-door
     measured line (~131%). Base pays NOT touched. */
  /* v2-21 rebalance: prizes re-scaled with the mixed-door retune (see
     doorSymbols note) — random-pick EV = (sum)/2 + completion/9
     = 3.90/2 + 1.8/9 = 2.15x total bet. */
  bonus: { prizes: [0.1, 0.15, 0.25, 0.3, 0.45, 0.6, 0.85, 1.2], completion: 1.8 },
  /* BONUS WHEEL (2026-11-22, ported from Pearl's Paws): when the garage
     would open, wheelShare of the time the BONUS WHEEL opens instead —
     the bonus-door frequency itself is unchanged, so the combined
     feature frequency is exactly as before. 12 wedges, every wedge pays
     (multiples of the TOTAL bet of the triggering spin, in wheel order).
     EV = 89/12 = 7.42x total bet, matching the garage's design EV.
     tunable — unification pass owns final numbers. */
  /* Door rebalance (2026-11-22): wedges scaled x0.45 with the garage
     (EV 7.42x -> 3.38x) so the blended behind-door EV holds the total. */
  /* v2-21 rebalance: wedges re-scaled with the mixed-door retune —
     EV = 22/12 = 1.83x total bet; tiers keyed to the new wedge values. */
  wheel: [7, 0.5, 2, 0.75, 3.75, 1.5, 0.75, 2, 1, 0.5, 1.5, 0.75],
  wheelTiers: { 7: 'GRAND', 3.75: 'MAJOR', 2: 'MINOR', 1: 'MINI' },
  /* v2-23 (2026-11-22): the door deals THREE bonus games at random —
     Pick-a-Garage, the Bonus Wheel and the SKULL VAULT (below) —
     equal thirds each; Joshua: "get different bonuses at random." */
  wheelShare: 1 / 3,
  vaultShare: 1 / 3,
  /* SKULL VAULT (2026-11-22 — ported whole from Poker Luxe v17, Joshua:
     "Add the vault as well to the Hustle City classic slot. As a bonus
     game. The vault game the same one."): 12 doors, the 9 prizes below
     (multiples of the TOTAL bet of the triggering spin) + 3 skulls.
     Every door PAYS ON THE SPOT into the balance; a skull ENDS the
     vault and never takes back what was collected; STOP ends it early
     with a summary; every ending lands on the read-hold panel. Prize
     scale is Classics' own, mirroring Luxe's structure (Luxe: 8.5x big
     door / 13x total at its scale): pick-until-skull EV
     = sum/(skulls+1) = 7.98/4 = 1.995x, set so the equal-thirds
     behind-door blend holds the v2-22 total exactly:
     (garage 2.15 + wheel 1.83 + vault 1.995) / 3 = 1.9917x. */
  vault: { prizes: [5.2, 0.6, 0.45, 0.45, 0.45, 0.21, 0.21, 0.21, 0.2], skulls: 3 },
  paytable: {
    DL: { 3: 64.8, 4: 232.8, 5: 2650.8 },
    WD: { 3: 38.4, 4: 130.8, 5: 530.4 },
    SV: { 3: 21.6, 4: 84, 5: 318 },
    HS: { 3: 14.4, 4: 46.8, 5: 105.6 },
    CH: { 2: 3.6, 3: 4.8, 4: 13.2, 5: 26.4 },
    BL: { 3: 6, 4: 19.2, 5: 42 },
    B1: { 3: 4.8, 4: 13.2, 5: 26.4 }
  },
  strips: [
    ['B1', 'B1', 'CH', 'B1', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'X2', 'SC', 'DL', 'BL', 'BL', 'SV', 'DD', 'BL', 'CH', 'CH', 'BL', 'HS', 'B1', 'CH', 'BL'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'B1', 'B1', 'BL', 'BL', 'B1', 'X3', 'CH', 'SV', 'CH', 'BL', 'WD', 'BL', 'HS', 'B1', 'BL', 'DL', 'B1', 'CH', 'BL'],
    ['B1', 'B1', 'HS', 'B1', 'SV', 'DL', 'BL', 'X2', 'SC', 'CH', 'BL', 'B1', 'BL', 'B1', 'WD', 'B1', 'BL', 'BL', 'CH', 'CH', 'DD', 'B1', 'CH', 'BL', 'B1'],
    ['BL', 'HS', 'WD', 'BL', 'DL', 'B1', 'SV', 'CH', 'BL', 'CH', 'BL', 'B1', 'CH', 'DD', 'BL', 'CH', 'HS', 'WD', 'SC', 'B1', 'BL', 'B1', 'HS', 'CH', 'BL'],
    ['B1', 'CH', 'BL', 'SV', 'B1', 'WD', 'B1', 'SV', 'B1', 'CH', 'X2', 'CH', 'HS', 'BL', 'CH', 'SC', 'DD', 'B1', 'B1', 'BL', 'SV', 'HS', 'BL', 'CH', 'B1']
  ]
};

const machinesApi = { CLASSICS };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
