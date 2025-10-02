from playwright.sync_api import Page, expect
import time

def test_dashboard_design(page: Page):
    """
    This test verifies the new design of the Dashboard after logging in.
    It first registers a new user, then logs in.
    """
    # 1. Arrange: Go to the application's base URL and register a new user.
    page.goto("http://localhost:3000")

    # Click the "Need an account? Sign up" button
    page.get_by_role("button", name="Need an account? Sign up").click()

    # Fill out the registration form
    page.get_by_placeholder("Name").fill("Test User")
    # Use a unique email to avoid registration errors on re-runs
    unique_email = f"test-{time.time()}@example.com"
    page.get_by_placeholder("Email address").fill(unique_email)
    page.get_by_placeholder("Password").fill("password")
    page.get_by_role("button", name="Sign up").click()

    # Wait for the dashboard to load after registration/login
    expect(page.get_by_role("heading", name="Online Diary")).to_be_visible(timeout=15000)

    # Take a screenshot of the dashboard
    page.screenshot(path="dashboard-page.png")

    # Open the "add moment" modal to check its styling.
    # Use the first button found for "Add Text"
    page.get_by_role("button", name="Add Text").first.click()

    # Wait for the modal to appear
    expect(page.get_by_role("heading", name="Add Text Moment")).to_be_visible()

    # Take a screenshot of the modal
    page.screenshot(path="dashboard-modal.png")

    # Now, we will check the date modal
    # First, close the current modal
    page.get_by_role("button", name="Cancel").click()

    # Click on a date in the calendar to open the date modal
    # Using a generic text selector for a day in the calendar
    page.get_by_text("15", exact=True).first.click()

    # Wait for the date modal to appear
    expect(page.get_by_role("heading", name="Moments for")).to_be_visible()

    # Take a screenshot of the date modal to verify text visibility
    page.screenshot(path="dashboard-date-modal.png")