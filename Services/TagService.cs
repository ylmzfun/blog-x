using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;
using blog_csharp.Models;

namespace blog_csharp.Services;

public class TagService
{
    private readonly BlogDbContext _db;

    public TagService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<List<TagItem>>> GetAllAsync()
    {
        var tags = await _db.Tags
            .OrderByDescending(t => t.PostCount)
            .Select(t => new TagItem(t.Id, t.Name, t.Slug, t.PostCount))
            .ToListAsync();

        return new ApiResponse<List<TagItem>> { Data = tags };
    }

    public async Task<ApiResponse<TagItem>> CreateAsync(CreateTagRequest req)
    {
        if (await _db.Tags.AnyAsync(t => t.Slug == req.Slug))
            return new ApiResponse<TagItem> { Code = 400, Message = "Slug already exists" };

        var tag = new Tag { Name = req.Name, Slug = req.Slug };
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync();

        return new ApiResponse<TagItem>
        {
            Data = new TagItem(tag.Id, tag.Name, tag.Slug, tag.PostCount)
        };
    }

    public async Task<ApiResponse<object>> DeleteAsync(string id)
    {
        var tag = await _db.Tags.FindAsync(id);
        if (tag == null)
            return new ApiResponse<object> { Code = 404, Message = "Tag not found" };

        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync();
        return new ApiResponse<object> { Message = "Deleted" };
    }
}
