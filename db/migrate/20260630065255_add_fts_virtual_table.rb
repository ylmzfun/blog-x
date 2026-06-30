class AddFtsVirtualTable < ActiveRecord::Migration[7.2]
  def up
    execute <<-SQL
      CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
        title,
        content,
        content=posts,
        content_rowid=id
      )
    SQL

    execute <<-SQL
      CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts
      WHEN new.status = 'published' AND new.deleted_at IS NULL
      BEGIN
        INSERT INTO posts_fts(rowid, title, content)
        VALUES (new.id, new.title, new.body);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content)
        VALUES ('delete', old.id, old.title, old.body);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content)
        VALUES ('delete', old.id, old.title, old.body);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER IF NOT EXISTS posts_au2 AFTER UPDATE ON posts
      WHEN new.status = 'published' AND new.deleted_at IS NULL
      BEGIN
        INSERT INTO posts_fts(rowid, title, content)
        VALUES (new.id, new.title, new.body);
      END
    SQL
  end

  def down
    execute "DROP TRIGGER IF EXISTS posts_au2"
    execute "DROP TRIGGER IF EXISTS posts_au"
    execute "DROP TRIGGER IF EXISTS posts_ad"
    execute "DROP TRIGGER IF EXISTS posts_ai"
    execute "DROP TABLE IF EXISTS posts_fts"
  end
end
