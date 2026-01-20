import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "token13 Merchant",
  description: "Accept crypto payments with ease",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
