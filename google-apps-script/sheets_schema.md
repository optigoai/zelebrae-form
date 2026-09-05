# Google Sheets Schema & Data Model — Zelebrae Pastries

This document outlines the spreadsheet schema used by the Zelebrae Pastries Celebration Point Booking System.

Google Sheets serves as the database and lightweight admin panel. The business team can view, manage, and modify bookings, slots, pricing, and amenities directly in Google Sheets without modifying frontend code.

---

## 1. Sheet: `Bookings`
Stores all customer celebration reservations.

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `booking_id` | String | `ZB-20260912-482` | Unique celebration reference identifier |
| B | `created_at` | ISO Timestamp | `2026-09-05T12:45:00+05:30` | Reservation submission timestamp |
| C | `location` | String | `ashokapuram` | Identifier of celebration point |
| D | `date` | Date / String | `2026-09-12` | Celebration date (YYYY-MM-DD in Asia/Kolkata) |
| E | `time_slot` | String | `04:00 PM` | Reserved 1-hour time slot |
| F | `name` | String | `Naveen Kumar` | Customer full name |
| G | `customer_location`| String | `Ashokapuram, Kozhikode` | Customer residential area / city |
| H | `whatsapp` | String | `+91 9847123456` | WhatsApp contact number for coordination |
| I | `email` | String | `naveen@example.com` | Optional email address |
| J | `occasion` | String | `Birthday` | Celebration type (Birthday, Anniversary, etc.) |
| K | `guests` | Integer | `6` | Number of attending guests (up to 15) |
| L | `additional_requirements` | String | `Vanilla sponge with fresh strawberries` | Flavour, theme, or dietary notes |
| M | `amenities` | String | `basic_decorations, music_mic, ac_hall` | Comma-separated list of selected amenities |
| N | `combo` | String | `birthday_delight` | Selected celebration party combo |
| O | `status` | String | `confirmed` | Lifecycle status: `pending`, `confirmed`, `cancelled`, `completed` |

### Booking Status Lifecycle:
- **`confirmed`**: Active reservation. Slot is marked unavailable on the frontend.
- **`pending`**: Reserved awaiting manual payment or cake confirmation. Slot is marked unavailable.
- **`cancelled`**: Booking was cancelled. The slot immediately becomes available for other customers to reserve.
- **`completed`**: Celebration concluded. Historical record preserved.

> **CRITICAL RULE**: Do not delete rows when a booking is cancelled. Simply change column `status` to `cancelled`. This preserves the historical audit trail while freeing the slot automatically.

---

## 2. Sheet: `Locations`
Configures celebration points.

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `id` | String | `pantheerankavu` | Primary location key (`pantheerankavu`, `karaparamba`, `ashokapuram`, `arakkinar`) |
| B | `name` | String | `Pantheerankavu Celebration Point` | Display name |
| C | `description` | String | `Spacious private celebration lounge & bakery space` | Tagline |
| D | `address` | String | `Near Pantheerankavu Bypass Junction, Kozhikode` | Full physical address |
| E | `capacity` | Integer | `15` | Maximum guest capacity |
| F | `active` | Boolean | `TRUE` | Enable/disable location |

### Preconfigured Locations:
1. `pantheerankavu`: Pantheerankavu Celebration Point
2. `karaparamba`: Karaparamba Celebration Point
3. `ashokapuram`: Ashokapuram Celebration Point
4. `arakkinar`: Arakkinar Celebration Point

---

## 3. Sheet: `Slots`
Defines available standard time slots for each celebration point.

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `location_id` | String | `ALL` | Location ID or `ALL` |
| B | `day` | String | `ALL` | `ALL` or specific day e.g. `SATURDAY` |
| C | `time` | String | `09:30 AM` | Slot start time (`09:30 AM` to `08:30 PM`) |
| D | `active` | Boolean | `TRUE` | Set `FALSE` to disable slot temporarily |

> **Display Rule**: If a slot is booked or unavailable, it is displayed to the user on the frontend with a strikethrough and a **Booked** tag, remaining visible but disabled / non-clickable.

---

## 4. Sheet: `Combos`
Party celebration packs and accessory combos.

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `id` | String | `birthday_delight` | Unique combo ID |
| B | `name` | String | `Birthday Deluxe Combo` | Combo title |
| C | `description` | String | `Sash, 3x Poppers, Cake Candle, Props` | Inclusions summary |
| D | `price` | Number | `599` | Price in INR |
| E | `active` | Boolean | `TRUE` | Enable/disable combo |

---

## 5. Sheet: `Amenities`
Celebration facilities and add-on services.

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `id` | String | `welcome_drinks` | Amenity ID |
| B | `name` | String | `Zelebrae Welcome Drinks` | Display name |
| C | `description` | String | `Chilled signature mocktails for all guests` | Description |
| D | `price` | Number | `349` | Price (0 for complimentary) |
| E | `is_complimentary` | Boolean | `FALSE` | Complimentary indicator |
| F | `active` | Boolean | `TRUE` | Active status |

---

## 6. Sheet: `Settings`
Global business settings and parameters.

| Column | Name | Type | Sample Value | Description |
|---|---|---|---|---|
| A | `key` | String | `whatsapp_number` | Configuration key |
| B | `value` | String / Number | `919072333600` | Business WhatsApp number |
