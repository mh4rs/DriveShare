# DriveShare

DriveShare is a peer-to-peer car rental platform designed to connect car owners with individuals seeking short-term car rentals. It provides a seamless experience for booking and managing car rentals securely and efficiently.

## Features

- **User Registration and Authentication**:
  - Users can register on DriveShare using email and password authentication.
  - Security question system with 3 questions for account recovery.

- **Car Listing and Management**:
  - Car owners can list their vehicles for short-term rental, providing details such as car model, year, mileage, availability calendar, pick up location and rental pricing.
  - Owners have the ability to manage their car listings, including updating availability and price.
  - System prevents the same car from being rented more than once at the same time.

- **Search and Booking**:
  - Renters can search for available cars based on location, date, and other preferences.
  - Booking system allows renters to reserve a car for a specific period.

- **Messaging and Communication**:
  - Built-in messaging system to facilitate communication between car owners and renters.
  - Notifications for booking requests, confirmations, and important updates via email or in-app messages.

- **Payment**:
  - Simulated payment system (payment button with amount displayed).
  - Clicking the payment button updates balance and sends notifications to both owner and renter.

## Installation & Setup

### Prerequisites

Make sure you have the following installed:
- Node.js
- SQLite3

### Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/mh4rs/DriveShare.git
   cd DriveShare
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase Admin SDK:
   - Place the `serviceAccountKey.json` file inside the `secret/` directory.

4. Start the server:
   ```bash
   node src/server.js
   ```