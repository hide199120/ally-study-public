CREATE TABLE study_goals (
    user_id    BIGINT UNSIGNED   NOT NULL,
    id         VARCHAR(36)       NOT NULL COMMENT 'フロントで作るID',
    position   SMALLINT UNSIGNED NOT NULL COMMENT '表示順',
    kind       VARCHAR(16)       NOT NULL COMMENT 'certification（資格） / task（タスク）',
    title      VARCHAR(50)       NOT NULL,
    due_date   DATE              NULL     COMMENT '期限・試験日（なくてもよい）',
    done       BOOLEAN           NOT NULL DEFAULT FALSE,
    updated_at DATETIME(6)       NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, id),
    CONSTRAINT fk_study_goals_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='資格やタスクの目標';
