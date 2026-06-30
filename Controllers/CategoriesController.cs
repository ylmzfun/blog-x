using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using blog_csharp.DTOs;
using blog_csharp.Services;

namespace blog_csharp.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly CategoryService _categoryService;

    public CategoriesController(CategoryService categoryService) => _categoryService = categoryService;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _categoryService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var result = await _categoryService.GetBySlugAsync(slug);
        return result.Code == 0 ? Ok(result) : NotFound(result);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        var result = await _categoryService.CreateAsync(req);
        return result.Code == 0 ? StatusCode(201, result) : BadRequest(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateCategoryRequest req)
    {
        var result = await _categoryService.UpdateAsync(id, req);
        return result.Code == 0 ? Ok(result) : StatusCode(result.Code, result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _categoryService.DeleteAsync(id);
        return result.Code == 0 ? Ok(result) : StatusCode(result.Code, result);
    }
}
