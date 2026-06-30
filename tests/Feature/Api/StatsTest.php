<?php

use App\Models\Post;
use App\Models\User;

test('admin can view stats overview', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    Post::factory()->create([
        'author_id' => $admin->id,
        'status' => 'published',
        'published_at' => now(),
    ]);

    $response = $this->actingAs($admin, 'api')
        ->getJson('/api/stats/overview');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.totalPosts', 1);
});

test('non-admin cannot view stats', function () {
    $user = User::factory()->create(['role' => 'user']);

    $response = $this->actingAs($user, 'api')
        ->getJson('/api/stats/overview');

    $response->assertStatus(403);
});

test('admin can view top posts', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    Post::factory()->create([
        'author_id' => $admin->id,
        'status' => 'published',
        'published_at' => now(),
        'view_count' => 100,
    ]);

    $response = $this->actingAs($admin, 'api')
        ->getJson('/api/stats/posts/top');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.0.viewCount', 100);
});
