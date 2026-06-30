using Microsoft.EntityFrameworkCore;
using blog_csharp.Data;
using blog_csharp.DTOs;
using blog_csharp.Models;

namespace blog_csharp.Services;

public class CategoryService
{
    private readonly BlogDbContext _db;

    public CategoryService(BlogDbContext db) => _db = db;

    public async Task<ApiResponse<List<CategoryItem>>> GetAllAsync()
    {
        var categories = await _db.Categories
            .OrderBy(c => c.Name)
            .Select(c => new CategoryItem(c.Id, c.Name, c.Slug, c.Description, c.PostCount))
            .ToListAsync();

        return new ApiResponse<List<CategoryItem>> { Data = categories };
    }

    public async Task<ApiResponse<CategoryItem>> GetBySlugAsync(string slug)
    {
        var cat = await _db.Categories.FirstOrDefaultAsync(c => c.Slug == slug);
        if (cat == null)
            return new ApiResponse<CategoryItem> { Code = 404, Message = "Category not found" };

        return new ApiResponse<CategoryItem>
        {
            Data = new CategoryItem(cat.Id, cat.Name, cat.Slug, cat.Description, cat.PostCount)
        };
    }

    public async Task<ApiResponse<CategoryItem>> CreateAsync(CreateCategoryRequest req)
    {
        if (await _db.Categories.AnyAsync(c => c.Slug == req.Slug))
            return new ApiResponse<CategoryItem> { Code = 400, Message = "Slug already exists" };

        var cat = new Category { Name = req.Name, Slug = req.Slug, Description = req.Description };
        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();

        return new ApiResponse<CategoryItem>
        {
            Data = new CategoryItem(cat.Id, cat.Name, cat.Slug, cat.Description, cat.PostCount)
        };
    }

    public async Task<ApiResponse<CategoryItem>> UpdateAsync(string id, UpdateCategoryRequest req)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null)
            return new ApiResponse<CategoryItem> { Code = 404, Message = "Category not found" };

        if (req.Name != null) cat.Name = req.Name;
        if (req.Slug != null) cat.Slug = req.Slug;
        if (req.Description != null) cat.Description = req.Description;
        cat.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new ApiResponse<CategoryItem>
        {
            Data = new CategoryItem(cat.Id, cat.Name, cat.Slug, cat.Description, cat.PostCount)
        };
    }

    public async Task<ApiResponse<object>> DeleteAsync(string id)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null)
            return new ApiResponse<object> { Code = 404, Message = "Category not found" };

        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
        return new ApiResponse<object> { Message = "Deleted" };
    }
}
