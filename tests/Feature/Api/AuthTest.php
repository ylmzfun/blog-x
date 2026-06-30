<?php

use App\Models\User;

test('user can register', function () {
    $response = $this->postJson('/api/auth/register', [
        'username' => 'testuser',
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.username', 'testuser')
        ->assertJsonPath('data.email', 'test@example.com');
});

test('user can login', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
        'role' => 'user',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonStructure([
            'data' => ['accessToken', 'refreshToken', 'expiresIn', 'user'],
        ]);
});

test('login fails with wrong credentials', function () {
    $response = $this->postJson('/api/auth/login', [
        'email' => 'wrong@example.com',
        'password' => 'wrongpassword',
    ]);

    $response->assertStatus(401)
        ->assertJsonPath('code', 401);
});

test('authenticated user can get profile', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'api')
        ->getJson('/api/users/me');

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.username', $user->name);
});

test('unauthenticated user cannot get profile', function () {
    $response = $this->getJson('/api/users/me');

    $response->assertStatus(401);
});

test('user can update profile', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'api')
        ->putJson('/api/users/me', [
            'username' => 'updateduser',
            'bio' => 'My bio',
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('data.username', 'updateduser');
});

test('user can change password', function () {
    $user = User::factory()->create([
        'password' => bcrypt('oldpassword'),
    ]);

    $response = $this->actingAs($user, 'api')
        ->putJson('/api/users/me/password', [
            'oldPassword' => 'oldpassword',
            'newPassword' => 'newpassword123',
        ]);

    $response->assertStatus(200);
});

test('token refresh works', function () {
    $user = User::factory()->create();
    $token = auth('api')->login($user);
    $refreshToken = \Illuminate\Support\Str::random(64);
    cache()->put("refresh_token:{$user->id}:{$refreshToken}", true, now()->addDays(7));

    $response = $this->actingAs($user, 'api')
        ->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/auth/refresh', [
            'refreshToken' => $refreshToken,
        ]);

    $response->assertStatus(200)
        ->assertJsonPath('code', 0)
        ->assertJsonPath('data.expiresIn', 7200);
});
