import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservations",
  description: "Book a table at our restaurant",
};

export default function ReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
