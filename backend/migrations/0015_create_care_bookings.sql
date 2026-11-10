CREATE TABLE care_bookings (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    service_category TEXT NOT NULL,
    selected_services TEXT NOT NULL, 
    preferred_date TEXT NOT NULL,
    drop_off_method TEXT,
    payment_method TEXT,
    serial_number TEXT,
    notes TEXT,
    status TEXT DEFAULT 'SCHEDULED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);