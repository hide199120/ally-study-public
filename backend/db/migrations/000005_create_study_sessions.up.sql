CREATE TABLE study_sessions (
    id         BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    user_id    BIGINT UNSIGNED   NOT NULL,
    study_date DATE              NOT NULL COMMENT 'ユーザーのタイムゾーンでの日付',
    minutes    SMALLINT UNSIGNED NOT NULL COMMENT '勉強した時間（分）',
    mode       VARCHAR(16)       NOT NULL COMMENT 'pomodoro / stopwatch',
    created_at DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_study_sessions_user_date (user_id, study_date),
    CONSTRAINT fk_study_sessions_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='タイマーで勉強した記録（1回ごと）';
