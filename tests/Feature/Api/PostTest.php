<?php

use App\Models\Category;
use App\Models\Post;
use App\Models\Tag;
use App\Models\User;

test('can list posts', function () {
    $user = User::factory()->create(['role' => 'author']);
    $category = Category::factory()->create();
    $post = Post::factory()->create([
        'author_id' => $user->id,
        'category_id' => $category->id,
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/posts');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.total', 1);
});

test('can view post detail by slug', function () {
    $user = User::factory()->create(['role' => 'author']);
    $category = Category::factory()->create();
    $post = Post::factory()->create([
        'author_id' => $user->id,
        'category_id' => $category->id,
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson("/api/posts/{$post->slug}");

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.slug', $post->slug)
        ->assertJsonPath('data.content', $post->content);
});

test('author can create post', function () {
    $user = User::factory()->create(['role' => 'author']);
    $category = Category::factory()->create();
    $tag = Tag::factory()->create();

    $response = $this->actingAs($user, 'api')
        ->postJson('/api/posts', [
            'title' => 'Test Post',
            'content' => '# Hello World',
            'summary' => 'A test post',
            'categoryId' => $category->id,
            'tagIds' => [$tag->id],
            'status' => 'published',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.title', 'Test Post')
        ->assertJsonPath('data.status', 'published');
});

test('normal user cannot create post', function () {
    $user = User::factory()->create(['role' => 'user']);

    $response = $this->actingAs($user, 'api')
        ->postJson('/api/posts', [
            'title' => 'Test Post',
            'content' => '# Hello',
        ]);

    $response->assertStatus(403);
});

test('author can update own post', function () {
    $user = User::factory()->create(['role' => 'author']);
    $post = Post::factory()->create(['author_id' => $user->id]);

    $response = $this->actingAs($user, 'api')
        ->putJson("/api/posts/{$post->id}", [
            'title' => 'Updated Title',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.title', 'Updated Title');
});

test('user cannot update others post', function () {
    $author = User::factory()->create(['role' => 'author']);
    $otherUser = User::factory()->create(['role' => 'author']);
    $post = Post::factory()->create(['author_id' => $author->id]);

    $response = $this->actingAs($otherUser, 'api')
        ->putJson("/api/posts/{$post->id}", [
            'title' => 'Hacked',
        ]);

    $response->assertStatus(403);
});

test('author can delete own post', function () {
    $user = User::factory()->create(['role' => 'author']);
    $post = Post::factory()->create(['author_id' => $user->id]);

    $response = $this->actingAs($user, 'api')
        ->deleteJson("/api/posts/{$post->id}");

    $response->assertStatus(200);
    expect(Post::withTrashed()->find($post->id)->deleted_at)->not->toBeNull();
});

test('admin can pin post', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $post = Post::factory()->create();

    $response = $this->actingAs($admin, 'api')
        ->putJson("/api/posts/{$post->id}/pin");

    $response->assertStatus(200)
        ->assertJsonPath('data.pinned', true);
});

test('author can view drafts', function () {
    $user = User::factory()->create(['role' => 'author']);
    Post::factory()->create(['author_id' => $user->id, 'status' => 'draft']);

    $response = $this->actingAs($user, 'api')
        ->getJson('/api/posts/drafts');

    $response->assertStatus(200)
        ->assertJsonPath('data.total', 1);
});

test('can filter posts by category', function () {
    $user = User::factory()->create(['role' => 'author']);
    $category = Category::factory()->create();
    Post::factory()->create([
        'author_id' => $user->id,
        'category_id' => $category->id,
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson("/api/posts?categorySlug={$category->slug}");

    $response->assertStatus(200)
        ->assertJsonPath('data.total', 1);
});
