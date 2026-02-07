import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ScrollAnimations } from "@/components/scroll-animations";
import { getRestaurantInfo } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const restaurant = await getRestaurantInfo();
    return {
      title: {
        default: restaurant.name,
        template: `%s | ${restaurant.name}`,
      },
      description: restaurant.description || restaurant.tagline,
    };
  } catch {
    return {
      title: "Restaurant",
      description: "Fine dining experience",
    };
  }
}

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollAnimations />
    </div>
  );
}
