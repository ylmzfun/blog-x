<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        return ApiResponse::success([
            'id' => $user->id,
            'username' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'bio' => $user->bio,
            'website' => $user->website,
            'role' => $user->role,
            'createdAt' => $user->created_at->toIso8601String(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'username' => 'sometimes|string|max:255|unique:users,name,'.$user->id,
            'avatar' => 'sometimes|string|nullable',
            'bio' => 'sometimes|string|nullable',
            'website' => 'sometimes|url|nullable',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $user->update([
            'name' => $request->get('username', $user->name),
            'avatar' => $request->get('avatar', $user->avatar),
            'bio' => $request->get('bio', $user->bio),
            'website' => $request->get('website', $user->website),
        ]);

        return ApiResponse::success([
            'id' => $user->id,
            'username' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar,
            'bio' => $user->bio,
            'website' => $user->website,
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = auth('api')->user();

        $validator = Validator::make($request->all(), [
            'oldPassword' => 'required|string',
            'newPassword' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        if (! Hash::check($request->oldPassword, $user->password)) {
            return ApiResponse::error('Old password is incorrect', 400);
        }

        $user->password = Hash::make($request->newPassword);
        $user->save();

        return ApiResponse::success(null, 'Password updated successfully');
    }

    public function show(int $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return ApiResponse::error('User not found', 404);
        }

        return ApiResponse::success([
            'id' => $user->id,
            'username' => $user->name,
            'avatar' => $user->avatar,
            'bio' => $user->bio,
            'website' => $user->website,
            'createdAt' => $user->created_at->toIso8601String(),
        ]);
    }
}
