/**
 * Who leads the company.
 *
 * Plain data with no component around it, because two very different things
 * render it — the hexagon-and-ring treatment in the environment, and three
 * round portraits on the standard site — and because a `'use client'` module
 * cannot be read by a server component. Exporting an array from `Team.tsx`
 * looked like it worked and produced `TEAM.map is not a function` the moment
 * the standard site asked for it: what crosses that boundary is a reference
 * the client will resolve, not the array itself.
 *
 * The three colours are the ones the products already use, which is not
 * decoration: technology, business and growth are what the products are made
 * of, and giving the people the same three says so without a sentence.
 */

export interface Person {
  id: string;
  name: string;
  role: string;
  tone: string;
  /** Where the photograph came out of `tools/build/mkteam.mjs`. */
  photo: string;
}

export const TEAM: Person[] = [
  {
    id: 'alex',
    name: 'Dr. Alexander Reay',
    role: 'Technology',
    tone: '#4CC9FF',
    photo: '/team/alex.webp',
  },
  { id: 'sam', name: 'Samson Lee', role: 'Business', tone: '#A97BFF', photo: '/team/sam.webp' },
  { id: 'eric', name: 'Eric Benz', role: 'Growth', tone: '#3BE08F', photo: '/team/eric.webp' },
];
