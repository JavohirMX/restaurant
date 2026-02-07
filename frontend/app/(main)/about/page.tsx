import { Metadata } from "next";
import Image from "next/image";
import { Award, Users, Leaf, Clock } from "lucide-react";
import { getRestaurantInfo, getHours, HoursResponse } from "@/lib/api";
import { generateJsonLd } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const restaurant = await getRestaurantInfo();
    return {
      title: "About Us",
      description: `Learn about ${restaurant.name} - our story, our team, and our commitment to excellence.`,
    };
  } catch {
    return {
      title: "About Us",
      description: "Learn about our restaurant and our story",
    };
  }
}

export default async function AboutPage() {
  let restaurant;
  let hours: HoursResponse | null = null;

  try {
    restaurant = await getRestaurantInfo();
    hours = await getHours();
  } catch {
    restaurant = null;
    hours = null;
  }

  const jsonLd = restaurant
    ? generateJsonLd("AboutPage", {
        name: `About ${restaurant.name}`,
        description: restaurant.description,
        mainEntity: {
          "@type": "Restaurant",
          name: restaurant.name,
          description: restaurant.description,
        },
      })
    : null;

  const highlights = [
    {
      icon: Award,
      title: "Award Winning",
      description: "Recognized for culinary excellence and outstanding service",
    },
    {
      icon: Leaf,
      title: "Fresh Ingredients",
      description: "Locally sourced, seasonal ingredients in every dish",
    },
    {
      icon: Users,
      title: "Expert Team",
      description: "Passionate chefs and dedicated service professionals",
    },
    {
      icon: Clock,
      title: "Since Day One",
      description: "Committed to creating memorable dining experiences",
    },
  ];

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}

      <div className="min-h-screen bg-background-secondary">
        {/* Hero */}
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                About {restaurant?.name || "Us"}
              </h1>
              <p className="mt-6 text-xl leading-8 text-muted-foreground">
                {restaurant?.tagline || "A passion for food, a commitment to excellence"}
              </p>
            </div>
          </div>
        </div>

        {/* Our Story */}
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Our Story
                </h2>
                <div className="mt-6 space-y-4 text-lg text-muted-foreground">
                  <p>
                    {restaurant?.description ||
                      "Welcome to our restaurant, where culinary passion meets warm hospitality. Our journey began with a simple vision: to create a dining experience that celebrates the finest ingredients and brings people together over exceptional food."}
                  </p>
                  <p>
                    Every dish we serve tells a story of dedication, creativity, and 
                    an unwavering commitment to quality. From our carefully curated 
                    menu to our attentive service, we strive to make every visit 
                    memorable.
                  </p>
                </div>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <div className="flex h-full items-center justify-center bg-muted">
                  <span className="text-muted-foreground">Restaurant Image</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="bg-card py-16 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Why Choose Us
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                We're dedicated to providing an exceptional dining experience
              </p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <item.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hours */}
        {hours?.service_periods && hours.service_periods.length > 0 && (
          <section className="py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Opening Hours
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Join us during our service hours
                </p>
              </div>
              <div className="mx-auto mt-12 max-w-lg">
                <div className="rounded-lg bg-card shadow-sm">
                  <div className="divide-y divide-border">
                    {hours.service_periods.map((period) => (
                      <div key={period.id} className="flex items-center justify-between px-6 py-4">
                        <span className="font-medium text-foreground">{period.weekday_display}</span>
                        <span className="text-muted-foreground">
                          {period.opens_at} - {period.closes_at}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Location */}
        {restaurant?.location && (
          <section className="bg-card py-16 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid gap-12 lg:grid-cols-2">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    Visit Us
                  </h2>
                  <div className="mt-6 space-y-4">
                    <p className="text-lg text-muted-foreground">
                      {restaurant.location.address_line1}
                      {restaurant.location.address_line2 && (
                        <>, {restaurant.location.address_line2}</>
                      )}
                      <br />
                      {restaurant.location.city}, {restaurant.location.region}{" "}
                      {restaurant.location.postal_code}
                      <br />
                      {restaurant.location.country}
                    </p>
                    {restaurant.phone && (
                      <p>
                        <a
                          href={`tel:${restaurant.phone}`}
                          className="text-lg text-foreground hover:underline"
                        >
                          {restaurant.phone}
                        </a>
                      </p>
                    )}
                    {restaurant.email && (
                      <p>
                        <a
                          href={`mailto:${restaurant.email}`}
                          className="text-lg text-foreground hover:underline"
                        >
                          {restaurant.email}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
                <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                  {restaurant.location.google_maps_embed_url ? (
                    <iframe
                      src={restaurant.location.google_maps_embed_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Restaurant Location"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <span className="text-muted-foreground">Map Placeholder</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
