import './globals.css';
// Шрифты лежат на самом сайте (а не грузятся с Google) — так они открываются и в России.
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';

export const metadata = {
  title: 'WordClass',
  description: 'Папки с английскими словами для занятий в классе',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="rule-margin"></div>
        {children}
      </body>
    </html>
  );
}
