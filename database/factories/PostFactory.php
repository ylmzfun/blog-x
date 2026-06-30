<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PostFactory extends Factory
{
    protected $model = Post::class;

    public function definition(): array
    {
        $title = fake()->sentence();

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::random(6),
            'content' => fake()->paragraphs(3, true),
            'summary' => fake()->sentence(),
            'cover' => null,
            'author_id' => User::factory(),
            'category_id' => null,
            'status' => 'draft',
            'pinned' => false,
            'view_count' => 0,
            'comment_count' => 0,
        ];
    }
}
