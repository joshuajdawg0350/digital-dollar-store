/* Hustle City Slots — machine definitions (strips + paytables).
   CLASSICS: Joshua's symbol set (chrome dollar top, seven, horseshoe, cherry,
   BAR + BELL chrome low fillers, WILD, SCATTER, XX = blank stop).
   SKYLINE "Midnight Skyline": moonlit skyline set (vault door top, skyscraper,
   full moon, getaway sedan, laser beams, searchlight) on mirrored counts.
   LUXE "Poker Luxe": its own card-room set (jeweled crown top, ace of spades,
   blue chip stack, fanned card backs, sapphire cufflinks, single blue chip,
   WILD, SCATTER, XX = blank stop) on strip counts mirrored from Classics.
   (c) 2026 J-Dawgs Industries. */
'use strict';

const CLASSICS = {
  id: 'classics',
  name: 'Hustle City Slots — Casino Classics',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  paytable: {
    DL: { 3: 50, 4: 200, 5: 5000 },
    WD: { 3: 40, 4: 150, 5: 1000 },
    SV: { 3: 25, 4: 100, 5: 500 },
    HS: { 3: 15, 4: 60, 5: 180 },
    CH: { 2: 2, 3: 4, 4: 12, 5: 60 },
    BL: { 3: 6, 4: 25, 5: 120 },
    B1: { 3: 3, 4: 15, 5: 80 }
  },
  strips: [
    ['B1', 'XX', 'CH', 'HS', 'CH', 'HS', 'B1', 'BL', 'BL', 'WD', 'XX', 'SC', 'DL', 'SV', 'XX', 'SV', 'B1', 'BL', 'CH', 'XX'],
    ['B1', 'SC', 'CH', 'BL', 'CH', 'B1', 'DL', 'B1', 'BL', 'XX', 'XX', 'XX', 'CH', 'SV', 'XX', 'HS', 'WD', 'BL', 'HS', 'XX'],
    ['B1', 'SV', 'HS', 'XX', 'SV', 'DL', 'BL', 'XX', 'SC', 'CH', 'BL', 'B1', 'XX', 'XX', 'WD', 'B1', 'BL', 'HS', 'CH', 'CH'],
    ['XX', 'HS', 'XX', 'BL', 'DL', 'XX', 'SV', 'CH', 'BL', 'CH', 'SV', 'B1', 'CH', 'B1', 'BL', 'XX', 'HS', 'WD', 'SC', 'B1'],
    ['BL', 'CH', 'BL', 'SV', 'B1', 'WD', 'HS', 'SV', 'XX', 'CH', 'XX', 'CH', 'HS', 'XX', 'XX', 'SC', 'B1', 'B1', 'DL', 'BL']
  ]
};

const LUXE = {
  id: 'luxe',
  name: 'Poker Luxe',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  paytable: {
    CR: { 3: 50, 4: 200, 5: 5000 },
    WD: { 3: 40, 4: 150, 5: 1000 },
    AS: { 3: 25, 4: 100, 5: 500 },
    CHIP: { 3: 15, 4: 60, 5: 180 },
    CB: { 2: 2, 3: 4, 4: 12, 5: 60 },
    CUFF: { 3: 6, 4: 25, 5: 120 },
    CHP: { 3: 3, 4: 15, 5: 80 }
  },
  strips: [
    ['CHP', 'XX', 'CB', 'CHIP', 'CB', 'CHIP', 'CHP', 'CUFF', 'CUFF', 'WD', 'XX', 'SC', 'CR', 'AS', 'XX', 'AS', 'CHP', 'CUFF', 'CB', 'XX'],
    ['CHP', 'SC', 'CB', 'CUFF', 'CB', 'CHP', 'CR', 'CHP', 'CUFF', 'XX', 'XX', 'XX', 'CB', 'AS', 'XX', 'CHIP', 'WD', 'CUFF', 'CHIP', 'XX'],
    ['CHP', 'AS', 'CHIP', 'XX', 'AS', 'CR', 'CUFF', 'XX', 'SC', 'CB', 'CUFF', 'CHP', 'XX', 'XX', 'WD', 'CHP', 'CUFF', 'CHIP', 'CB', 'CB'],
    ['XX', 'CHIP', 'XX', 'CUFF', 'CR', 'XX', 'AS', 'CB', 'CUFF', 'CB', 'AS', 'CHP', 'CB', 'CHP', 'CUFF', 'XX', 'CHIP', 'WD', 'SC', 'CHP'],
    ['CUFF', 'CB', 'CUFF', 'AS', 'CHP', 'WD', 'CHIP', 'AS', 'XX', 'CB', 'XX', 'CB', 'CHIP', 'XX', 'XX', 'SC', 'CHP', 'CHP', 'CR', 'CUFF']
  ]
};


const SKYLINE = {
  id: 'skyline',
  name: 'Midnight Skyline',
  scatterPay: { 3: 2, 4: 8, 5: 40 },
  scatterSpins: { 3: 7, 4: 10, 5: 15 },
  paytable: {
    VAULT: { 3: 50, 4: 200, 5: 5000 },
    WD: { 3: 40, 4: 150, 5: 1000 },
    SKY: { 3: 25, 4: 100, 5: 500 },
    MOON: { 3: 15, 4: 60, 5: 180 },
    SEDAN: { 2: 2, 3: 4, 4: 12, 5: 60 },
    LASER: { 3: 6, 4: 25, 5: 120 },
    LIGHT: { 3: 3, 4: 15, 5: 80 }
  },
  strips: [
    ['LIGHT', 'XX', 'SEDAN', 'MOON', 'SEDAN', 'MOON', 'LIGHT', 'LASER', 'LASER', 'WD', 'XX', 'SC', 'VAULT', 'SKY', 'XX', 'SKY', 'LIGHT', 'LASER', 'SEDAN', 'XX'],
    ['LIGHT', 'SC', 'SEDAN', 'LASER', 'SEDAN', 'LIGHT', 'VAULT', 'LIGHT', 'LASER', 'XX', 'XX', 'XX', 'SEDAN', 'SKY', 'XX', 'MOON', 'WD', 'LASER', 'MOON', 'XX'],
    ['LIGHT', 'SKY', 'MOON', 'XX', 'SKY', 'VAULT', 'LASER', 'XX', 'SC', 'SEDAN', 'LASER', 'LIGHT', 'XX', 'XX', 'WD', 'LIGHT', 'LASER', 'MOON', 'SEDAN', 'SEDAN'],
    ['XX', 'MOON', 'XX', 'LASER', 'VAULT', 'XX', 'SKY', 'SEDAN', 'LASER', 'SEDAN', 'SKY', 'LIGHT', 'SEDAN', 'LIGHT', 'LASER', 'XX', 'MOON', 'WD', 'SC', 'LIGHT'],
    ['LASER', 'SEDAN', 'LASER', 'SKY', 'LIGHT', 'WD', 'MOON', 'SKY', 'XX', 'SEDAN', 'XX', 'SEDAN', 'MOON', 'XX', 'XX', 'SC', 'LIGHT', 'LIGHT', 'VAULT', 'LASER']
  ]
};

const machinesApi = { CLASSICS, LUXE, SKYLINE };
if (typeof module !== 'undefined' && module.exports) module.exports = machinesApi;
if (typeof window !== 'undefined') window.SlotMachines = machinesApi;
