// APP ROUTE: /dashboard
// App Route Page mengimpor dan merender TeacherDashboardTemplate (Atomic Design).

import TeacherDashboardTemplate from '@/components/templates/pages/dashboard/TeacherDashboardTemplate';

export const metadata = {
  title: 'Dashboard Guru | MicroJourney AR',
  description: 'Panel manajemen siswa dan rekap E-LKPD MicroJourney AR.',
};

export default function Dashboard() {
  return <TeacherDashboardTemplate />;
}
