<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:255|unique:users,name',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $user = User::create([
            'name' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
        ]);

        return ApiResponse::success([
            'id' => $user->id,
            'username' => $user->name,
            'email' => $user->email,
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $credentials = $request->only('email', 'password');

        if (! $token = auth('api')->attempt($credentials)) {
            return ApiResponse::error('Invalid credentials', 401);
        }

        $user = auth('api')->user();

        $refreshToken = Str::random(64);

        cache()->put("refresh_token:{$user->id}:{$refreshToken}", true, now()->addDays(7));

        return ApiResponse::success([
            'accessToken' => $token,
            'refreshToken' => $refreshToken,
            'expiresIn' => 7200,
            'user' => [
                'id' => $user->id,
                'username' => $user->name,
                'avatar' => $user->avatar,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            JWTAuth::parseToken()->invalidate();

            $user = auth('api')->user();
            if ($user) {
                cache()->forget("refresh_token:{$user->id}");
            }

            return ApiResponse::success(null, 'Logged out successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to logout', 500);
        }
    }

    public function refresh(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'refreshToken' => 'required|string',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $user = auth('api')->user();

        if (! $user || ! cache()->has("refresh_token:{$user->id}:{$request->refreshToken}")) {
            return ApiResponse::error('Invalid refresh token', 401);
        }

        try {
            $newToken = auth('api')->refresh();

            return ApiResponse::success([
                'accessToken' => $newToken,
                'expiresIn' => 7200,
            ]);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to refresh token', 401);
        }
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return ApiResponse::success(null, 'Password reset link sent');
        }

        return ApiResponse::error('Failed to send reset link', 400);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return ApiResponse::error($validator->errors()->first(), 400);
        }

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->password = Hash::make($password);
                $user->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ApiResponse::success(null, 'Password reset successfully');
        }

        return ApiResponse::error('Failed to reset password', 400);
    }
}
