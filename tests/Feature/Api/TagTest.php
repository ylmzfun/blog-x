<?php

use App\Models\Tag;
use App\Models\User;

test('can list tags', function () {
    Tag::factory()->count(3)->create();

    $response = $this->getJson('/api/tags');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonCount(3, 'data');
});

test('author can create tag', function () {
    $user = User::factory()->create(['role' => 'author']);

    $response = $this->actingAs($user, 'api')
        ->postJson('/api/tags', [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.name', 'Laravel');
});

test('normal user cannot create tag', function () {
    $user = User::factory()->create(['role' => 'user']);

    $response = $this->actingAs($user, 'api')
        ->postJson('/api/tags', [
            'name' => 'Laravel',
            'slug' => 'laravel',
        ]);

    $response->assertStatus(403);
});

test('admin can delete tag', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $tag = Tag::factory()->create();

    $response = $this->actingAs($admin, 'api')
        ->deleteJson("/api/tags/{$tag->id}");

    $response->assertStatus(200);
    expect(Tag::find($tag->id))->toBeNull();
});
