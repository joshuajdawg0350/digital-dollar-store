"use strict";
/*
 * Hustle City Digital Poker — game core.
 * Pure logic only: deck, shuffle, 9/6 Jacks or Better evaluation and payouts.
 * Loaded by the page and by tests/logic.test.js (Node).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HCDPCore = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  const SUITS = ["♠", "♥", "♦", "♣"];
  const SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const MAX_BET_ROYAL = 4000;

  // Per-credit payouts for 9/6 Jacks or Better. Royal is handled specially at bet 5.
  const PAYTABLE = [
    { key: "royal",         label: "Royal Flush",      perCredit: 250 },
    { key: "straightflush", label: "Straight Flush",   perCredit: 50 },
    { key: "four",          label: "Four of a Kind",   perCredit: 25 },
    { key: "fullhouse",     label: "Full House",       perCredit: 9 },
    { key: "flush",         label: "Flush",            perCredit: 6 },
    { key: "straight",      label: "Straight",         perCredit: 4 },
    { key: "three",         label: "Three of a Kind",  perCredit: 3 },
    { key: "twopair",       label: "Two Pair",         perCredit: 2 },
    { key: "jacks",         label: "Jacks or Better",  perCredit: 1 }
  ];

  function cardId(rank, suit) { return RANKS[rank - 1] + SUITS[suit]; }
  function makeCard(rank, suit) {
    return { rank, suit, id: cardId(rank, suit), rankLabel: RANKS[rank - 1], suitSymbol: SUITS[suit], suitName: SUIT_NAMES[suit] };
  }
  function createDeck() {
    const deck = [];
    for (let suit = 0; suit < 4; suit++) for (let rank = 1; rank <= 13; rank++) deck.push(makeCard(rank, suit));
    return deck;
  }
  function parseCard(id) {
    const suit = SUITS.indexOf(id.slice(-1));
    const rank = RANKS.indexOf(id.slice(0, -1)) + 1;
    if (suit < 0 || rank < 1) throw new Error("Bad card id: " + id);
    return makeCard(rank, suit);
  }
  // Deterministic RNG for tests (mulberry32).
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffleDeck(deck, rand) {
    const out = deck.slice();
    const r = rand || Math.random;
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function evaluateHand(cards) {
    if (!Array.isArray(cards) || cards.length !== 5) throw new Error("evaluateHand needs exactly 5 cards");
    const ranks = cards.map(c => c.rank);
    const flush = cards.every(c => c.suit === cards[0].suit);
    const unique = [...new Set(ranks)].sort((a, b) => a - b);
    let straight = false, royalStraight = false;
    if (unique.length === 5) {
      if (unique.join(",") === "1,10,11,12,13") { straight = true; royalStraight = true; }
      else if (unique.join(",") === "1,2,3,4,5") { straight = true; } // the wheel
      else if (unique[4] - unique[0] === 4) { straight = true; }
    }
    const counts = new Map();
    ranks.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
    const groups = [...counts.entries()]
      .map(([rank, count]) => ({ rank, count }))
      .sort((a, b) => (b.count - a.count) || (b.rank - a.rank));
    const pattern = groups.map(g => g.count).join("-");

    let hit = null;
    if (straight && flush && royalStraight) hit = PAYTABLE[0];
    else if (straight && flush) hit = PAYTABLE[1];
    else if (pattern === "4-1") hit = PAYTABLE[2];
    else if (pattern === "3-2") hit = PAYTABLE[3];
    else if (flush) hit = PAYTABLE[4];
    else if (straight) hit = PAYTABLE[5];
    else if (pattern === "3-1-1") hit = PAYTABLE[6];
    else if (pattern === "2-2-1") hit = PAYTABLE[7];
    else if (pattern === "2-1-1-1") {
      const pairRank = groups[0].rank;
      if (pairRank === 1 || pairRank >= 11) hit = PAYTABLE[8]; // Aces, Jacks, Queens, Kings
    }
    if (!hit) return { key: "none", label: "No Win", perCredit: 0, flush, straight, groups };
    return { key: hit.key, label: hit.label, perCredit: hit.perCredit, flush, straight, groups };
  }

  function payoutFor(result, bet) {
    if (!result || result.perCredit === 0) return 0;
    if (result.key === "royal" && bet === 5) return MAX_BET_ROYAL;
    return result.perCredit * bet;
  }

  return { SUITS, SUIT_NAMES, RANKS, PAYTABLE, MAX_BET_ROYAL, makeCard, createDeck, parseCard, rng, shuffleDeck, evaluateHand, payoutFor };
});
