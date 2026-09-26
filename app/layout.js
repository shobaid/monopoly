import "./globals.css";

export const metadata = {
  title: "Monopoly Online",
  description: "Play Monopoly online with friends",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
