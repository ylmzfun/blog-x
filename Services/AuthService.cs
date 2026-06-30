using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using blog_csharp.Data;
using blog_csharp.DTOs;
using blog_csharp.Models;

namespace blog_csharp.Services;

public class AuthService
{
    private readonly BlogDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(BlogDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<ApiResponse<UserBrief>> RegisterAsync(RegisterRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return new ApiResponse<UserBrief> { Code = 400, Message = "Email already exists" };

        if (await _db.Users.AnyAsync(u => u.Username == req.Username))
            return new ApiResponse<UserBrief> { Code = 400, Message = "Username already exists" };

        var user = new User
        {
            Username = req.Username,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = await _db.Users.AnyAsync() ? "user" : "admin"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new ApiResponse<UserBrief>
        {
            Data = new UserBrief(user.Id, user.Username, user.Avatar, user.Role)
        };
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return new ApiResponse<AuthResponse> { Code = 401, Message = "Invalid email or password" };

        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
            _config.GetValue<int>("Jwt:RefreshTokenExpirationDays", 7));
        await _db.SaveChangesAsync();

        return new ApiResponse<AuthResponse>
        {
            Data = new AuthResponse(
                accessToken,
                refreshToken,
                _config.GetValue<int>("Jwt:AccessTokenExpirationMinutes", 120) * 60,
                new UserBrief(user.Id, user.Username, user.Avatar, user.Role)
            )
        };
    }

    public async Task<ApiResponse<TokenResponse>> RefreshAsync(RefreshRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.RefreshToken == req.RefreshToken && u.RefreshTokenExpiry > DateTime.UtcNow);

        if (user == null)
            return new ApiResponse<TokenResponse> { Code = 401, Message = "Invalid or expired refresh token" };

        var accessToken = GenerateAccessToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
            _config.GetValue<int>("Jwt:RefreshTokenExpirationDays", 7));
        await _db.SaveChangesAsync();

        return new ApiResponse<TokenResponse>
        {
            Data = new TokenResponse(accessToken,
                _config.GetValue<int>("Jwt:AccessTokenExpirationMinutes", 120) * 60)
        };
    }

    public async Task LogoutAsync(string userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await _db.SaveChangesAsync();
        }
    }

    public string GenerateAccessToken(User user)
    {
        var secret = _config["Jwt:Secret"]!;
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var expirationMinutes = _config.GetValue<int>("Jwt:AccessTokenExpirationMinutes", 120);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer, audience, claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
