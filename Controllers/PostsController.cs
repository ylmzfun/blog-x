using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using blog_csharp.DTOs;
using blog_csharp.Services;

namespace blog_csharp.Controllers;

[ApiController]
[Route("api/posts")]
public class PostsController : ControllerBase
{
    private readonly PostService _postService;

    public PostsController(PostService postService) => _postService = postService;

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? categorySlug = null,
        [FromQuery] string? tagSlug = null,
        [FromQuery] string? sort = null,
        [FromQuery] bool? pinned = null)
    {
        var result = await _postService.GetListAsync(page, pageSize, categorySlug, tagSlug, null, sort, pinned);
        return Ok(result);
    }

    [HttpGet("drafts")]
    [Authorize]
    public async Task<IActionResult> GetDrafts([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var result = await _postService.GetDraftsAsync(userId, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var result = await _postService.GetBySlugAsync(slug);
        return result.Code == 0 ? Ok(result) : NotFound(result);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreatePostRequest req)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var result = await _postService.CreateAsync(req, userId);
        return result.Code == 0 ? StatusCode(201, result) : BadRequest(result);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(string id, [FromBody] UpdatePostRequest req)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "user";
        var result = await _postService.UpdateAsync(id, req, userId, role);
        return result.Code == 0 ? Ok(result) : StatusCode(result.Code, result);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "user";
        var result = await _postService.DeleteAsync(id, userId, role);
        return result.Code == 0 ? Ok(result) : StatusCode(result.Code, result);
    }

    [HttpPut("{id}/pin")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> TogglePin(string id)
    {
        var result = await _postService.TogglePinAsync(id);
        return result.Code == 0 ? Ok(result) : NotFound(result);
    }
}
