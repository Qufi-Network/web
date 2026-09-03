import type { Metadata } from 'next';
import { ClassicTeam } from '../../../components/classic/ClassicTeam';
import { RoomOverview } from '../../../components/site/dataroom/views';

export const metadata: Metadata = {
  title: 'Data room',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RoomOverview base="/classic" people={<ClassicTeam />} />;
}
