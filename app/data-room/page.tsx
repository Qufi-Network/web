import type { Metadata } from 'next';
import { Team } from '../../components/site/Team';
import { RoomOverview } from '../../components/site/dataroom/views';

export const metadata: Metadata = {
  title: 'Data room',
  robots: { index: false, follow: false },
};

/**
 * The front of the data room, in the environment.
 *
 * The page itself lives in `dataroom/views`, because the standard site shows
 * the same thirty-six documents and two copies of this markup would be two
 * copies to keep in step. All that differs here is the treatment of the team:
 * hexagons and rings on this side, round portraits on the other.
 */
export default function Page() {
  return <RoomOverview people={<Team />} />;
}
