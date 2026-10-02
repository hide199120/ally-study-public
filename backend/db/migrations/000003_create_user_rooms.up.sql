CREATE TABLE user_rooms (
    user_id    BIGINT UNSIGNED NOT NULL,
    avatar     VARCHAR(16)     NOT NULL DEFAULT 'girl'   COMMENT '部屋にいる住人（girl / boy）',
    wallpaper  VARCHAR(32)     NOT NULL DEFAULT 'meadow' COMMENT '壁紙の種類',
    created_at DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_rooms_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ユーザーごとの部屋の設定';
