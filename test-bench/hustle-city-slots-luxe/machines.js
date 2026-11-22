/* Hustle City Slots — Poker Luxe machine definition (strips + paytable + vault).
   Grown-up rebuild 2026-11-21 (the hand-drawn v1 was junked by Joshua).
   Symbol set: ACE OF SPADES top (AC), KING (KG), QUEEN (QN), JACK (JK),
   DIAMOND (DM), POKER CHIPS (CP, pays from 2), CHAMPAGNE (CG), DICE (DK),
   WILD (WD, substitutes for everything except SCATTER), SCATTER (SC, free
   spins), WIN x2 (X2) / WIN x3 (X3) line multipliers, BONUS token (BN).
   NO blank stops — every strip position is a real symbol.
   BONUS (SKULL VAULT): BONUS tokens ride reels 2, 3 and 4 only (two per
   strip, spaced so at most one can show per window); when all three
   windows show one, the Skull Vault opens — 12 doors, 9 blue-chip
   prizes + 3 skulls, stop-and-bank picks (see the vault note at the
   config below). Trigger probability is exactly (6/24)(6/25)(6/25) =
   1 in 69.4 spins after the feature retune; combined with free spins
   the features land 1 in 35.0 (Joshua's standard, 2026-11-21).
   MATH (Joshua's settled target, 2026-11-21): total RTP 98% — exact
   closed form including wheels landed during free spins; verified
   breakdown and Monte Carlo in sim/sim-results.txt.
   (c) 2026 J-Dawgs Industries.
   PAYOUT REBALANCE (2026-11-21, Joshua's ruling from real play: "They need
   to pay out better on individual spins") — BASE GAME ONLY: 3/4-of-a-kind
   pays x1.75, pairs x1.5 (5-of-a-kind untouched), reel weights shifted
   toward the common symbols (WD/SC/BN/X2/X3 keep their exact stops, so
   the free-spin and wheel geometry is unchanged: FS 1 in 39.6, wheel
   1 in 40.7, wheel EV 12.08x total bet — all as settled). Measured after:
   line RTP 74.68%, base-game share 115.96%, TOTAL theoretical RTP 152.28%
   (Monte Carlo 153.83% over 200k paid spins) — deliberately above the old
   98% design point; these are play credits and the owner's feel ruling
   governs. Net-positive base spins 11.2% -> 28.2%; average line win per
   hit 14.1 -> 24.7 credits at 1/line.
   FEATURE RETUNE (2026-11-21 21:47 CT, Joshua's ruling: "one in 35 spins
   to be one of the random bonuses — free spins or a bonus"): strips
   lengthened with regular symbols only (25/24/25/25/25 stops; every
   special keeps its count, position and window coverage), superseding
   the 'geometry unchanged' line above for FREQUENCIES only — wheel
   wedges and EV untouched (12.08x). Exact: free spins 1 in 68.2, wheel
   1 in 69.4, COMBINED 1 in 35.0. (The wheel's seat is now the SKULL
   VAULT — same BN trigger, same 1 in 69.4, so the combined 1 in 35.0
   stands; only the feature EV changed, 12.08x wheel -> ~6.9x vault.
   See the vault note at the config.) Final measured base game after both
   passes: line RTP 79.54%, base-game share 102.23%, TOTAL theoretical
   RTP 121.68% (Monte Carlo 121.92% over 200k paid spins); net-positive
   base spins 29.5%; average line win per hit 23.1 credits at 1/line.
   CHIP RECOLOR (2026-11-21 21:49 CT, Joshua's ruling "turn the chips
   blue"): the poker-chip stack art (assets/sym-cg.webp) recolored red
   -> electric blue. The WILD dollar coin, the SCATTER skull word and
   the cabinet's red LED readouts stay RED by his earlier ruling. */
'use strict';

