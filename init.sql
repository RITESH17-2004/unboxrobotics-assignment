-- Initialize the telemetry database schema
-- This table stores time-series speed data recorded every 1 second interval
CREATE TABLE IF NOT EXISTS speed_data (
    id SERIAL PRIMARY KEY,                                      -- Unique identifier
    speed REAL NOT NULL,                                        -- The recorded speed value
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Timestamp of recording
);
