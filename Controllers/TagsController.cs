using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using blog_csharp.DTOs;
using blog_csharp.Services;

namespace blog_csharp.Controllers;

[ApiController]
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private readonly TagService _tagService;

    public TagsController(TagService tagService) => _tagService = tagService;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _tagService.GetAllAsync();
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "admin,author")]
    public async Task<IActionResult> Create([FromBody] CreateTagRequest req)
    {
        var result = await _tagService.CreateAsync(req);
        return result.Code == 0 ? StatusCode(201, result) : BadRequest(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(string id)
    {
        var result = await _tagService.DeleteAsync(id);
        return result.Code == 0 ? Ok(result) : StatusCode(result.Code, result);
    }
}
