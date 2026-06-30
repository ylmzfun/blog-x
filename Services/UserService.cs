using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;

namespace blog_csharp.Services;

public class UserService
{
    private readonly BlogDbContext _db;

    public UserService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<UserProfile>> GetProfileAsync(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return new ApiResponse<UserProfile> { Code = 404, Message = "User not found" };

        return new ApiResponse<UserProfile>
        {
            Data = new UserProfile(user.Id, user.Username, user.Email, user.Avatar,
                user.Bio, user.Website, user.Role, user.CreatedAt)
        };
    }

    public async Task<ApiResponse<UserProfile>> UpdateProfileAsync(string userId, UpdateProfileRequest req)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return new ApiResponse<UserProfile> { Code = 404, Message = "User not found" };

        if (req.Username != null) user.Username = req.Username;
        if (req.Avatar != null) user.Avatar = req.Avatar;
        if (req.Bio != null) user.Bio = req.Bio;
        if (req.Website != null) user.Website = req.Website;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new ApiResponse<UserProfile>
        {
            Data = new UserProfile(user.Id, user.Username, user.Email, user.Avatar,
                user.Bio, user.Website, user.Role, user.CreatedAt)
        };
    }

    public async Task<ApiResponse<object>> ChangePasswordAsync(string userId, ChangePasswordRequest req)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return new ApiResponse<object> { Code = 404, Message = "User not found" };

        if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, user.PasswordHash))
            return new ApiResponse<object> { Code = 400, Message = "Old password is incorrect" };

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new ApiResponse<object> { Message = "Password changed" };
    }

    public async Task<ApiResponse<UserBrief>> GetPublicProfileAsync(string id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return new ApiResponse<UserBrief> { Code = 404, Message = "User not found" };

        return new ApiResponse<UserBrief>
        {
            Data = new UserBrief(user.Id, user.Username, user.Avatar, user.Role)
        };
    }
}
