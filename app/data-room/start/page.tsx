import type { Metadata } from 'next';
import { RoomStart } from '../../../components/site/dataroom/views';

export const metadata: Metadata = {
  title: 'Start here',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RoomStart />;
}
