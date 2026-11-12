-- 退会したユーザーのイベントから user_id を外すとき（UPDATE ... WHERE user_id = ?）に、全件を読まずに済むようにする
CREATE INDEX idx_analytics_events_user_id ON analytics_events (user_id);
