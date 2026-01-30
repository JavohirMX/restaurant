"""
Management command to seed the database with realistic demo data.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from menu.models import MenuCategory, MenuItem, MenuItemVariant
from reservations.models import Reservation, ReservationSettings, ReservationToken
from restaurant.models import (
    BlogPost,
    GalleryImage,
    Restaurant,
    RestaurantSettings,
    ServicePeriod,
    Testimonial,
)


class Command(BaseCommand):
    help = "Seed the database with realistic demo data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        # Create admin user
        self._create_users()

        # Create restaurant and settings
        restaurant = self._create_restaurant()

        # Create service periods (opening hours)
        self._create_service_periods(restaurant)

        # Create menu
        self._create_menu()

        # Create CMS content
        self._create_gallery()
        self._create_testimonials()
        self._create_blog_posts()

        # Create reservation settings and sample reservations
        self._create_reservation_settings()
        self._create_sample_reservations()

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))

    def _create_users(self):
        self.stdout.write("  Creating users...")

        if User.objects.filter(email="admin@example.com").exists():
            self.stdout.write("    Admin user already exists, skipping...")
            return

        User.objects.create_superuser(
            email="admin@example.com",
            password="admin123",
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
        )
        self.stdout.write("    Created admin@example.com (password: admin123)")

    def _create_restaurant(self):
        self.stdout.write("  Creating restaurant...")

        if Restaurant.objects.exists():
            self.stdout.write("    Restaurant already exists, skipping...")
            return Restaurant.objects.first()

        restaurant = Restaurant.objects.create(
            name="The Golden Fork",
            tagline="Farm-to-table dining in the heart of the city",
            description=(
                "The Golden Fork offers a refined dining experience featuring "
                "locally-sourced ingredients and seasonal menus. Our passionate "
                "culinary team creates memorable dishes that celebrate the best "
                "of regional cuisine."
            ),
            phone="+1 (555) 123-4567",
            email="hello@thegoldenfork.example.com",
            location={
                "addressLine1": "123 Main Street",
                "addressLine2": "Suite 100",
                "city": "New York",
                "region": "NY",
                "postalCode": "10001",
                "country": "United States",
                "googleMapsEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.9663095919364!2d-74.00425878459418!3d40.74076794379132!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQ0JzI2LjgiTiA3NMKwMDAnMDguMyJX!5e0!3m2!1sen!2sus!4v1234567890",
                "geo": {"lat": 40.7407679, "lng": -74.0020638},
            },
            social={
                "instagram": "https://instagram.com/thegoldenfork",
                "facebook": "https://facebook.com/thegoldenfork",
                "x": "https://x.com/thegoldenfork",
            },
            branding={
                "logoFile": "logo.png",
                "primaryColorHex": "#C9A227",
                "secondaryColorHex": "#1A1A2E",
            },
        )

        RestaurantSettings.objects.create(
            restaurant=restaurant,
            timezone="America/New_York",
            staff_inbox_email="staff@thegoldenfork.example.com",
            ga4_measurement_id="",
        )

        return restaurant

    def _create_service_periods(self, restaurant):
        self.stdout.write("  Creating service periods...")

        if ServicePeriod.objects.exists():
            self.stdout.write("    Service periods already exist, skipping...")
            return

        # Lunch: Tue-Fri 11:30-14:30
        for weekday in [1, 2, 3, 4]:  # Tue-Fri
            ServicePeriod.objects.create(
                restaurant=restaurant,
                name="Lunch",
                weekday=weekday,
                opens_at="11:30",
                closes_at="14:30",
            )

        # Dinner: Tue-Sat 17:30-22:00
        for weekday in [1, 2, 3, 4, 5]:  # Tue-Sat
            ServicePeriod.objects.create(
                restaurant=restaurant,
                name="Dinner",
                weekday=weekday,
                opens_at="17:30",
                closes_at="22:00",
            )

        # Brunch: Sat-Sun 10:00-14:00
        for weekday in [5, 6]:  # Sat-Sun
            ServicePeriod.objects.create(
                restaurant=restaurant,
                name="Brunch",
                weekday=weekday,
                opens_at="10:00",
                closes_at="14:00",
            )

    def _create_menu(self):
        self.stdout.write("  Creating menu...")

        if MenuCategory.objects.exists():
            self.stdout.write("    Menu already exists, skipping...")
            return

        # Starters
        starters = MenuCategory.objects.create(name="Starters", sort_order=10)
        self._create_menu_item(
            starters,
            "Seasonal Soup",
            "Chef's daily creation using fresh, local ingredients",
            ["vegetarian"],
            [("Cup", 800), ("Bowl", 1200)],
            10,
        )
        self._create_menu_item(
            starters,
            "Burrata & Heirloom Tomatoes",
            "Creamy burrata, vine-ripened tomatoes, basil oil, aged balsamic",
            ["vegetarian", "gluten-free"],
            [("Regular", 1600)],
            20,
        )
        self._create_menu_item(
            starters,
            "Tuna Tartare",
            "Sushi-grade ahi tuna, avocado, sesame, wonton crisps",
            ["gluten-free"],
            [("Regular", 1900)],
            30,
        )

        # Mains
        mains = MenuCategory.objects.create(name="Mains", sort_order=20)
        self._create_menu_item(
            mains,
            "Pan-Seared Salmon",
            "Wild-caught salmon, lemon beurre blanc, seasonal vegetables",
            ["gluten-free"],
            [("Regular", 3200)],
            10,
        )
        self._create_menu_item(
            mains,
            "Grass-Fed Ribeye",
            "12oz prime ribeye, truffle butter, roasted potatoes",
            ["gluten-free"],
            [("12oz", 4500), ("16oz", 5500)],
            20,
        )
        self._create_menu_item(
            mains,
            "Wild Mushroom Risotto",
            "Arborio rice, forest mushrooms, parmesan, truffle oil",
            ["vegetarian", "gluten-free"],
            [("Regular", 2600)],
            30,
        )
        self._create_menu_item(
            mains,
            "Roasted Chicken",
            "Free-range half chicken, herb jus, garlic mashed potatoes",
            ["gluten-free"],
            [("Regular", 2800)],
            40,
        )

        # Desserts
        desserts = MenuCategory.objects.create(name="Desserts", sort_order=30)
        self._create_menu_item(
            desserts,
            "Chocolate Lava Cake",
            "Warm chocolate cake, molten center, vanilla bean ice cream",
            ["vegetarian"],
            [("Regular", 1400)],
            10,
        )
        self._create_menu_item(
            desserts,
            "Crème Brûlée",
            "Classic vanilla custard, caramelized sugar",
            ["vegetarian", "gluten-free"],
            [("Regular", 1200)],
            20,
        )
        self._create_menu_item(
            desserts,
            "Seasonal Fruit Tart",
            "Fresh seasonal fruits, pastry cream, butter crust",
            ["vegetarian"],
            [("Regular", 1300)],
            30,
        )

        # Drinks
        drinks = MenuCategory.objects.create(name="Beverages", sort_order=40)
        self._create_menu_item(
            drinks,
            "Espresso",
            "Double shot of our house blend",
            [],
            [("Single", 350), ("Double", 450)],
            10,
        )
        self._create_menu_item(
            drinks,
            "Fresh Juices",
            "Freshly squeezed daily",
            ["vegan", "gluten-free"],
            [("Orange", 600), ("Grapefruit", 600), ("Apple", 550)],
            20,
        )

    def _create_menu_item(self, category, name, description, tags, variants, sort_order):
        item = MenuItem.objects.create(
            category=category,
            name=name,
            description=description,
            tags=tags,
            photos=[],
            sort_order=sort_order,
        )
        for i, (variant_name, price_cents) in enumerate(variants):
            MenuItemVariant.objects.create(
                item=item,
                name=variant_name,
                price_cents=price_cents,
                sort_order=(i + 1) * 10,
            )

    def _create_gallery(self):
        self.stdout.write("  Creating gallery images...")

        if GalleryImage.objects.exists():
            self.stdout.write("    Gallery already exists, skipping...")
            return

        images = [
            ("Elegant dining room with warm lighting and exposed brick walls", 10),
            ("Chef preparing a dish in our open kitchen", 20),
            ("Fresh seasonal ingredients from local farms", 30),
            ("Our signature ribeye steak with truffle butter", 40),
            ("Cozy bar area with craft cocktails", 50),
            ("Private dining room for special occasions", 60),
        ]

        for alt_text, sort_order in images:
            GalleryImage.objects.create(
                image="gallery/placeholder.jpg",  # Placeholder path
                alt_text=alt_text,
                sort_order=sort_order,
                is_published=True,
            )

    def _create_testimonials(self):
        self.stdout.write("  Creating testimonials...")

        if Testimonial.objects.exists():
            self.stdout.write("    Testimonials already exist, skipping...")
            return

        testimonials = [
            (
                "Sarah M.",
                5,
                "Absolutely incredible dining experience! The ribeye was cooked to perfection and the service was impeccable. We'll definitely be back.",
                10,
            ),
            (
                "James & Emily",
                5,
                "We celebrated our anniversary here and couldn't have asked for a better evening. The tasting menu was a journey of flavors.",
                20,
            ),
            (
                "Michael T.",
                4,
                "Great food and atmosphere. The mushroom risotto is a must-try. Only wish they had more vegetarian options.",
                30,
            ),
            (
                "Lisa R.",
                5,
                "The brunch is phenomenal! Fresh ingredients, creative dishes, and the best mimosas in the city.",
                40,
            ),
        ]

        for name, rating, text, sort_order in testimonials:
            Testimonial.objects.create(
                name=name,
                rating=rating,
                text=text,
                sort_order=sort_order,
                is_published=True,
            )

    def _create_blog_posts(self):
        self.stdout.write("  Creating blog posts...")

        if BlogPost.objects.exists():
            self.stdout.write("    Blog posts already exist, skipping...")
            return

        # Published post
        BlogPost.objects.create(
            title="Introducing Our New Spring Menu",
            slug="introducing-spring-menu-2024",
            body_json={
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Spring has arrived, and with it comes an exciting new menu featuring the freshest seasonal ingredients from our local farm partners.",
                            }
                        ],
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Our culinary team has been working tirelessly to create dishes that celebrate the vibrant flavors of the season. From tender asparagus to sweet peas and aromatic herbs, every plate tells the story of spring.",
                            }
                        ],
                    },
                ],
            },
            body_html=(
                "<p>Spring has arrived, and with it comes an exciting new menu featuring "
                "the freshest seasonal ingredients from our local farm partners.</p>"
                "<p>Our culinary team has been working tirelessly to create dishes that "
                "celebrate the vibrant flavors of the season. From tender asparagus to "
                "sweet peas and aromatic herbs, every plate tells the story of spring.</p>"
            ),
            published_at=timezone.now() - timedelta(days=7),
            seo={
                "metaTitle": "New Spring Menu at The Golden Fork",
                "metaDescription": "Discover our new spring menu featuring fresh, seasonal ingredients from local farms.",
            },
        )

        # Draft post
        BlogPost.objects.create(
            title="Behind the Scenes: A Day in Our Kitchen",
            slug="behind-the-scenes-kitchen",
            body_json={
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Ever wondered what happens behind the scenes at The Golden Fork? Join us for an exclusive look at a typical day in our kitchen.",
                            }
                        ],
                    },
                ],
            },
            body_html=(
                "<p>Ever wondered what happens behind the scenes at The Golden Fork? "
                "Join us for an exclusive look at a typical day in our kitchen.</p>"
            ),
            published_at=None,  # Draft
            seo={},
        )

    def _create_reservation_settings(self):
        self.stdout.write("  Creating reservation settings...")

        if ReservationSettings.objects.exists():
            self.stdout.write("    Reservation settings already exist, skipping...")
            return

        ReservationSettings.objects.create(
            slot_interval_minutes=30,
            turn_time_minutes=90,
            max_guests_per_slot=40,
            max_party_size_online=8,
            min_lead_time_minutes=120,
            max_days_ahead=30,
            approval_party_size_threshold=6,
            same_day_window_hours=4,
            near_capacity_percent=85,
            require_phone=True,
            approval_windows=[],
            token_expiry_days=30,
        )

    def _create_sample_reservations(self):
        self.stdout.write("  Creating sample reservations...")

        if Reservation.objects.exists():
            self.stdout.write("    Reservations already exist, skipping...")
            return

        now = timezone.now()

        # Confirmed reservation for tomorrow
        confirmed = Reservation.objects.create(
            status=Reservation.Status.CONFIRMED,
            party_size=4,
            starts_at=now + timedelta(days=1, hours=19),
            guest_name="John Smith",
            guest_email="john.smith@example.com",
            guest_phone="+1 (555) 234-5678",
            notes="Anniversary dinner, prefer quiet table",
        )
        ReservationToken.objects.create(reservation=confirmed)

        # Pending reservation for this weekend
        pending = Reservation.objects.create(
            status=Reservation.Status.PENDING,
            party_size=8,
            starts_at=now + timedelta(days=3, hours=20),
            guest_name="Emily Johnson",
            guest_email="emily.j@example.com",
            guest_phone="+1 (555) 345-6789",
            notes="Birthday celebration for 8 people",
        )
        ReservationToken.objects.create(reservation=pending)

        # Cancelled reservation
        cancelled = Reservation.objects.create(
            status=Reservation.Status.CANCELLED,
            party_size=2,
            starts_at=now + timedelta(days=2, hours=18),
            guest_name="Robert Davis",
            guest_email="r.davis@example.com",
            guest_phone="+1 (555) 456-7890",
            notes="",
        )
        ReservationToken.objects.create(reservation=cancelled)
