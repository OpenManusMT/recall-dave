import type { AuthoredPassage } from '@recall/core';
import p01 from './passages/p01-bread';
import p02 from './passages/p02-canal-locks';
import p03 from './passages/p03-robins-in-winter';
import p04 from './passages/p04-rainbows';
import p05 from './passages/p05-garden-compost';
import p06 from './passages/p06-tides';
import p07 from './passages/p07-first-underground';
import p08 from './passages/p08-garden-hedgehogs';
import p09 from './passages/p09-descaling-a-kettle';
import p10 from './passages/p10-lighthouses';
import p11 from './passages/p11-chance-of-rain';
import p12 from './passages/p12-swallows';
import p13 from './passages/p13-leap-years';
import p14 from './passages/p14-spring-bulbs';
import p15 from './passages/p15-great-fire-of-london';
import p16 from './passages/p16-recycling-glass';
import p17 from './passages/p17-how-a-fridge-works';
import p18 from './passages/p18-lake-district';
import p19 from './passages/p19-tea-in-britain';
import p20 from './passages/p20-bumblebees';
import p21 from './passages/p21-scam-texts';
import p22 from './passages/p22-24-hour-clock';
import probe01 from './probes/probe-01-autumn-leaves';
import probe02 from './probes/probe-02-puffins';
import probe03 from './probes/probe-03-penny-black';
import probe04 from './probes/probe-04-salt-on-roads';
import probe05 from './probes/probe-05-stonehenge';
import probe06 from './probes/probe-06-bicycle-gears';

/** Practice passages, in the order they are offered by "Start a session". */
export const LIBRARY_PASSAGES: AuthoredPassage[] = [
  p01,
  p02,
  p03,
  p04,
  p05,
  p06,
  p07,
  p08,
  p09,
  p10,
  p11,
  p12,
  p13,
  p14,
  p15,
  p16,
  p17,
  p18,
  p19,
  p20,
  p21,
  p22,
];

/** Fresh-text probes. Kept separate so transfer is never measured on practised material. */
export const PROBE_PASSAGES: AuthoredPassage[] = [
  probe01,
  probe02,
  probe03,
  probe04,
  probe05,
  probe06,
];

export const ALL_PASSAGES: AuthoredPassage[] = [...LIBRARY_PASSAGES, ...PROBE_PASSAGES];

export function findPassage(id: string): AuthoredPassage | undefined {
  return ALL_PASSAGES.find((p) => p.id === id);
}
