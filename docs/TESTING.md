# Testing Guide

Comprehensive testing documentation for the Restaurant Management Platform.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Integration Testing](#integration-testing)
5. [Writing Good Tests](#writing-good-tests)
6. [Test Data Management](#test-data-management)
7. [CI/CD Testing](#cicd-testing)
8. [Common Testing Patterns](#common-testing-patterns)
9. [Debugging Failing Tests](#debugging-failing-tests)

---

## Testing Philosophy

### Goals

1. **Confidence**: Tests should give you confidence to refactor and deploy
2. **Documentation**: Tests describe what the code should do
3. **Regression Prevention**: Tests catch breaks before they reach production
4. **Design Feedback**: Hard-to-test code often indicates design problems

### Test-Driven Development (TDD)

We follow TDD principles:

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Clean up while keeping tests green

**Critical Rule**: Never write production code without a failing test first.

### Test Pyramid

```
        /\
       /  \      E2E Tests (few)
      /----\     
     /      \    Integration Tests (some)
    /--------\   
   /          \  Unit Tests (many)
  /------------\
```

- **Unit Tests**: Fast, isolated, test single functions/classes
- **Integration Tests**: Test component interactions (APIs, DB)
- **E2E Tests**: Test complete user flows (minimal)

---

## Backend Testing

### pytest Setup and Configuration

**Configuration** (`backend/pytest.ini`):

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
addopts =
    --verbose
    --tb=short
testpaths =
    accounts
    core
    menu
    reservations
    restaurant
```

**Dependencies** (`backend/pyproject.toml`):

```toml
[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
    "pytest-django>=4.5",
    "factory-boy>=3.3",
    "freezegun>=1.4",
    "responses>=0.25",
    "coverage>=7.4",
    "django-q2>=1.6",
]
```

### Running Tests

```bash
# Run all backend tests
docker compose exec backend pytest

# Run with coverage
docker compose exec backend pytest --cov=.

# Run specific test file
docker compose exec backend pytest reservations/tests/test_models.py

# Run specific test class
docker compose exec backend pytest reservations/tests/test_api.py::TestReservationCreateEndpoint

# Run specific test method
docker compose exec backend pytest reservations/tests/test_api.py::TestReservationCreateEndpoint::test_create_reservation_success

# Run with verbose output
docker compose exec backend pytest -v

# Run with fail-fast (stop on first failure)
docker compose exec backend pytest -x

# Run with pdb debugger on failure
docker compose exec backend pytest --pdb

# Run only failed tests from last run
docker compose exec backend pytest --lf
```

### Test Structure

Tests live in `tests/` directories within each Django app:

```
backend/
├── accounts/
│   └── tests/
│       ├── __init__.py
│       └── test_auth.py
├── core/
│   └── tests/
│       ├── __init__.py
│       ├── factories.py
│       ├── test_permissions.py
├── reservations/
│   └── tests/
│       ├── __init__.py
│       ├── test_api.py
│       └── test_policy.py
```

### Factory Pattern with factory-boy

**Factories** (`backend/core/tests/factories.py`):

```python
import factory
from accounts.models import User
from reservations.models import Reservation, ReservationSettings


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for User model."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    role = User.Role.ADMIN
    is_active = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password after creation."""
        if not create:
            return
        password = extracted or "testpass123"
        self.set_password(password)
        self.save()


class ReservationFactory(factory.django.DjangoModelFactory):
    """Factory for Reservation model."""

    class Meta:
        model = Reservation

    status = Reservation.Status.CONFIRMED
    party_size = factory.Faker("random_int", min=1, max=6)
    starts_at = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=1, hours=12)
    )
    guest_name = factory.Faker("name")
    guest_email = factory.Faker("email")
    guest_phone = factory.Faker("phone_number")


class ReservationSettingsFactory(factory.django.DjangoModelFactory):
    """Factory for ReservationSettings model."""

    class Meta:
        model = ReservationSettings

    slot_interval_minutes = 30
    turn_time_minutes = 90
    max_guests_per_slot = 40
    max_party_size_online = 8
```

**Usage in Tests**:

```python
import pytest
from core.tests.factories import UserFactory, ReservationFactory

@pytest.mark.django_db
class TestReservationModel:
    def test_reservation_creation(self):
        """Should create reservation with factory defaults."""
        reservation = ReservationFactory()
        
        assert reservation.status == Reservation.Status.CONFIRMED
        assert reservation.party_size > 0
        
    def test_reservation_with_custom_values(self):
        """Should create reservation with custom values."""
        reservation = ReservationFactory(
            party_size=8,
            status=Reservation.Status.PENDING,
        )
        
        assert reservation.party_size == 8
        assert reservation.status == Reservation.Status.PENDING
```

### Model Testing Best Practices

**Example: Testing ReservationSettings (Singleton)**

```python
@pytest.mark.django_db
class TestReservationSettings:
    """Tests for ReservationSettings singleton model."""

    def test_singleton_pattern(self):
        """Should enforce single instance."""
        settings1 = ReservationSettingsFactory()
        settings2 = ReservationSettings.get_solo()
        
        assert settings1.id == settings2.id
        
    def test_default_values(self):
        """Should have sensible defaults."""
        settings = ReservationSettingsFactory()
        
        assert settings.slot_interval_minutes == 30
        assert settings.turn_time_minutes == 90
        assert settings.max_guests_per_slot == 40
```

**Example: Testing Status Transitions**

```python
@pytest.mark.django_db
class TestReservationStatusTransitions:
    """Tests for reservation status transitions."""

    def test_pending_to_confirmed(self):
        """Should allow pending to confirmed transition."""
        reservation = ReservationFactory(status=Reservation.Status.PENDING)
        
        reservation.status = Reservation.Status.CONFIRMED
        reservation.save()
        
        assert reservation.status == Reservation.Status.CONFIRMED
        
    def test_confirmed_to_cancelled(self):
        """Should allow confirmed to cancelled transition."""
        reservation = ReservationFactory(status=Reservation.Status.CONFIRMED)
        
        reservation.status = Reservation.Status.CANCELLED
        reservation.save()
        
        assert reservation.status == Reservation.Status.CANCELLED
        
    def test_cancelled_cannot_modify(self):
        """Should not allow modifying cancelled reservation."""
        reservation = ReservationFactory(status=Reservation.Status.CANCELLED)
        
        assert reservation.is_cancelled is True
```

### API Endpoint Testing

**Example: Testing Reservation API**

```python
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Return APIClient instance."""
    return APIClient()


@pytest.mark.django_db
class TestReservationCreateEndpoint:
    """Tests for the reservation create endpoint."""

    def test_create_reservation_success(
        self, api_client, restaurant, service_period, reservation_settings
    ):
        """Should create a reservation successfully."""
        url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            "starts_at": "2024-01-20T12:00:00",
            "guest": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
            },
            "notes": "Special occasion",
        }
        
        response = api_client.post(url, data, format="json")
        
        assert response.status_code == status.HTTP_201_CREATED
        assert "reservation" in response.data
        assert "token" in response.data
        
    def test_create_reservation_missing_required_fields(self, api_client):
        """Should return 400 for missing required fields."""
        url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            # Missing starts_at and guest
        }
        
        response = api_client.post(url, data, format="json")
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
```

### Using freezegun for Time-Based Tests

```python
from freezegun import freeze_time
from datetime import timedelta
from django.utils import timezone


@pytest.mark.django_db
class TestTimeBasedLogic:
    """Tests that depend on specific times."""

    def test_same_day_booking_requires_approval(self):
        """Same-day bookings within window should require approval."""
        frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
        
        with freeze_time(frozen_time):
            # Booking within same-day window (4 hours before start)
            starts_at = frozen_time + timedelta(hours=3)
            
            reservation = ReservationFactory(
                party_size=2,
                starts_at=starts_at,
            )
            
            # Check same-day condition
            assert starts_at.date() == frozen_time.date()
            
    def test_min_lead_time_constraint(self):
        """Reservations must respect minimum lead time."""
        frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
        
        with freeze_time(frozen_time):
            # Try to book within min lead time (120 minutes)
            too_soon = frozen_time + timedelta(minutes=90)
            min_start_time = frozen_time + timedelta(minutes=120)
            
            assert too_soon < min_start_time
```

### Coverage Reporting

```bash
# Generate coverage report
docker compose exec backend pytest --cov=. --cov-report=term

# Generate HTML coverage report
docker compose exec backend pytest --cov=. --cov-report=html

# Generate XML coverage report (for CI)
docker compose exec backend pytest --cov=. --cov-report=xml

# Show missing lines
docker compose exec backend pytest --cov=. --cov-report=term-missing

# Coverage for specific app
docker compose exec backend pytest --cov=reservations --cov-report=term
```

**Coverage Configuration** (add to `pyproject.toml`):

```toml
[tool.coverage.run]
source = ["."]
omit = [
    "*/tests/*",
    "*/migrations/*",
    "config/*",
    "manage.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "class .*\\bProtocol\\):",
]
```

---

## Frontend Testing

### Current State

Frontend testing infrastructure is configured but minimal tests exist. Jest and React Testing Library are the recommended tools.

### Recommended Setup

**Dependencies** (add to `frontend/package.json`):

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

**Jest Configuration** (`frontend/jest.config.js`):

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
}
```

### Component Testing Strategy

**Example: Testing a Button Component**

```typescript
// components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

**Example: Testing a Form**

```typescript
// components/ReservationForm/ReservationForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReservationForm } from './ReservationForm'

describe('ReservationForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = jest.fn()
    render(<ReservationForm onSubmit={onSubmit} />)
    
    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
      })
    })
  })

  it('shows validation errors for invalid data', async () => {
    render(<ReservationForm onSubmit={jest.fn()} />)
    
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })
})
```

### Running Frontend Tests

```bash
# Run all tests
cd frontend && npm test

