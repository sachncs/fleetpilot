import { ConsoleShell } from '@/components/layout/console-shell';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ConsoleShell>{children}</ConsoleShell>;
}
