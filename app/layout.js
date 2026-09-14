import './globals.css';

export const metadata = {
  title: 'WordClass',
  description: 'Папки с английскими словами для занятий в классе',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="rule-margin"></div>
        {children}
      </body>
    </html>
  );
}
