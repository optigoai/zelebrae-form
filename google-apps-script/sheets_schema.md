# Google Sheets Schema & Data Model — Zelebrae Pastries

This document outlines the spreadsheet schema and synchronization architecture used by the Zelebrae Pastries Celebration Point Booking System.

---

## 🔒 Complete Branch Isolation (4 Separate Spreadsheet Links)

To ensure that **branches cannot see each other's booking data**, each of the 4 celebration locations has its **own separate Google Spreadsheet file** in Google Drive:

1. **`Zelebrae Bookings - Pantheerankavu`** (Dedicated Link 1)
2. **`Zelebrae Bookings - Karaparamba`** (Dedicated Link 2)
3. **`Zelebrae Bookings - Ashokapuram`** (Dedicated Link 3)
4. **`Zelebrae Bookings - Arakkinar`** (Dedicated Link 4)

### Privacy & Access Control:
- Give **Pantheerankavu staff** access **only** to the Pantheerankavu Google Sheet link.
- Give **Karaparamba staff** access **only** to the Karaparamba Google Sheet link.
- Give **Ashokapuram staff** access **only** to the Ashokapuram Google Sheet link.
- Give **Arakkinar staff** access **only** to the Arakkinar Google Sheet link.
- **Result**: No branch team can see, search, or edit any other branch's customer data or reservations.

---

## 👑 Centralized Master Sheet ("All Bookings" for Owner & Management)

At the same time, the **Central Master Spreadsheet** automatically receives a simultaneous real-time copy of **every single booking across all 4 locations**:
- Tab name: **`All Bookings`**
- Provides the business owner, management, and central kitchen with a complete 360° live overview of every reservation across all branches in one unified table!

---

## 1. Sheet Structure (Identical across all 4 Branch Spreadsheets & "All Bookings")

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `booking_id` | String | `ZB-20260912-482` | Unique celebration reference identifier |
| B | `created_at` | ISO Timestamp | `2026-09-05T12:45:00+05:30` | Reservation submission timestamp |
| C | `location` | String | `Pantheerankavu` | Formatted celebration point name |
| D | `date` | Date / String | `2026-09-12` | Celebration date (YYYY-MM-DD in Asia/Kolkata) |
| E | `time_slot` | String | `'04:30 PM` | Reserved 1-hour time slot (prefixed with `'` to preserve exact time string) |
| F | `name` | String | `Naveen Kumar` | Customer full name |
| G | `customer_location`| String | `Pantheerankavu, Kozhikode` | Customer residential area / city |
| H | `whatsapp` | String | `'+91 9847123456` | WhatsApp contact number (prefixed with `'` to prevent `#ERROR!` formula parse) |
| I | `email` | String | `naveen@example.com` | Optional email address |
| J | `occasion` | String | `Birthday` | Celebration type (Birthday, Anniversary, etc.) |
| K | `guests` | Integer | `6` | Number of attending guests (up to 15) |
| L | `additional_requirements` | String | `Vanilla sponge with fresh strawberries` | Flavour, theme, or dietary notes |
| M | `amenities` | String | `Basic Decorations, Background Music & Mic, AC Hall` | Comma-separated list of selected amenities |
| N | `combo` | String | `Birthday Combo (DC1 - ₹350)` | Selected celebration party combo and package variant |
| O | `status` | String | `confirmed` | Lifecycle status: `pending`, `confirmed`, `cancelled`, `completed` |

### Booking Status Lifecycle:
- **`confirmed`**: Active reservation. Slot is marked unavailable on the frontend.
- **`pending`**: Reserved awaiting manual payment or cake confirmation. Slot is marked unavailable.
- **`cancelled`**: Booking was cancelled. The slot immediately becomes available for other customers to reserve.
- **`completed`**: Celebration concluded. Historical record preserved.

> **CRITICAL RULE**: Do not delete rows when a booking is cancelled. Simply change column `status` to `cancelled`. This preserves the historical audit trail while freeing the slot automatically.

---

## 2. Configuration & Master Sheets (in Master Spreadsheet)

The master administration spreadsheet contains:
- **`All Bookings`**: Live unified feed of all bookings across all 4 locations.
- **`Branch Links`**: Auto-generated table containing all 4 branch names, location codes, spreadsheet links, and IDs.
- **`Locations`**: Physical address, capacity, and active status for each location.
- **`Slots`**: Active operating hours (`09:30 AM` to `08:30 PM`).
- **`Combos`**: Celebration party accessory packages (`Birthday`, `Mom to Be`, `Bride to Be`, `Anniversary`, `Groom to be`).
- **`Amenities`**: Included celebration amenities (`Basic Decorations`, `Background Music & Mic`, `AC Hall`, `Welcome Drink`).
- **`Settings`**: Global WhatsApp coordination number, guest limits, and booking window.
