using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using blog_csharp.DTOs;
using blog_csharp.Services;

namespace blog_csharp.Controllers;

[ApiController]
public class CommentsController : ControllerBase
{
    private readonly CommentService _commentService;

    public CommentsController(CommentService commentService) => _commentService = commentService;

    [HttpGet("api/posts/{postId}/comments")]
    public async Task<IActionResult> GetByPost(string postId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _commentService.GetByPostAsync(postId, page, pageSize);
        return Ok(result);
    }

    [HttpPost("api/posts/{postId}/comments")]
    [Authorize]
    public async Task<IActionResult> Create(string postId, [FromBody] CreateCommentRequest req)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var result = await _commentService.CreateAsync(postId, req, userId);
        return result.Code == 0 ? StatusCode(201, result) : StatusCode(result.Code, result);
    }

    [HttpDelete("api/comments/{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "user";
        var result = await _commentService.DeleteAsync(id, userId, role);
        return result.Code == 0 ? Ok(result) : StatusCode(result.Code, result);
    }

    [HttpPut("api/comments/{id}/approve")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Approve(string id)
    {
        var result = await _commentService.ApproveAsync(id);
        return result.Code == 0 ? Ok(result) : NotFound(result);
    }
}
