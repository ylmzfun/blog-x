<?php

use App\Models\Post;
use App\Models\User;

test('can search posts', function () {
    $user = User::factory()->create(['role' => 'author']);
    $post = Post::factory()->create([
        'author_id' => $user->id,
        'status' => 'published',
        'published_at' => now(),
        'title' => 'Laravel Tips',
        'content' => 'Laravel is a great PHP framework for web development',
    ]);

    $response = $this->getJson('/api/search?q=Laravel');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.total', 1);
});

test('search requires query', function () {
    $response = $this->getJson('/api/search');

    $response->assertStatus(400);
});

test('search suggestions work', function () {
    $user = User::factory()->create(['role' => 'author']);
    Post::factory()->create([
        'author_id' => $user->id,
        'status' => 'published',
        'published_at' => now(),
        'title' => 'Learning PHP',
        'content' => 'Content about PHP',
    ]);

    $response = $this->getJson('/api/search/suggestions?q=PHP');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.suggestions.0', 'Learning PHP');
});

test('suggestions return empty for short query', function () {
    $response = $this->getJson('/api/search/suggestions?q=a');

    $response->assertStatus(200)
        ->assertJsonPath('data.suggestions', []);
});
