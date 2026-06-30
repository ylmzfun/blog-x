class RenameBodyToContentInPosts < ActiveRecord::Migration[7.2]
  def up
    rename_column :posts, :body, :content

    execute "DROP TRIGGER IF EXISTS posts_au2"
    execute "DROP TRIGGER IF EXISTS posts_au"
    execute "DROP TRIGGER IF EXISTS posts_ad"
    execute "DROP TRIGGER IF EXISTS posts_ai"

    execute <<-SQL
      CREATE TRIGGER posts_ai AFTER INSERT ON posts
      WHEN new.status = 'published' AND new.deleted_at IS NULL
      BEGIN
        INSERT INTO posts_fts(rowid, title, content)
        VALUES (new.id, new.title, new.content);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content)
        VALUES ('delete', old.id, old.title, old.content);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content)
        VALUES ('delete', old.id, old.title, old.content);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER posts_au2 AFTER UPDATE ON posts
      WHEN new.status = 'published' AND new.deleted_at IS NULL
      BEGIN
        INSERT INTO posts_fts(rowid, title, content)
        VALUES (new.id, new.title, new.content);
      END
    SQL
  end

  def down
    execute "DROP TRIGGER IF EXISTS posts_au2"
    execute "DROP TRIGGER IF EXISTS posts_au"
    execute "DROP TRIGGER IF EXISTS posts_ad"
    execute "DROP TRIGGER IF EXISTS posts_ai"

    rename_column :posts, :content, :body

    execute <<-SQL
      CREATE TRIGGER posts_ai AFTER INSERT ON posts
      WHEN new.status = 'published' AND new.deleted_at IS NULL
      BEGIN
        INSERT INTO posts_fts(rowid, title, content)
        VALUES (new.id, new.title, new.body);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content)
        VALUES ('delete', old.id, old.title, old.body);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content)
        VALUES ('delete', old.id, old.title, old.body);
      END
    SQL

    execute <<-SQL
      CREATE TRIGGER posts_au2 AFTER UPDATE ON posts
      WHEN new.status = 'published' AND new.deleted_at IS NULL
      BEGIN
        INSERT INTO posts_fts(rowid, title, content)
        VALUES (new.id, new.title, new.body);
      END
    SQL
  end
end
