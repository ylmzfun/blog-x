<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::withCount('posts')->get();

        $data = $categories->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'description' => $c->description,
            'postCount' => (int) $c->posts_count,
        ]);

        return ApiResponse::success($data);
    }

    public function show(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)->withCount('posts')->first();

        if (! $category) {
            return ApiResponse::error('Category not found', 404);
        }

        return ApiResponse::success([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'postCount' => (int) $category->posts_count,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:categories',
            'slug' => 'required|string|max:255|unique:categories',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $category = Category::create([
            'name' => $request->name,
            'slug' => $request->slug,
            'description' => $request->description,
        ]);

        return ApiResponse::success([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'postCount' => 0,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $category = Category::find($id);

        if (! $category) {
            return ApiResponse::error('Category not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255|unique:categories,name,'.$id,
            'slug' => 'sometimes|string|max:255|unique:categories,slug,'.$id,
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $category->update($request->only(['name', 'slug', 'description']));

        return ApiResponse::success([
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'postCount' => $category->post_count,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = auth('api')->user();

        if (! $user->isAdmin()) {
            return ApiResponse::error('Forbidden', 403);
        }

        $category = Category::find($id);

        if (! $category) {
            return ApiResponse::error('Category not found', 404);
        }

        $category->delete();

        return ApiResponse::success(null, 'Category deleted');
    }
}
