"use strict";
/* ============ HUSTLE CITY PINOCHLE — pure game logic ============
   Double-deck partnership Pinochle, 80 cards, NO NINES.
   Ruleset locked for this build (Pagat double-deck table):
   - Deck: A,10,K,Q,J in 4 suits x 4 copies = 80 cards, 20 per player.
   - Rank order in suit: A > 10 > K > Q > J.
   - Auction: floor 50; bids rise by 1 up to 60, then in multiples of 5.
     A pass is final. If the first three pass, the dealer is stuck at 50.
   - Trump: declarer must hold a marriage (K+Q) in the trump suit BEFORE
     the pass, or the hand is thrown in: bidding side loses the bid,
     neither side scores anything.
   - Pass: declarer's partner passes 4 cards to the declarer, declarer
     returns 4 (sequential pass, the common partnership form).
   - Meld: Pagat double-deck table (single/double/triple/quadruple),
     scored AFTER the pass. A card may count once in each meld TYPE.
     A side's meld counts only if the side's total meld is 20+.
   - Play: follow suit if able; if following, you must beat the card
     currently winning the trick if you can ("crawl"). Void in the led
     suit: you must trump, and overtrump if you can. First of identical
     cards wins.
   - Counters: each A, 10 and K captured = 1 point; last trick = 2.
     50 trick points per hand.
   - Save rule: a side must take 20+ trick points to score its meld.
     Bidding side set (meld+tricks < bid, or <20 trick points):
     scores nothing, bid is subtracted. Defenders score meld+tricks
     only when they take 20+ trick points.
   - Game: first side to 500. If both sides reach 500 on the same hand,
     the bidding side wins.
================================================================== */
(function (global) {
  const SUITS = ["S", "H", "D", "C"];            // spades, hearts, diamonds, clubs
  const SUIT_NAME = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
  const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RANKS = ["A", "10", "K", "Q", "J"];      // high to low
  const STRENGTH = { A: 5, "10": 4, K: 3, Q: 2, J: 1 };
  const COUNTER = { A: 1, "10": 1, K: 1, Q: 0, J: 0 };
  const RUN_SEQ = [0, 15, 150, 225, 300];
  const PIN_SEQ = [0, 4, 30, 60, 90];
  const AROUND_BASE = { A: 10, K: 8, Q: 6, J: 4 };
  const AROUND_MULT = [0, 1, 10, 15, 20];

  function buildDeck() {
    const deck = [];
    let id = 0;
    for (const s of SUITS) for (const r of RANKS) for (let c = 0; c < 4; c++)
      deck.push({ id: id++, suit: s, rank: r, copy: c });
    return deck;
  }
  function cardName(c) { return c.rank + SUIT_GLYPH[c.suit]; }
  function countIf(hand, suit, rank) {
    let n = 0; for (const c of hand) if (c.suit === suit && c.rank === rank) n++;
    return n;
  }

  /* ---- Meld. Returns { total, lines: [{label, points}] } ---- */
  function computeMeld(hand, trump) {
    const lines = [];
    let total = 0;
    const add = (label, pts) => { if (pts > 0) { lines.push({ label, points: pts }); total += pts; } };
    // Type I — runs & marriages (trump K/Q left over after runs can remarry)
    const tCounts = {}; for (const r of RANKS) tCounts[r] = countIf(hand, trump, r);
    const maxRuns = Math.min(...RANKS.map(r => tCounts[r]));
    let bestI = -1, bestRun = 0, bestRoyal = 0;
    for (let r = 0; r <= maxRuns; r++) {
      const royal = Math.min(tCounts.K - r, tCounts.Q - r);
      const val = RUN_SEQ[r] + 4 * royal;
      if (val > bestI) { bestI = val; bestRun = r; bestRoyal = royal; }
    }
    if (bestRun > 0) add((bestRun > 1 ? ["", "", "Double ", "Triple ", "Quadruple "][bestRun] : "") + "Run (" + SUIT_NAME[trump] + ")", RUN_SEQ[bestRun]);
    if (bestRoyal > 0) add("Royal marriage" + (bestRoyal > 1 ? " ×" + bestRoyal : "") + " (" + SUIT_NAME[trump] + ")", 4 * bestRoyal);
    for (const s of SUITS) {
      if (s === trump) continue;
      const m = Math.min(countIf(hand, s, "K"), countIf(hand, s, "Q"));
      if (m > 0) add("Marriage" + (m > 1 ? " ×" + m : "") + " (" + SUIT_NAME[s] + ")", 2 * m);
    }
    // Type II — pinochle: J of diamonds + Q of spades
    const pin = Math.min(countIf(hand, "D", "J"), countIf(hand, "S", "Q"));
    if (pin > 0) add((pin > 1 ? ["", "", "Double ", "Triple ", "Quadruple "][pin] : "") + "Pinochle (J♦ + Q♠)", PIN_SEQ[pin]);
    // Type III — arounds
    for (const r of ["A", "K", "Q", "J"]) {
      const n = Math.min(...SUITS.map(s => countIf(hand, s, r)));
      if (n > 0) add((n > 1 ? ["", "", "Double ", "Triple ", "Quadruple "][n] : "") + r + "s around", AROUND_BASE[r] * AROUND_MULT[n]);
    }
    return { total, lines };
  }

  /* ---- Tricks ---- */
  // entries: [{p, card}] in play order. Returns index of winning entry.
  function winningIndex(entries, trump) {
    let win = 0;
    for (let i = 1; i < entries.length; i++) {
      const cur = entries[win].card, c = entries[i].card;
      if (c.suit === cur.suit) { if (STRENGTH[c.rank] > STRENGTH[cur.rank]) win = i; }
      else if (c.suit === trump && cur.suit !== trump) win = i;
    }
    return win;
  }
  function legalCards(hand, entries, trump) {
    if (!entries.length) return hand.slice();
    const led = entries[0].card.suit;
    const winCard = entries[winningIndex(entries, trump)].card;
    const follow = hand.filter(c => c.suit === led);
    if (follow.length) {
      if (winCard.suit === led) {
        const higher = follow.filter(c => STRENGTH[c.rank] > STRENGTH[winCard.rank]);
        return higher.length ? higher : follow;
      }
      return follow; // trick already trumped: any card of led suit is fine
    }
    const trumps = hand.filter(c => c.suit === trump);
    if (trumps.length) {
      if (winCard.suit === trump) {
        const higher = trumps.filter(c => STRENGTH[c.rank] > STRENGTH[winCard.rank]);
        return higher.length ? higher : trumps;
      }
      return trumps;
    }
    return hand.slice();
  }
  function trickPoints(cards, isLastTrick) {
    let pts = 0; for (const c of cards) pts += COUNTER[c.rank];
    return pts + (isLastTrick ? 2 : 0);
  }

  /* ---- Scoring one finished hand ----
     meldTeam: [team0 eligible meld, team1 eligible meld] (already 20+ gated)
     trickTeam: [team0 trick pts, team1 trick pts]; bidTeam 0/1; bid number.
     Returns { delta:[d0,d1], set:boolean, made:boolean }              */
  function scoreHand(meldTeam, trickTeam, bidTeam, bid) {
    const defTeam = 1 - bidTeam;
    const delta = [0, 0];
    const bidderSaved = trickTeam[bidTeam] >= 20;
    const made = bidderSaved && (meldTeam[bidTeam] + trickTeam[bidTeam] >= bid);
    if (made) delta[bidTeam] = meldTeam[bidTeam] + trickTeam[bidTeam];
    else delta[bidTeam] = -bid;
    if (trickTeam[defTeam] >= 20) delta[defTeam] = meldTeam[defTeam] + trickTeam[defTeam];
    return { delta, set: !made, made };
  }

  /* ---- Auction helpers ---- */
  function minLegalBid(currentBid) {
    if (!currentBid) return 50;
    return currentBid < 60 ? currentBid + 1 : currentBid + 5;
  }
  function isLegalBid(v, currentBid) {
    if (!Number.isInteger(v) || v < 50) return false;
    if (!currentBid) return true;
    if (v <= currentBid) return false;
    if (currentBid < 60) return v <= 60 || v % 5 === 0;
    return v % 5 === 0;
  }

  const api = { SUITS, SUIT_NAME, SUIT_GLYPH, RANKS, STRENGTH, COUNTER,
    buildDeck, cardName, countIf, computeMeld, winningIndex, legalCards,
    trickPoints, scoreHand, minLegalBid, isLegalBid };
  global.PinochleLogic = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
