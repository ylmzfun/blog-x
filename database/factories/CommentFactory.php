<?php

namespace Database\Factories;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommentFactory extends Factory
{
    protected $model = Comment::class;

    public function definition(): array
    {
        return [
            'post_id' => Post::factory(),
            'author_id' => User::factory(),
            'content' => fake()->paragraph(),
            'parent_id' => null,
            'status' => 'approved',
        ];
    }
}
