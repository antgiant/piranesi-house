import { describe, expect, it } from 'vitest';
import { FEET_PER_M, localiseUnits, lengthText, numberWords, parseUnits, resolveUnits, roundFeet, speedText } from '../src/game/units';
import { describeDistance } from '../src/game/walk';

describe('which units', () => {
  it('Automatic follows the reader\'s region: feet and miles in the United States, Liberia and Myanmar, metres elsewhere', () => {
    expect(resolveUnits('auto', 'en-US')).toBe('us');
    expect(resolveUnits('auto', 'en_US')).toBe('us');
    expect(resolveUnits('auto', 'en-GB')).toBe('metric');
    expect(resolveUnits('auto', 'fr-FR')).toBe('metric');
    expect(resolveUnits('auto', 'en')).toBe('metric');
    expect(resolveUnits('auto', undefined)).toBe('metric');
  });
  it('a chosen setting wins over the region', () => {
    expect(resolveUnits('metric', 'en-US')).toBe('metric');
    expect(resolveUnits('us', 'fr-FR')).toBe('us');
  });
  it('a damaged saved value falls back to Automatic', () => {
    for (const bad of [undefined, null, '', 'imperial', 3, {}]) expect(parseUnits(bad)).toBe('auto');
    for (const ok of ['auto', 'metric', 'us']) expect(parseUnits(ok)).toBe(ok);
  });
});

describe('feet and miles', () => {
  it('leaves metric text exactly as it is', () => {
    const t = 'You set off for the west door, 105 metres away, ten metres short, 20 km, 5.3 km/h.';
    expect(localiseUnits(t, 'metric')).toBe(t);
  });
  it('turns the walk\'s own sentence into feet', () => {
    expect(localiseUnits(`You set off for the west door, ${describeDistance(105)} away.`, 'us')).toBe('You set off for the west door, about 345 feet away.'.replace('about ', ''));
  });
  it('rounds to numbers a person would say', () => {
    expect(roundFeet(2)).toBe(6.6);
    expect(roundFeet(30)).toBe(100); // 98.4 ft
    expect(roundFeet(105)).toBe(345);
    expect(roundFeet(5)).toBe(16);
    expect(roundFeet(0.9)).toBe(3);
  });
  it('handles a hall\'s size, a height and a depth', () => {
    expect(localiseUnits('a great shaft of a room about 180 by 90 metres whose walls climb 30 metres', 'us')).toBe('a great shaft of a room about 590 by 295 feet whose walls climb 100 feet');
    expect(localiseUnits('It stands about 2.0 metres tall.', 'us')).toBe('It stands about 6.6 feet tall.');
    expect(localiseUnits('the water is 1.5 metres deep', 'us')).toBe('the water is 4.9 feet deep');
  });
  it('keeps a number written in words in words, and its capital', () => {
    expect(localiseUnits('steps that stop ten metres short of the floor', 'us')).toBe('steps that stop thirty-five feet short of the floor');
    expect(localiseUnits('Twenty metres above', 'us')).toBe('Sixty-five feet above');
    expect(localiseUnits('nine metres', 'us')).toBe('thirty feet');
  });
  it('turns phrases without a number into the nearest thing in feet or yards', () => {
    expect(localiseUnits('ribbed with arches every few metres', 'us')).toBe('ribbed with arches every few yards');
    expect(localiseUnits('over many square metres', 'us')).toBe('over many square feet');
  });
  it('turns kilometres into miles and km/h into mph, and a speed is not taken for a distance', () => {
    expect(localiseUnits('the road is 20 km long', 'us')).toBe('the road is 12.4 miles long');
    expect(localiseUnits('about 1.2 kilometres away', 'us')).toBe('about 0.7 miles away');
    expect(localiseUnits('5.3 km/h', 'us')).toBe('3.3 mph');
    expect(localiseUnits('42.195 km in 7200 s (21.1 km/h)', 'us')).toBe('26.2 miles in 7200 s (13.1 mph)');
  });
  it('does not touch other words that happen to contain the letters', () => {
    const t = 'a geometer smiled; the kilometre-long road; 5 metre';
    expect(localiseUnits('a geometer smiled', 'us')).toBe('a geometer smiled');
    expect(localiseUnits(t, 'us')).toContain('geometer');
  });
  it('writes numbers as words correctly', () => {
    expect(numberWords(13)).toBe('thirteen');
    expect(numberWords(35)).toBe('thirty-five');
    expect(numberWords(60)).toBe('sixty');
  });
  it('gives UI lengths and speeds in the reader\'s units', () => {
    expect(speedText(5.33, 'us')).toBe('3.3 mph');
    expect(speedText(5.33, 'metric')).toBe('5.3 km/h');
    expect(lengthText(150, 'us')).toBe('490 ft');
    expect(lengthText(150, 'metric')).toBe('150 m');
    expect(FEET_PER_M).toBeCloseTo(3.28084, 5);
  });
});
