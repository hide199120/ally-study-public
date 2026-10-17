CREATE TABLE analytics_events (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_name   VARCHAR(32)     NOT NULL COMMENT 'page_view / sound_play など（OpenAPI の AnalyticsEventName）',
    user_id      BIGINT UNSIGNED NULL     COMMENT 'ログイン中のユーザーID（未ログインなら NULL）。別の DB なので外部キーは張らない',
    anonymous_id CHAR(36)        NOT NULL COMMENT 'ブラウザごとの匿名ID（再訪や人数を数えるため）',
    device       VARCHAR(16)     NOT NULL COMMENT 'pc / mobile',
    properties   JSON            NULL     COMMENT 'イベントごとの追加情報（流入元・再生秒数など）',
    created_at   DATETIME(6)     NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_analytics_events_created_at (created_at),
    KEY idx_analytics_events_name_created_at (event_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='アクセス解析のイベント（1行1イベント）';
