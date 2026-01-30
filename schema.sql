DROP TABLE IF EXISTS feedback;

CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,           -- e.g., 'twitter', 'email'
    content TEXT,          -- The actual message
    sentiment TEXT,        -- 'positive', 'negative', 'neutral' (Added by AI)
    category TEXT,         -- 'bug', 'feature', 'billing' (Added by AI)
    is_security_risk BOOLEAN DEFAULT 0, -- (Added by AI)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);