# Run with coverage
cd frontend && npm test -- --coverage

# Run in CI mode (no watch)
cd frontend && npm test -- --watchAll=false

# Run specific test file
cd frontend && npm test -- Button.test.tsx
```

---

## Integration Testing

### API Integration Tests

Test complete request/response cycles:

```python
@pytest.mark.django_db
class TestReservationWorkflow:
    """Integration test for complete reservation workflow."""

    def test_full_reservation_lifecycle(self, api_client, admin_client):
        """Test creating, modifying, and cancelling a reservation."""
        # 1. Create reservation
        create_url = reverse("reservations_public:reservation-create")
        data = {
            "party_size": 4,
            "starts_at": "2024-01-20T12:00:00",
            "guest": {
                "name": "John Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
            },
        }
        
        response = api_client.post(create_url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        
        token = response.data["token"]
        reservation_id = response.data["reservation"]["id"]
        
        # 2. Get reservation details
        detail_url = reverse("reservations_public:reservation-detail", kwargs={"token": token})
        response = api_client.get(detail_url)
        assert response.status_code == status.HTTP_200_OK
        
        # 3. Modify reservation
        modify_url = reverse("reservations_public:reservation-modify", kwargs={"token": token})
        response = api_client.patch(modify_url, {"party_size": 6}, format="json")
        assert response.status_code == status.HTTP_200_OK
        
        # 4. Cancel reservation
        cancel_url = reverse("reservations_public:reservation-cancel", kwargs={"token": token})
        response = api_client.post(cancel_url)
        assert response.status_code == status.HTTP_200_OK
        
        # 5. Verify cancelled
        reservation = Reservation.objects.get(id=reservation_id)
        assert reservation.status == Reservation.Status.CANCELLED
```

### Database Integration

Ensure database constraints and relationships work correctly:

```python
@pytest.mark.django_db
def test_cascade_delete():
    """Test that deleting restaurant cascades to related objects."""
    restaurant = RestaurantFactory()
    service_periods = ServicePeriodFactory.create_batch(3, restaurant=restaurant)
    blog_posts = BlogPostFactory.create_batch(2, restaurant=restaurant)
    
    restaurant_id = restaurant.id
    restaurant.delete()
    
    # Verify related objects are deleted
    assert ServicePeriod.objects.filter(restaurant_id=restaurant_id).count() == 0
    assert BlogPost.objects.filter(restaurant_id=restaurant_id).count() == 0
```

---

## Writing Good Tests

### Test Naming

Use descriptive names that explain the behavior being tested:

```python
# Good
def test_create_reservation_returns_201_with_valid_data():
def test_create_reservation_returns_400_when_party_size_exceeds_max():
def test_cancelled_reservation_cannot_be_modified():

# Bad
def test_create():
def test_reservation():
def test_api():
```

### Test Structure (AAA Pattern)

```python
def test_example():
    """Arrange - Act - Assert pattern."""
    # Arrange: Set up test data
    reservation = ReservationFactory(status=Reservation.Status.PENDING)
    
    # Act: Perform the action
    reservation.approve()
    
    # Assert: Verify the result
    assert reservation.status == Reservation.Status.CONFIRMED
```

### Assertions

Use specific assertions with clear failure messages:

```python
# Good
assert response.status_code == status.HTTP_201_CREATED
assert reservation.party_size == 4
assert "token" in response.data

# With custom messages
assert reservation.is_active, f"Expected reservation {reservation.id} to be active"

# Using pytest helpers
assert response.json() == expected_data
assert len(response.data["slots"]) == 12
```

### Test Independence

Each test should be independent and not rely on other tests:

```python
@pytest.mark.django_db
class TestReservation:
    def test_create(self):
        """This test should not depend on any other test."""
        # Always create your own data
        reservation = ReservationFactory()
        assert reservation.id is not None
        
    def test_update(self):
        """Create fresh data, don't rely on test_create."""
        reservation = ReservationFactory()
        reservation.party_size = 6
        reservation.save()
        assert reservation.party_size == 6
```

### Parameterized Tests

Use `@pytest.mark.parametrize` for testing multiple scenarios:

```python
@pytest.mark.parametrize(
    "party_size,expected_status",
    [
        (1, Reservation.Status.CONFIRMED),   # Auto-confirm small parties
        (6, Reservation.Status.CONFIRMED),   # Auto-confirm medium parties
        (7, Reservation.Status.PENDING),     # Require approval for large parties
    ],
)
@pytest.mark.django_db
def test_reservation_auto_approval(party_size, expected_status):
    """Test auto-approval logic for different party sizes."""
    reservation = ReservationFactory(party_size=party_size)
    assert reservation.status == expected_status
```

---

## Test Data Management

### Fixtures vs Factories

**Fixtures** (for static data):

```python
# conftest.py
import pytest


@pytest.fixture
def admin_user():
    """Create admin user fixture."""
    return UserFactory(role=User.Role.ADMIN, password="adminpass123")


@pytest.fixture
def api_client():
    """Return APIClient instance."""
    return APIClient()


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    """Return authenticated admin client."""
    login_url = reverse("accounts_admin:login")
    login_data = {
        "email": admin_user.email,
        "password": "adminpass123",
    }
    response = api_client.post(login_url, login_data, format="json")
    access_token = response.data["access_token"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    return api_client
```

**Factories** (for dynamic data):

```python
# Use factories for test-specific data
def test_large_party(self):
    """Test with large party size."""
    reservation = ReservationFactory(party_size=12)
    assert reservation.requires_approval
```

### When to Use What

| Use Case | Solution | Example |
|----------|----------|---------|
| Shared setup across tests | Fixture | API client, authenticated user |
| Static configuration | Fixture | Default reservation settings |
| Dynamic test data | Factory | Reservations with varying party sizes |
| Complex relationships | Factory | Restaurant with menu and service periods |

### Database State

```python
@pytest.mark.django_db
class TestWithDatabase:
    """Each test gets a fresh database transaction."""
    
    def test_one(self):
        ReservationFactory()  # Creates 1 reservation
        assert Reservation.objects.count() == 1
        
    def test_two(self):
        # Database is fresh, count is 0
        assert Reservation.objects.count() == 0


@pytest.mark.django_db(transaction=True)
class TestWithTransaction:
    """For tests that need commit/rollback behavior."""
    pass
```

---

## CI/CD Testing

### GitHub Actions Workflow

The CI pipeline runs tests on every push and pull request:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend-test:
    name: Backend Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_restaurant
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          uv venv
          uv pip install -e ".[dev]"

      - name: Run tests
        env:
          DEBUG: "true"
          SECRET_KEY: test-secret-key
          POSTGRES_DB: test_restaurant
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
        run: |
          source .venv/bin/activate
          pytest --cov=. --cov-report=xml --cov-report=term -v

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml
```

### Coverage Gates

Set minimum coverage thresholds:

```bash
# Fail if coverage drops below 80%
pytest --cov=. --cov-fail-under=80

# Or in CI
pytest --cov=. --cov-report=xml --cov-fail-under=80
```

---

## Common Testing Patterns

### Testing Singletons

```python
@pytest.mark.django_db
class TestReservationSettings:
    """Tests for singleton model."""

    def test_only_one_instance_exists(self):
        """Singleton pattern enforcement."""
        settings1 = ReservationSettingsFactory()
        settings2 = ReservationSettings.get_solo()
        assert settings1.id == settings2.id

    def test_defaults_are_sensible(self):
        """Default configuration values."""
        settings = ReservationSettingsFactory()
        assert settings.slot_interval_minutes == 30
        assert settings.max_guests_per_slot > 0
```

### Testing Model Validation

```python
@pytest.mark.django_db
class TestReservationValidation:
    """Tests for reservation validation rules."""

    def test_party_size_must_be_positive(self):
        """Should reject zero or negative party size."""
        with pytest.raises(ValidationError):
            reservation = ReservationFactory(party_size=0)
            reservation.full_clean()

    def test_end_time_auto_calculated(self):
        """End time should be calculated from start time and turn time."""
        settings = ReservationSettingsFactory(turn_time_minutes=90)
        reservation = ReservationFactory(
            starts_at=timezone.make_aware(timezone.datetime(2024, 1, 15, 12, 0)),
        )
        
        expected_end = reservation.starts_at + timedelta(minutes=90)
        assert reservation.ends_at == expected_end
```

### Testing Permission Matrix

```python
@pytest.mark.parametrize(
    "role,permission_class,expected",
    [
        (User.Role.ADMIN, IsAdmin, True),
        (User.Role.ADMIN, IsManager, True),
        (User.Role.MANAGER, IsAdmin, False),
        (User.Role.MANAGER, IsManager, True),
        (User.Role.HOST, IsManager, False),
        (User.Role.HOST, IsHost, True),
    ],
)
@pytest.mark.django_db
def test_permission_matrix(role, permission_class, expected):
    """Test the complete permission matrix."""
    user = UserFactory(role=role)
    request = factory.get("/test/")
    request.user = user

    permission = permission_class()
    assert permission.has_permission(request, mock_view) is expected
```

### Testing Token Expiration

```python
@pytest.mark.django_db
class TestReservationToken:
    """Tests for reservation token expiration."""

    def test_token_has_expiry_date(self):
        """Token should have expiration date."""
        token = ReservationTokenFactory()
        assert token.expires_at is not None

    def test_token_expires_after_configured_days(self):
        """Token should expire based on settings."""
        settings = ReservationSettingsFactory(token_expiry_days=7)
        token = ReservationTokenFactory()
        
        expected_expiry = token.reservation.starts_at + timedelta(days=7)
        # Allow small time difference due to factory creation
        assert abs((token.expires_at - expected_expiry).total_seconds()) < 60
```

### Testing Audit Events

```python
@pytest.mark.django_db
def test_login_creates_audit_event(api_client, admin_user):
    """Successful login should create audit event."""
    url = reverse("accounts_admin:login")
    data = {
        "email": admin_user.email,
        "password": "adminpass123",
    }

    api_client.post(url, data, format="json")

    audit_event = AuditEvent.objects.filter(event="admin.login").first()
    assert audit_event is not None
    assert audit_event.actor_id == admin_user.id
```

---

## Debugging Failing Tests

### Common Issues and Solutions

**1. Database not found**
```
Failed: Database access not allowed, use the "django_db" mark
```

**Solution**: Add `@pytest.mark.django_db` decorator:
```python
@pytest.mark.django_db
def test_something():
    pass
```

**2. Test pollution from previous runs**

**Solution**: Use `--create-db` to force database recreation:
```bash
pytest --create-db
```

**3. Timezone issues**

**Solution**: Use `freeze_time` with aware datetimes:
```python
from django.utils import timezone
from freezegun import freeze_time

frozen_time = timezone.make_aware(timezone.datetime(2024, 1, 15, 10, 0))
with freeze_time(frozen_time):
    # Your test here
    pass
```

**4. Fixture not found**
```
Fixture 'api_client' not found
```

**Solution**: Ensure fixtures are defined in `conftest.py` or passed as arguments.

### Debugging Tools

```bash
# Run with verbose output
pytest -v

# Stop on first failure
pytest -x

# Run with pdb debugger on failure
pytest --pdb

# Run only last failed tests
pytest --lf

# Run with full traceback
pytest --tb=long

# Show local variables in traceback
pytest --tb=long --showlocals
```

### Test Debugging Checklist

1. **Check test isolation**: Is the test using data from another test?
2. **Check database state**: Is the database clean at test start?
3. **Check fixtures**: Are all fixtures properly defined?
4. **Check time**: Are timezone-aware datetimes being used?
5. **Check URLs**: Are URL reversals correct?
6. **Check permissions**: Is the user properly authenticated?
7. **Check assertions**: Is the assertion checking the right thing?

### Logging in Tests

```python
import logging

# Enable logging in tests
logger = logging.getLogger(__name__)

@pytest.mark.django_db
def test_with_logging():
    """Test with debug logging."""
    logger.debug("Starting test")
    
    reservation = ReservationFactory()
    logger.debug(f"Created reservation: {reservation.id}")
    
    # Run with -s flag to see output
    assert reservation.id is not None
```

Run with:
```bash
pytest -s -v  # -s shows print/logging output
```

---

## Quick Reference

### Essential Commands

```bash
# Run all tests
docker compose exec backend pytest

# Run with coverage
docker compose exec backend pytest --cov=.

# Run specific file
docker compose exec backend pytest reservations/tests/test_api.py

# Run with fail-fast and verbose
docker compose exec backend pytest -xv

# Debug failing test
docker compose exec backend pytest --pdb --lf
```

### Essential Decorators

```python
@pytest.mark.django_db              # Database access
@pytest.mark.django_db(transaction=True)  # Transactional tests
@pytest.mark.parametrize("x,y", [(1, 2), (3, 4)])  # Multiple test cases
@pytest.mark.skip                   # Skip test
@pytest.mark.skipif(condition, reason="...")  # Conditional skip
@pytest.mark.xfail                  # Expected failure
```

### Essential Fixtures

```python
# Built-in fixtures
client          # Django test client
admin_client    # Authenticated admin user
rf              # Request factory
settings        # Django settings

# Custom fixtures (from conftest.py)
api_client      # DRF APIClient
admin_user      # Admin user factory
authenticated_admin_client  # Pre-authenticated client
```

---

## Resources

- [pytest documentation](https://docs.pytest.org/)
- [pytest-django documentation](https://pytest-django.readthedocs.io/)
- [factory-boy documentation](https://factoryboy.readthedocs.io/)
- [freezegun documentation](https://github.com/spulec/freezegun)
- [Django testing documentation](https://docs.djangoproject.com/en/5.0/topics/testing/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
