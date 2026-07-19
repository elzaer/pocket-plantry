# Database schema — pantry & meal planner

Consolidates every entity implied across the epics into one schema for review. Grouped by the area of the app that owns it, though several tables (`generic_items`, `products`) are shared across every epic.

Design decisions baked in throughout (recap):
- **Generic item vs product (SKU)** split — shopping/meal planning operates on generic items; barcodes resolve to products, which map many-to-one onto a generic item.
- **No pack-size normalization** — pantry stock is has/doesn't-have per generic item, not quantity-tracked.
- **Quantity fields exist but are unused today** — present in `meal_items` and `receipt_line_items` for future-proofing, not read by any current logic.
- **Household-scoped** — `generic_items`, preferences, lists, stock, meal plans, and receipts all belong to a household, since the plan is to eventually package this for other households too.

---

## Households & users

### `households`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| created_at | timestamp | |

### `users`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households.id | |
| email | text, unique | |
| display_name | text | |
| created_at | timestamp | |

Note: if using PocketBase, its built-in auth collection likely covers most of this directly — treat this table as the conceptual shape, not necessarily a table you create by hand.

---

## Product resolution (Epic 0)

### `generic_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households.id | |
| name | text | e.g. "Peanut butter" |
| category | text | |
| default_unit | text, nullable | future-proofing, unused today |
| is_recurring | boolean, default false | marks it as part of the Epic 2 requirements list |
| created_at | timestamp | |

### `products`
| Field | Type | Notes |
|---|---|---|
| barcode | text PK | UPC/EAN/GTIN |
| name | text | |
| brand | text, nullable | |
| pack_size | decimal, nullable | not used for stock logic yet, kept for future quantity work |
| pack_unit | text, nullable | |
| generic_item_id | uuid FK → generic_items.id, nullable | null until mapped during manual entry |
| image_url | text, nullable | |
| source | enum: `open_food_facts`, `fallback_api`, `manual` | where the data came from |
| contributed_to_off | boolean, default false | whether this entry was pushed back to Open Food Facts |
| created_at | timestamp | |

### `household_preference`
| Field | Type | Notes |
|---|---|---|
| household_id | uuid FK → households.id | composite PK part 1 |
| generic_item_id | uuid FK → generic_items.id | composite PK part 2 |
| preferred_barcode | text FK → products.barcode | |

---

## Shopping & pantry (Epics 3, 4)

### `shopping_list_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households.id | |
| generic_item_id | uuid FK → generic_items.id | |
| source | enum: `meal_plan`, `requirement`, `manual` | why it's on the list |
| status | enum: `open`, `fulfilled`, default `open` | |
| fulfilled_by_barcode | text FK → products.barcode, nullable | which SKU actually satisfied it |
| fulfilled_at | timestamp, nullable | |
| created_at | timestamp | |

Constraint: unique on (`household_id`, `generic_item_id`) where `status = 'open'` — prevents duplicate open entries for the same generic item.

### `pantry_stock`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households.id | |
| generic_item_id | uuid FK → generic_items.id | |
| barcode | text FK → products.barcode, nullable | which SKU is actually in the pantry, if known |
| has_stock | boolean | the has/doesn't-have flag driving list generation |
| source | enum: `scan`, `receipt_import`, `manual_adjustment` | |
| last_updated | timestamp | |

---

## Meal planning (Epic 1)

### `meal_plans`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households.id | |
| week_start_date | date | |
| created_at | timestamp | |

### `meals`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| meal_plan_id | uuid FK → meal_plans.id | |
| name | text | |
| meal_date | date, nullable | |
| created_at | timestamp | |

### `meal_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| meal_id | uuid FK → meals.id | |
| generic_item_id | uuid FK → generic_items.id | |
| quantity | decimal, nullable | future-proofing, unused today — defaults to "1 of item" in logic |
| unit | text, nullable | |

---

## Receipt import (Epic 5)

### `receipts`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| household_id | uuid FK → households.id | |
| store_name | text, nullable | |
| purchased_at | timestamp | |
| raw_import_source | enum: `photo_ocr`, `csv`, `manual_paste` | |
| created_at | timestamp | |

### `receipt_line_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| receipt_id | uuid FK → receipts.id | |
| raw_text | text | original line as parsed, kept for audit/debug |
| matched_barcode | text FK → products.barcode, nullable | |
| matched_generic_item_id | uuid FK → generic_items.id, nullable | |
| quantity | decimal, default 1 | |
| price | decimal, nullable | |
| resolution_status | enum: `matched`, `needs_mapping`, `skipped` | drives the put-away prompt flow |

---

## Open items to confirm on review

- Whether `users` should be modeled explicitly or left entirely to PocketBase's built-in auth collection.
- Whether `pantry_stock` needs a unique constraint on (`household_id`, `generic_item_id`) — logically it should, since "has/doesn't have" is a single current-state flag, not a log.
- Confirm `is_recurring` on `generic_items` is the right shape for the requirements list, versus a separate join table — flag stays simplest until Epic 2's receipt-based stretch goal needs more (e.g. a cadence value), at which point it may be worth splitting out.
