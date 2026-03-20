function thresholds(gold, silver, bronze) {
  return { gold, silver, bronze };
}

function challenge(id, name, description, setupStones, target, shotType, par, thresholdSet) {
  return {
    id,
    name,
    description,
    setupStones,
    target,
    shotType,
    par,
    thresholds: thresholdSet,
  };
}

const tee = { x: 0, y: 23.47 };

export const CHALLENGES = [
  challenge('draw-01', 'Button Draw', 'Land on the button with no traffic.', [], { x: tee.x, y: tee.y, radius: 0.12 }, 'draw', 1, thresholds(0.12, 0.24, 0.4)),
  challenge('draw-02', 'Back Four Draw', 'Draw just behind the button and stay in the four foot.', [], { x: 0.18, y: 23.32, radius: 0.35 }, 'draw', 1, thresholds(0.15, 0.3, 0.5)),
  challenge('draw-03', 'Corner Guard Draw', 'Place a guard on the outside lane.', [], { x: -1.6, y: 16.2, radius: 0.2 }, 'draw', 2, thresholds(0.2, 0.35, 0.55)),
  challenge('draw-04', 'Tick Draw', 'Freeze the front stone and tick it sideways.', [{ x: 0.1, y: 21.9, team: 'yel' }], { x: 0.3, y: 21.5, radius: 0.3 }, 'draw', 2, thresholds(0.18, 0.34, 0.56)),
  challenge('draw-05', 'Center Control Draw', 'Sit top four with broomside finish.', [{ x: -0.25, y: 22.1, team: 'red' }], { x: -0.1, y: 22.95, radius: 0.28 }, 'draw', 2, thresholds(0.14, 0.28, 0.46)),

  challenge('takeout-01', 'Simple Hit', 'Remove the shot stone cleanly.', [{ x: 0.15, y: 23.0, team: 'yel' }], { x: 0.15, y: 23.0, radius: 0.18 }, 'takeout', 2, thresholds(0.16, 0.3, 0.5)),
  challenge('takeout-02', 'Double Peel', 'Clear two stones from the scoring area.', [{ x: -0.35, y: 22.7, team: 'yel' }, { x: 0.55, y: 22.8, team: 'yel' }], { x: 0.1, y: 22.75, radius: 0.22 }, 'takeout', 3, thresholds(0.18, 0.32, 0.55)),
  challenge('takeout-03', 'Raise Takeout', 'Hit and roll toward center protection.', [{ x: 0.4, y: 21.8, team: 'yel' }], { x: 0.4, y: 21.8, radius: 0.2 }, 'takeout', 2, thresholds(0.18, 0.33, 0.54)),
  challenge('takeout-04', 'Front House Clean', 'Clear the top house while keeping shooter in play.', [{ x: -0.15, y: 20.9, team: 'yel' }, { x: 0.85, y: 21.2, team: 'red' }], { x: -0.15, y: 20.9, radius: 0.2 }, 'takeout', 3, thresholds(0.22, 0.38, 0.6)),
  challenge('takeout-05', 'Angle Peeler', 'Peel the jammed stones and open the lane.', [{ x: -0.45, y: 24.1, team: 'yel' }, { x: 0.15, y: 24.0, team: 'red' }], { x: -0.45, y: 24.1, radius: 0.22 }, 'takeout', 3, thresholds(0.2, 0.36, 0.58)),

  challenge('guard-01', 'Center Guard', 'Place a centered guard in front of the house.', [], { x: 0.0, y: 18.4, radius: 0.18 }, 'guard', 1, thresholds(0.14, 0.28, 0.48)),
  challenge('guard-02', 'Corner Guard Left', 'Protect the forefoot from the left lane.', [], { x: -1.55, y: 17.6, radius: 0.2 }, 'guard', 1, thresholds(0.16, 0.3, 0.52)),
  challenge('guard-03', 'Corner Guard Right', 'Protect the forefoot from the right lane.', [], { x: 1.55, y: 17.6, radius: 0.2 }, 'guard', 1, thresholds(0.16, 0.3, 0.52)),

  challenge('freeze-01', 'Front Freeze', 'Freeze on top of the opponent stone.', [{ x: 0.08, y: 23.02, team: 'yel' }], { x: 0.08, y: 23.02, radius: 0.18 }, 'freeze', 2, thresholds(0.12, 0.24, 0.42)),
  challenge('freeze-02', 'Side Freeze', 'Freeze on the side of shot rock.', [{ x: -0.35, y: 22.98, team: 'red' }], { x: -0.35, y: 22.98, radius: 0.18 }, 'freeze', 2, thresholds(0.12, 0.24, 0.42)),
  challenge('freeze-03', 'Deep Freeze', 'Stick the nose and leave buried contact.', [{ x: 0.2, y: 22.6, team: 'yel' }, { x: -0.2, y: 22.5, team: 'red' }], { x: 0.2, y: 22.6, radius: 0.18 }, 'freeze', 3, thresholds(0.16, 0.28, 0.48)),

  challenge('hit-roll-01', 'Hit and Roll In', 'Hit the stone and roll behind cover.', [{ x: 0.2, y: 21.7, team: 'yel' }], { x: 0.35, y: 22.1, radius: 0.22 }, 'hit-and-roll', 3, thresholds(0.18, 0.32, 0.56)),
  challenge('hit-roll-02', 'Wick Roll', 'Wick off the outside and roll to the center line.', [{ x: 1.0, y: 21.9, team: 'yel' }], { x: 0.45, y: 22.0, radius: 0.22 }, 'hit-and-roll', 3, thresholds(0.18, 0.34, 0.58)),

  challenge('peel-01', 'Open Peel', 'Peel the guard and open the house.', [{ x: -0.2, y: 18.9, team: 'yel' }], { x: -0.2, y: 18.9, radius: 0.2 }, 'peel', 2, thresholds(0.16, 0.3, 0.5)),
  challenge('peel-02', 'Double Peel Lane', 'Remove the pair without leaving a jam.', [{ x: -0.45, y: 19.1, team: 'yel' }, { x: 0.45, y: 19.05, team: 'red' }], { x: -0.45, y: 19.1, radius: 0.2 }, 'peel', 3, thresholds(0.18, 0.32, 0.54)),
];

export default CHALLENGES;
