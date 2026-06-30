using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;

namespace blog_csharp.Services;

public class StatsService
{
    private readonly BlogDbContext _db;

    public StatsService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<StatsOverview>> GetOverviewAsync()
    {
        var today = DateTime.UtcNow.Date;

        var overview = new StatsOverview(
            await _db.Posts.CountAsync(p => p.DeletedAt == null && p.Status == "published"),
            await _db.Comments.CountAsync(c => c.DeletedAt == null),
            await _db.Users.CountAsync(),
            // Simple approximations — real PV/UV would need a tracking table
            await _db.Posts.Where(p => p.PublishedAt >= today).SumAsync(p => p.ViewCount),
            await _db.Users.CountAsync(u => u.CreatedAt >= today)
        );

        return new ApiResponse<StatsOverview> { Data = overview };
    }

    public async Task<ApiResponse<List<TopPost>>> GetTopPostsAsync()
    {
        var posts = await _db.Posts
            .Where(p => p.DeletedAt == null && p.Status == "published")
            .OrderByDescending(p => p.ViewCount)
            .Take(10)
            .Select(p => new TopPost(p.Id, p.Title, p.Slug, p.ViewCount))
            .ToListAsync();

        return new ApiResponse<List<TopPost>> { Data = posts };
    }
}
