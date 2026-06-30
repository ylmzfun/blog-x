<?php

use App\Models\Category;
use App\Models\Post;
use App\Models\User;

test('can list categories', function () {
    Category::factory()->count(3)->create();

    $response = $this->getJson('/api/categories');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonCount(3, 'data');
});

test('can view category by slug', function () {
    $category = Category::factory()->create();

    $response = $this->getJson("/api/categories/{$category->slug}");

    $response->assertStatus(200)
        ->assertJsonPath('data.slug', $category->slug)
        ->assertJsonPath('data.postCount', 0);
});

test('category includes post count', function () {
    $user = User::factory()->create(['role' => 'author']);
    $category = Category::factory()->create();
    Post::factory()->count(3)->create([
        'author_id' => $user->id,
        'category_id' => $category->id,
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->getJson('/api/categories');

    $response->assertStatus(200)
        ->assertJsonPath('data.0.postCount', 3);
});

test('admin can create category', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/categories', [
            'name' => 'Tech',
            'slug' => 'tech',
            'description' => 'Tech articles',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Tech');
});

test('non-admin cannot create category', function () {
    $user = User::factory()->create(['role' => 'user']);

    $response = $this->actingAs($user, 'api')
        ->postJson('/api/categories', [
            'name' => 'Tech',
            'slug' => 'tech',
        ]);

    $response->assertStatus(403);
});

test('admin can update category', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::factory()->create();

    $response = $this->actingAs($admin, 'api')
        ->putJson("/api/categories/{$category->id}", [
            'name' => 'Updated',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Updated');
});

test('admin can delete category', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::factory()->create();

    $response = $this->actingAs($admin, 'api')
        ->deleteJson("/api/categories/{$category->id}");

    $response->assertStatus(200);
    expect(Category::find($category->id))->toBeNull();
});
