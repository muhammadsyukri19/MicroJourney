export default function JourneyTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-transition flex-grow flex flex-col">{children}</div>;
}
