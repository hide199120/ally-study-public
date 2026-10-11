CREATE TABLE study_settings (
    user_id             BIGINT UNSIGNED   NOT NULL,
    weekly_goal_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 600 COMMENT '1週間（月〜日）の目標の勉強時間（分）',
    updated_at          DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    CONSTRAINT fk_study_settings_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='学習の設定';
