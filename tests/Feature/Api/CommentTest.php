<?php

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;

test('can list comments for a post', function () {
    $user = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $user->id, 'status' => 'published', 'published_at' => now()]);
    Comment::factory()->count(3)->create([
        'post_id' => $post->id,
        'author_id' => $user->id,
        'status' => 'approved',
    ]);

    $response = $this->getJson("/api/posts/{$post->id}/comments");

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.total', 3);
});

test('authenticated user can post comment', function () {
    $user = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $user->id, 'status' => 'published', 'published_at' => now()]);

    $response = $this->actingAs($user, 'api')
        ->postJson("/api/posts/{$post->id}/comments", [
            'content' => 'Great post!',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.content', 'Great post!');
});

test('can reply to a comment', function () {
    $user = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $user->id, 'status' => 'published', 'published_at' => now()]);
    $parentComment = Comment::factory()->create([
        'post_id' => $post->id,
        'author_id' => $user->id,
    ]);

    $response = $this->actingAs($user, 'api')
        ->postJson("/api/posts/{$post->id}/comments", [
            'content' => 'Reply to comment',
            'parentId' => $parentComment->id,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.parentId', $parentComment->id);
});

test('user can delete own comment', function () {
    $user = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $user->id, 'status' => 'published', 'published_at' => now()]);
    $comment = Comment::factory()->create([
        'post_id' => $post->id,
        'author_id' => $user->id,
    ]);

    $response = $this->actingAs($user, 'api')
        ->deleteJson("/api/comments/{$comment->id}");

    $response->assertStatus(200);
    expect(Comment::withTrashed()->find($comment->id)->deleted_at)->not->toBeNull();
});

test('admin can approve comment', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $user = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $user->id, 'status' => 'published', 'published_at' => now()]);
    $comment = Comment::factory()->create([
        'post_id' => $post->id,
        'author_id' => $user->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($admin, 'api')
        ->putJson("/api/comments/{$comment->id}/approve");

    $response->assertStatus(200);
    expect(Comment::find($comment->id)->status)->toBe('approved');
});

test('unauthenticated user cannot post comment', function () {
    $user = User::factory()->create();
    $post = Post::factory()->create(['author_id' => $user->id, 'status' => 'published', 'published_at' => now()]);

    $response = $this->postJson("/api/posts/{$post->id}/comments", [
        'content' => 'Test',
    ]);

    $response->assertStatus(401);
});
