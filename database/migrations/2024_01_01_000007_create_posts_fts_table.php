<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE VIRTUAL TABLE posts_fts USING fts5(title, content, content=posts, content_rowid=id)');

        DB::statement('
            CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts BEGIN
                INSERT INTO posts_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
            END
        ');

        DB::statement('
            CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
                UPDATE posts_fts SET title = new.title, content = new.content WHERE rowid = new.id;
            END
        ');

        DB::statement('
            CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
                DELETE FROM posts_fts WHERE rowid = old.id;
            END
        ');
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS posts_fts_insert');
        DB::statement('DROP TRIGGER IF EXISTS posts_fts_update');
        DB::statement('DROP TRIGGER IF EXISTS posts_fts_delete');
        DB::statement('DROP TABLE IF EXISTS posts_fts');
    }
};
