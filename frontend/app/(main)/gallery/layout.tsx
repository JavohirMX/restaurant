import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description: "View our restaurant gallery and ambiance",
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
