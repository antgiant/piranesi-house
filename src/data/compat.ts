// What can go with what. A statue is drawn from four independent lists (the figure, its pose, what it holds or wears, and what keeps it
// company), and not every combination is possible: nobody who is leaping from a plinth has a lap, a figure with both hands in the air
// cannot hold a lantern, nothing sleeps in the arms of someone who is being dragged away by the hair. Rather than rewriting wording, the
// generator simply never picks an impossible combination (see `generatedSlot`): every pose, attribute and companion is read for what it
// needs and what it rules out, and a combination is allowed only if nothing contradicts anything else.

/** What a pose is. */
export const POSE = { SEATED: 1, BUSY: 2, AIR: 4, ACTIVE: 8, VIOLENT: 16 } as const;
/** What an attribute needs. */
export const ATTR = { HANDS: 1 } as const;
/** What a companion needs. */
export const COMP = { LAP: 1, GROUND: 2, ARM: 4, GENTLE: 8 } as const;

const re = (s: string): RegExp => new RegExp(s, 'i');

const SEATED = re('\\b(seated|sitting|sits|enthroned|squatting|on a (heavy |carved |stone )?(chair|throne)|sitting on a nest)\\b');
const VIOLENT = re('trampled|torn at|dragged|locked in|flung backward|stabbing|carried off|crushed|fleeing|screaming|poised to strike|wrestling|stamping|pinned|strangl|hurled|thrown down|clubbing|beating');
const BUSY = re(`${VIOLENT.source}|clapping|arms flung|arms folded|hands? (joined|pressed|clasped|folded|together|in the lap)|both (arms|hands)|hauling|pulling|pushing|climbing|bracing|raising a cup|swinging a|holding a child|embracing|an arm around|straining|heaving|reaching|bent double|twisting out`);
const AIR = re('leaping|flying|soaring|diving|hovering|gliding|landing|rising on the swell|leaps|flung backward|carried off|dragged away|spinning on one foot|caught mid-leap|in mid-air|jumping');
const ACTIVE = re(`${AIR.source}|${VIOLENT.source}|running|spinning|dance|darting|swimming|crawling|creeping|climbing|walking|hauling|straining|heaving|pulling|wrestling|pushing|charging|galloping|fleeing|rearing`);

const HANDS = re('^(holding|carrying|clasping|bearing|grasping|wielding|brandishing|with an? (open|empty) hand|with one hand|with a hand)');

const LAP = re('\\b(in|on) the lap\\b');
const GROUND = re('(at|beside|against|by|under|beneath|below|round|around) (its |the |his |her )?(feet|knee|knees|hem|base|plinth|side|elbow)|clinging to the hem|on the plinth|at its feet|standing (behind|over)|coiled around');
const ARMNEED = re('on the wrist|leaning on an arm|hand\\b|in the hand|on the arm');
const GENTLE = re('sleeping|lamb|\\bcat\\b|dove|child|tortoise|nestling|kitten|asleep');

export const poseTraits = (s: string): number =>
  (SEATED.test(s) ? POSE.SEATED : 0) | (BUSY.test(s) ? POSE.BUSY : 0) | (AIR.test(s) ? POSE.AIR : 0) | (ACTIVE.test(s) ? POSE.ACTIVE : 0) | (VIOLENT.test(s) ? POSE.VIOLENT : 0);
export const attributeTraits = (s: string): number => (HANDS.test(s) ? ATTR.HANDS : 0);
export const companionTraits = (s: string): number =>
  (LAP.test(s) ? COMP.LAP : 0) | (GROUND.test(s) ? COMP.GROUND : 0) | (ARMNEED.test(s) ? COMP.ARM : 0) | (GENTLE.test(s) ? COMP.GENTLE : 0);

/** Can a figure in this pose, with this attribute and this companion, exist? */
export function compatibleTraits(pose: number, attr: number, comp: number): boolean {
  if (comp & COMP.LAP && !(pose & POSE.SEATED)) return false; // only someone sitting has a lap
  if (comp & COMP.LAP && pose & POSE.ACTIVE) return false;
  if (comp & COMP.GROUND && pose & POSE.AIR) return false; // nothing waits at the feet of someone in the air
  if (comp & COMP.ARM && pose & POSE.BUSY) return false; // no free arm for the hawk to perch on
  if (comp & COMP.GENTLE && pose & (POSE.VIOLENT | POSE.AIR)) return false; // nothing gentle clings to someone in a struggle or in the air
  if (attr & ATTR.HANDS && pose & POSE.BUSY) return false; // hands already full
  return true;
}

export function compatible(pose: string, attribute: string, companion: string): boolean {
  return compatibleTraits(poseTraits(pose), attributeTraits(attribute), companionTraits(companion));
}
