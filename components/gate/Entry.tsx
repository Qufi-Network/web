'use client';

import { useState } from 'react';
import { ExperienceRoot } from '../experience/ExperienceRoot';
import { Gate, type Choice } from './Gate';

/**
 * What the front door opens onto.
 *
 * The experience is not mounted until it has been chosen. That is the whole
 * point of this component: `ExperienceRoot` pulls in three.js, compiles
 * shaders and starts a render loop, and doing any of that behind a door
 * somebody has not opened yet would make the door slow and the choice a lie.
 *
 * Choosing the site is a navigation rather than a state change, so it is not
 * handled here — the card is a link, and the browser does it.
 */
export function Entry() {
  const [choice, setChoice] = useState<Choice | null>(null);

  if (choice !== 'network') return <Gate onEnter={setChoice} />;
  return <ExperienceRoot />;
}