const LUXE = {
  id: 'luxe',
  name: 'Hustle City Slots — Poker Luxe',
  scatterPay: { 3: 2, 4: 7, 5: 35 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  bonusAt: 3,
  /* SKULL VAULT (Joshua's pick #2, 2026-11-21 23:02 CT — replaces the
     press-and-watch Bonus Wheel on the BN door; free spins untouched):
     12 riveted vault doors — the 9 prizes below (multiples of the TOTAL
     bet, summing to 38x) plus 3 skulls, shuffled face-down. The player
     picks doors one at a time and may STOP & BANK after any safe door;
     a skull loses everything unbanked; clearing all 9 pays the full 38x.
     Prize table tuned 2026-11-21 so the game lands in the ~7x bonus
     band under stop-and-bank play: exact optimal-stopping EV 6.93x,
     Monte Carlo (200k plays) 6.89x optimal / 6.85x bank-at-15x — the
     top-heavy table (one 25x diamond door) is what carries the EV; an
     even spread of the same 38x measures only ~5.0x. The old wheel
     (EV 12.08x, wedges [100,5,7,2,4,8,0,3,6,1,5,4]) is retired. */
  vault: { prizes: [25, 3, 2, 2, 2, 1, 1, 1, 1], skulls: 3 },
  /* BONUS WHEEL (added 2026-11-22 — JOINS the Skull Vault on the same BN
     door; Joshua picked the Vault over a wheel, then the wheel was ported
     in alongside it, replacing nothing): when the BN trigger fires, a
     wheelShare roll decides wheel vs vault. Wedges are multiples of the
     TOTAL bet; every wedge pays. Table sum 83x / 12 wedges = EV 6.92x,
     matching the vault's ~6.9x band. Tunable — unification pass owns
     final numbers. (The retired wheel table in the header comment,
     EV 12.08x, is history — do not resurrect it.) */
  wheel: [25, 2, 6, 3, 12, 5, 2, 7, 4, 3, 8, 6],
  wheelTiers: { 25: 'GRAND', 12: 'MAJOR', 8: 'MINOR', 4: 'MINI' },
  wheelShare: 0.5,
  paytable: {
    AC: { 3: 46, 4: 145, 5: 1500 },
    WD: { 3: 26, 4: 86, 5: 338 },
    KG: { 3: 16, 4: 67, 5: 225 },
    DM: { 3: 11, 4: 33, 5: 90 },
    QN: { 3: 7, 4: 19, 5: 41 },
    CG: { 3: 5, 4: 14, 5: 34 },
    JK: { 3: 4, 4: 12, 5: 26 },
    DK: { 3: 4, 4: 11, 5: 23 },
    CP: { 2: 3, 3: 4, 4: 11, 5: 21 }
  },
  strips: [
    ['JK', 'CP', 'CP', 'CP', 'CG', 'CG', 'JK', 'CG', 'CP', 'WD', 'X2', 'SC', 'AC', 'KG', 'CG', 'JK', 'JK', 'DK', 'CP', 'DM', 'CP', 'AC', 'JK', 'CG', 'CP'],
    ['JK', 'SC', 'CP', 'CG', 'CP', 'JK', 'CP', 'JK', 'CG', 'BN', 'JK', 'X3', 'CP', 'KG', 'CP', 'CP', 'WD', 'CG', 'DM', 'BN', 'CP', 'CG', 'JK', 'CP'],
    ['JK', 'KG', 'DM', 'JK', 'CG', 'CP', 'CG', 'X2', 'BN', 'SC', 'CP', 'CG', 'JK', 'CG', 'JK', 'WD', 'DK', 'CP', 'DM', 'CP', 'BN', 'CP', 'CP', 'JK', 'CG'],
    ['CG', 'DM', 'WD', 'X2', 'CP', 'JK', 'KG', 'CP', 'BN', 'CP', 'JK', 'QN', 'CP', 'JK', 'CG', 'QN', 'CG', 'WD', 'SC', 'BN', 'CP', 'QN', 'CG', 'JK', 'CP'],
    ['CP', 'CP', 'CG', 'KG', 'JK', 'WD', 'DM', 'JK', 'JK', 'CP', 'X2', 'CP', 'CG', 'CG', 'CP', 'SC', 'JK', 'DK', 'AC', 'CG', 'CP', 'KG', 'CG', 'JK', 'CP']
  ]
};

const machinesApi = { LUXE };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
