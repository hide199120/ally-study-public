CREATE TABLE user_furniture (
    user_id      BIGINT UNSIGNED NOT NULL,
    furniture_id VARCHAR(32)     NOT NULL COMMENT '家具の種類（OpenAPI の FurnitureId）',
    placed       BOOLEAN         NOT NULL COMMENT 'TRUE=部屋に出している / FALSE=バッグ（インベントリ）の中',
    offset_x     DECIMAL(4, 2)   NOT NULL DEFAULT 0 COMMENT '初期位置からの移動量（x）',
    offset_z     DECIMAL(4, 2)   NOT NULL DEFAULT 0 COMMENT '初期位置からの移動量（z）',
    updated_at   DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, furniture_id),
    CONSTRAINT fk_user_furniture_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ユーザーが持っている家具（バッグ）と配置';
