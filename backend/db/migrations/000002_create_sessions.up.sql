CREATE TABLE sessions (
    id         CHAR(64)        NOT NULL COMMENT 'セッショントークンのSHA-256ハッシュ（トークン自体は保存しない）',
    user_id    BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME(6)     NOT NULL,
    created_at DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_sessions_user_id (user_id),
    KEY idx_sessions_expires_at (expires_at),
    CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ログインセッション';
